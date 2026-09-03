#!/usr/bin/env python3
import os
import sys
import glob
import json
import asyncio
import aiohttp
import re
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Configuration from environment
ACCOUNT_ID = os.environ.get('CLOUDFLARE_ACCOUNT_ID')
API_TOKEN = os.environ.get('CLOUDFLARE_API_TOKEN')
INDEX_NAME = 'patrasaar-legal-corpus'
MODEL_ID = '@cf/baai/bge-base-en-v1.5'

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
BATCH_SIZE = 25
CONCURRENCY_LIMIT = 5  # Max concurrent requests to Cloudflare to avoid rate limiting

if not ACCOUNT_ID or not API_TOKEN:
    print('Error: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set.')
    sys.exit(1)

async def get_embeddings(session, texts):
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{MODEL_ID}"
    headers = {
        'Authorization': f'Bearer {API_TOKEN}',
        'Content-Type': 'application/json'
    }
    async with session.post(url, headers=headers, json={'text': texts}) as response:
        data = await response.json()
        if not data.get('success'):
            raise Exception(f"AI API failed: {json.dumps(data.get('errors'))}")
        return data['result']['data']

async def insert_vectors(session, file_id, filename, offset, texts, vectors):
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes/{INDEX_NAME}/insert"
    headers = {
        'Authorization': f'Bearer {API_TOKEN}',
        'Content-Type': 'application/x-ndjson'
    }
    
    ndjson_lines = []
    for i, text in enumerate(texts):
        record = {
            'id': f"{file_id}:{offset + i}",
            'values': vectors[i],
            'metadata': {
                'source': 'legal-corpus',
                'file_name': filename,
                'text': text[:500]
            }
        }
        ndjson_lines.append(json.dumps(record))
        
    ndjson_data = '\n'.join(ndjson_lines)
    async with session.post(url, headers=headers, data=ndjson_data) as response:
        data = await response.json()
        if not data.get('success'):
            raise Exception(f"Vectorize API failed: {json.dumps(data.get('errors'))}")

async def process_batch(session, file_id, filename, offset, batch, semaphore):
    async with semaphore:
        try:
            embeddings = await get_embeddings(session, batch)
            await insert_vectors(session, file_id, filename, offset, batch, embeddings)
            return True
        except Exception as e:
            print(f"\n  ⚠ FAILED batch at offset {offset}: {str(e)}")
            if '10000' in str(e) or 'Authentication error' in str(e):
                print("Critical Auth Error detected. Aborting completely.")
                os._exit(1)
            return False

async def process_file(session, filepath, filename, semaphore):
    print(f"\n[Processing] {filename}...")
    
    file_id = re.sub(r'[^a-zA-Z0-9]', '_', filename).lower()
    global_chunk_offset = 0
    
    loader = PyMuPDFLoader(filepath)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,
        is_separator_regex=False,
    )
    
    print(f"  → Initiating lazy load for memory efficiency...")
    
    page_chunks = []
    tasks = []
    
    try:
        # Load pages lazily to limit RAM usage
        for page_doc in loader.lazy_load():
            splits = text_splitter.split_documents([page_doc])
            
            for split in splits:
                text = split.page_content.strip()
                if len(text) > 50:
                    page_chunks.append(text)
            
            # Flush batch
            while len(page_chunks) >= BATCH_SIZE:
                batch = page_chunks[:BATCH_SIZE]
                page_chunks = page_chunks[BATCH_SIZE:]
                
                # Create background task for batch
                task = asyncio.create_task(
                    process_batch(session, file_id, filename, global_chunk_offset, batch, semaphore)
                )
                tasks.append(task)
                global_chunk_offset += len(batch)
                        
        # Flush remainder
        if page_chunks:
            for i in range(0, len(page_chunks), BATCH_SIZE):
                batch = page_chunks[i:i + BATCH_SIZE]
                task = asyncio.create_task(
                    process_batch(session, file_id, filename, global_chunk_offset, batch, semaphore)
                )
                tasks.append(task)
                global_chunk_offset += len(batch)

        if tasks:
            print(f"  → Awaiting {len(tasks)} concurrent batches for {filename}... ", end='', flush=True)
            await asyncio.gather(*tasks)
            print("Done.")

    except Exception as e:
        print(f"  ⚠ Failed to completely process document {filename}: {e}")

    print(f"  ✓ {filename} — {global_chunk_offset} total chunks indexed.")

async def async_main():
    data_dir = '../../legal-data'
    if '--data-dir' in sys.argv:
        idx = sys.argv.index('--data-dir')
        if idx + 1 < len(sys.argv):
            data_dir = sys.argv[idx + 1]
            
    print("\nPatraSaar Legal Corpus Ingestion Engine (Python Asyncio / aiohttp)")
    print(f"Target Index: {INDEX_NAME}")
    print("─" * 50)
    
    pdf_files = glob.glob(os.path.join(data_dir, '*.pdf'))
    if not pdf_files:
        print(f'No PDF files found in {data_dir}.')
        return
        
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
    
    async with aiohttp.ClientSession() as session:
        for filepath in pdf_files:
            filename = os.path.basename(filepath)
            await process_file(session, filepath, filename, semaphore)
            
    print('\n' + '─' * 50)
    print('Ingestion complete.\n')

def main():
    asyncio.run(async_main())

if __name__ == '__main__':
    main()
