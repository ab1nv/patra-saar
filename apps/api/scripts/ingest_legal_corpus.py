#!/usr/bin/env python3
import os
import sys
import glob
import json
import uuid
import asyncio
import aiohttp
import re
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Configuration from environment (validated in main, not at import time)
ACCOUNT_ID = os.environ.get('CLOUDFLARE_ACCOUNT_ID')
API_TOKEN = os.environ.get('CLOUDFLARE_API_TOKEN')
D1_DATABASE_ID = os.environ.get('D1_DATABASE_ID', '7f445d8e-a005-466d-ae39-ddbc0a50bee9')
VECTORIZE_INDEX_NAME = 'patrasaar-legal-corpus'
MODEL_ID = '@cf/baai/bge-base-en-v1.5'

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
BATCH_SIZE = 25
CONCURRENCY_LIMIT = 5  # Max concurrent requests to Cloudflare to avoid rate limiting


async def get_embeddings(session: aiohttp.ClientSession, texts: list[str]) -> list[list[float]]:
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{MODEL_ID}"
    headers = {
        'Authorization': f'Bearer {API_TOKEN}',
        'Content-Type': 'application/json',
    }
    async with session.post(url, headers=headers, json={'text': texts}) as response:
        data = await response.json()
        if not data.get('success'):
            raise Exception(f"AI API failed: {json.dumps(data.get('errors'))}")
        return data['result']['data']


async def insert_vectorize(
    session: aiohttp.ClientSession,
    file_id: str,
    filename: str,
    offset: int,
    texts: list[str],
    vectors: list[list[float]],
) -> None:
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/vectorize/v2/indexes/{VECTORIZE_INDEX_NAME}/insert"
    headers = {
        'Authorization': f'Bearer {API_TOKEN}',
        'Content-Type': 'application/x-ndjson',
    }

    ndjson_lines = []
    for i, text in enumerate(texts):
        record = {
            'id': f"{file_id}:{offset + i}",
            'values': vectors[i],
            'metadata': {
                'source': 'legal-corpus',
                'file_name': filename,
                'text': text[:500],  # Vectorize metadata preview only — full text in D1
            },
        }
        ndjson_lines.append(json.dumps(record))

    async with session.post(url, headers=headers, data='\n'.join(ndjson_lines)) as response:
        data = await response.json()
        if not data.get('success'):
            raise Exception(f"Vectorize API failed: {json.dumps(data.get('errors'))}")


async def insert_d1_chunks(
    session: aiohttp.ClientSession,
    file_id: str,
    offset: int,
    texts: list[str],
) -> None:
    """Insert full chunk text into D1 so buildContext can fetch it during RAG."""
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{D1_DATABASE_ID}/query"
    headers = {
        'Authorization': f'Bearer {API_TOKEN}',
        'Content-Type': 'application/json',
    }

    # D1 REST API accepts an array of {sql, params} for batched execution
    statements = []
    for i, text in enumerate(texts):
        chunk_index = offset + i
        statements.append({
            'sql': (
                'INSERT OR IGNORE INTO chunks '
                '(id, document_id, chunk_index, page_number, text, token_count, vector_id, source) '
                'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ),
            'params': [
                uuid.uuid4().hex,
                file_id,
                chunk_index,
                0,             # page_number: not tracked per-chunk in batch mode
                text,          # full text — not truncated
                len(text) // 4,  # rough token estimate
                f"{file_id}:{chunk_index}",
                'legal-corpus',
            ],
        })

    async with session.post(url, headers=headers, json=statements) as response:
        data = await response.json()
        # D1 batch returns an array of results; check each for errors
        if isinstance(data, list):
            errors = [r for r in data if not r.get('success')]
            if errors:
                raise Exception(f"D1 batch had errors: {json.dumps(errors)}")
        elif not data.get('success'):
            raise Exception(f"D1 API failed: {json.dumps(data.get('errors'))}")


async def process_batch(
    session: aiohttp.ClientSession,
    file_id: str,
    filename: str,
    offset: int,
    batch: list[str],
    semaphore: asyncio.Semaphore,
) -> bool:
    async with semaphore:
        try:
            embeddings = await get_embeddings(session, batch)
            # Write to both Vectorize (vectors) and D1 (full text) in parallel
            await asyncio.gather(
                insert_vectorize(session, file_id, filename, offset, batch, embeddings),
                insert_d1_chunks(session, file_id, offset, batch),
            )
            return True
        except Exception as e:
            print(f"\n  ⚠ FAILED batch at offset {offset}: {str(e)}")
            if '10000' in str(e) or 'Authentication error' in str(e):
                print("Critical Auth Error detected. Aborting completely.")
                os._exit(1)
            return False


async def process_file(
    session: aiohttp.ClientSession,
    filepath: str,
    filename: str,
    semaphore: asyncio.Semaphore,
) -> None:
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

    print(f"  → Lazy loading pages...")

    page_chunks: list[str] = []
    tasks: list[asyncio.Task] = []

    try:
        for page_doc in loader.lazy_load():
            splits = text_splitter.split_documents([page_doc])
            for split in splits:
                text = split.page_content.strip()
                if len(text) > 50:
                    page_chunks.append(text)

            while len(page_chunks) >= BATCH_SIZE:
                batch = page_chunks[:BATCH_SIZE]
                page_chunks = page_chunks[BATCH_SIZE:]
                task = asyncio.create_task(
                    process_batch(session, file_id, filename, global_chunk_offset, batch, semaphore)
                )
                tasks.append(task)
                global_chunk_offset += len(batch)

        if page_chunks:
            for i in range(0, len(page_chunks), BATCH_SIZE):
                batch = page_chunks[i:i + BATCH_SIZE]
                task = asyncio.create_task(
                    process_batch(session, file_id, filename, global_chunk_offset, batch, semaphore)
                )
                tasks.append(task)
                global_chunk_offset += len(batch)

        if tasks:
            print(f"  → Awaiting {len(tasks)} concurrent batches... ", end='', flush=True)
            results = await asyncio.gather(*tasks)
            failed = results.count(False)
            if failed:
                print(f"Done ({failed} batches failed).")
            else:
                print("Done.")

    except Exception as e:
        print(f"  ⚠ Failed to completely process {filename}: {e}")

    print(f"  ✓ {filename} — {global_chunk_offset} chunks → Vectorize + D1")


async def async_main() -> None:
    if not ACCOUNT_ID or not API_TOKEN:
        print('Error: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set.')
        sys.exit(1)

    data_dir = '../../legal-data'
    if '--data-dir' in sys.argv:
        idx = sys.argv.index('--data-dir')
        if idx + 1 < len(sys.argv):
            data_dir = sys.argv[idx + 1]

    print("\nPatraSaar Legal Corpus Ingestion Engine")
    print(f"Vectorize index : {VECTORIZE_INDEX_NAME}")
    print(f"D1 database     : {D1_DATABASE_ID}")
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


def main() -> None:
    asyncio.run(async_main())


if __name__ == '__main__':
    main()
