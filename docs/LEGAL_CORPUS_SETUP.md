# Legal Corpus Ingestion Guide

**Purpose:** Index Indian legal documents (statutes, case law) into Vectorize so the RAG can cite them in answers.

**Status:** Required for production, optional for MVP testing

---

## Quick Start

### 1. Get Cloudflare Credentials

You need:
- **Account ID** — Your Cloudflare account ID (9-character hex, find at [dash.cloudflare.com](https://dash.cloudflare.com))
- **API Token** — Create at Cloudflare dashboard under "My Profile → API Tokens"
  - Click "Create Token"
  - Choose custom token with permissions:
    - ✅ Cloudflare Workers Scripts (Edit)
    - ✅ Vectorize Index (Edit)
    - ✅ Workers AI (Run)

### 2. Prepare Legal Documents

Place PDF files in `legal-data/` directory:

```
legal-data/
├── THE INDIAN PENAL CODE.pdf
├── The Bharatiya Nyaya Sanhita, 2023.pdf
├── THE INDIAN CONTRACT ACT, 1872.pdf
├── THE INFORMATION TECHNOLOGY ACT, 2000.pdf
├── THE COMPANIES ACT, 2013.pdf
└── he Bharatiya Sakshya Adhiniyam, 2023.pdf
```

**Note:** File names become the `file_name` metadata in Vectorize, so use clear, readable names.

### 3. Run Ingestion

```bash
# Set environment variables
export CLOUDFLARE_ACCOUNT_ID="<your-account-id>"
export CLOUDFLARE_API_TOKEN="<your-api-token>"

# Run ingestion script
cd apps/api/scripts
python3 ingest_legal_corpus.py
```

Expected output:
```
PatraSaar Legal Corpus Ingestion Engine
Vectorize index : patrasaar-legal-corpus
D1 database     : 7f445d8e-a005-466d-ae39-ddbc0a50bee9
──────────────────────────────────────────────────

[Processing] THE INDIAN PENAL CODE.pdf...
  → Lazy loading pages...
  → Awaiting 8 concurrent batches... Done.
  ✓ THE INDIAN PENAL CODE.pdf — 342 chunks → Vectorize + D1

[Processing] The Bharatiya Nyaya Sanhita, 2023.pdf...
  → Lazy loading pages...
  → Awaiting 5 concurrent batches... Done.
  ✓ The Bharatiya Nyaya Sanhita, 2023.pdf — 291 chunks → Vectorize + D1

...

──────────────────────────────────────────────────
Ingestion complete.
```

### 4. Verify Ingestion

Query the RAG to confirm corpus is accessible:

```bash
# Run a test query via the API
curl -X POST http://localhost:8787/inquiries/stream \
  -H "Content-Type: application/json" \
  -H "Cookie: patrasaar_token=<your-token>" \
  -d '{"documentIds":[],"question":"What is the punishment for murder under IPC?"}'
```

Expected: LLM response citing the legal corpus (e.g., "Under the Bharatiya Nyaya Sanhita 2023, Section 101...").

---

## What The Script Does

### Detailed Process

```
For each PDF in legal-data/:
  1. Load pages lazily (preserves memory for large documents)
  2. Split each page into 1000-character chunks (200 char overlap)
  3. Batch chunks into groups of 25
  4. For each batch (concurrent, max 5 at a time):
     a. Embed chunks via Cloudflare Workers AI (bge-base-en-v1.5)
     b. Insert vectors into LEGAL_INDEX (Vectorize)
     c. Insert full text into D1 chunks table
  5. Report chunk count for the document
```

### Storage

**Vectorize (LEGAL_INDEX):**
```
id: "the_indian_penal_code_pdf:42"
values: [768-dim float32 embedding]
metadata: {
  source: "legal-corpus",
  file_name: "THE INDIAN PENAL CODE.pdf",
  text: "First 500 characters of chunk..."
}
```

**D1 (chunks table):**
```sql
INSERT INTO chunks (
  id, document_id, chunk_index, page_number, 
  text, token_count, vector_id, source
) VALUES (
  'a1b2c3d4...', 
  'the_indian_penal_code_pdf', 
  42, 
  0, 
  'Full chunk text here... (not truncated)',
  250,
  'the_indian_penal_code_pdf:42',
  'legal-corpus'
)
```

---

## Troubleshooting

### "Error: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set"

**Cause:** Environment variables not exported

**Fix:**
```bash
export CLOUDFLARE_ACCOUNT_ID="9a3d4f2c1b..."
export CLOUDFLARE_API_TOKEN="c4d8e2f1a9..."
echo $CLOUDFLARE_ACCOUNT_ID  # Verify it's set
python3 ingest_legal_corpus.py
```

### "AI API failed: [error details]"

**Cause:** Invalid credentials or rate limiting

**Fix:**
- Verify token has "Workers AI (Run)" permission
- Wait 5 minutes and retry (rate limit)
- Check account ID format (should be ~9 characters)

### "Vectorize API failed: invalid index name"

**Cause:** Index name mismatch

**Fix:** Verify in `wrangler.toml`:
```toml
[[vectorize]]
binding = "LEGAL_INDEX"
index_name = "patrasaar-legal-corpus"  # ← Must match script
```

### "D1 API failed: database not found"

**Cause:** Database ID incorrect

**Fix:** Check in `wrangler.toml`:
```toml
[[d1_databases]]
database_name = "patrasaar-db"
database_id = "7f445d8e-a005-466d-ae39-ddbc0a50bee9"
```

Must match `D1_DATABASE_ID` in the Python script (or hardcoded default).

### Ingestion Hangs / Timeout

**Cause:** Rate limiting from Cloudflare

**Fix:** Reduce concurrency in `ingest_legal_corpus.py`:
```python
CONCURRENCY_LIMIT = 3  # Was 5, reduce to 3
BATCH_SIZE = 10       # Was 25, reduce to 10
```

Then retry.

### "No relevant context found" After Ingestion

**Cause:** Queries not matching corpus content (or corpus not actually inserted)

**Verify:**
```bash
# Check D1 has chunks
wrangler d1 execute patrasaar-db \
  --command "SELECT COUNT(*) as chunk_count FROM chunks WHERE source='legal-corpus'"

# Check Vectorize has vectors
curl "https://api.cloudflare.com/client/v4/accounts/{id}/vectorize/v2/indexes/patrasaar-legal-corpus/describe" \
  -H "Authorization: Bearer {token}"
```

Should show:
- D1: hundreds of chunks
- Vectorize: stats on vector count

---

## Legal Document Sources

### Free, Public Domain

| Source | URL | Content | License |
|--------|-----|---------|---------|
| **Legislative.gov.in** | legislative.gov.in | All Indian Acts (IPC, BNS, IT Act, etc.) | Public Domain |
| **IndianKanoon** | indiankanoon.org | SC + HC judgements | CC-BY-SA |
| **Supreme Court of India** | sci.gov.in | SC judgement archive | Public Domain |
| **Delhi High Court** | delhihighcourt.gov.in | HC judgements | Public Domain |
| **Devgan IPC** | devgan.in/indian_penal_code | Clean IPC text | Personal use |

### How to Extract Text from PDFs

Most PDFs are already text-based. Extract with:

```bash
# Option 1: Using pdftotext (Linux/Mac)
pdftotext "THE INDIAN PENAL CODE.pdf" output.txt

# Option 2: Using Python
python3 << 'EOF'
from PyPDF2 import PdfReader
with open('THE INDIAN PENAL CODE.pdf', 'rb') as f:
    reader = PdfReader(f)
    for page in reader.pages:
        print(page.extract_text())
EOF
```

### Structured Format (Optional)

For better citation tracking, you can prepare statutes as JSON:

```json
{
  "name": "Indian Penal Code 1860",
  "source": "legislative.gov.in",
  "sections": [
    {
      "number": "302",
      "title": "Punishment for murder",
      "text": "Whoever commits murder shall be punished with death, or imprisonment for life... (full text)"
    },
    {
      "number": "303",
      "title": "Punishment for murder when act abets his own execution",
      "text": "..."
    }
  ]
}
```

Then ingest with a separate script that parses JSON and preserves section metadata.

---

## Performance & Costs

### Time Estimates

| Document | Size | Chunks | Time |
|----------|------|--------|------|
| IPC (1860) | ~5 MB | 342 | 45 sec |
| BNS (2023) | ~3 MB | 291 | 30 sec |
| Contract Act (1872) | ~2 MB | 180 | 20 sec |
| Total (6 acts) | ~20 MB | ~1500 | ~3 min |

### Cost (Cloudflare Free Tier)

- **Vectorize:** 10M vectors/month free = ✅ Covers ~7000 documents
- **Workers AI:** 10k API calls/month free = ✅ Covers ~67 documents at avg 150 chunks/doc
- **D1:** 1 GB storage free = ✅ Covers ~5000 documents

**Current ingestion:** ~1500 chunks = ~$0 (free tier)

---

## Updating the Corpus

### Adding New Documents

Simply add new PDFs to `legal-data/` and re-run the script:

```bash
# Add a new PDF
cp "~/downloads/NEW_LAW.pdf" legal-data/

# Re-ingest (will skip already-indexed documents)
python3 ingest_legal_corpus.py
```

**Note:** The script uses `INSERT OR IGNORE` on vector_id, so duplicate chunks are automatically skipped. Safe to re-run.

### Removing Outdated Documents

To remove a document from the corpus:

```bash
# Delete from D1
wrangler d1 execute patrasaar-db \
  --command "DELETE FROM chunks WHERE source='legal-corpus' AND document_id='filename_pdf'"

# Delete from Vectorize
# (Vectorize UI: delete index and recreate)
```

### Versioning

Keep old corpuses by maintaining separate Vectorize indexes:

```toml
[[vectorize]]
binding = "LEGAL_INDEX_V1"
index_name = "patrasaar-legal-corpus-v1"

[[vectorize]]
binding = "LEGAL_INDEX_V2"
index_name = "patrasaar-legal-corpus-v2"
```

Then switch code to query the new index on deployment.

---

## Next Steps

1. **Verify local ingestion works** (test queries return legal text)
2. **Deploy API to staging** (`make deploy-api-staging`)
3. **Ingest to staging** (repeat steps above with staging credentials)
4. **Test RAG in staging UI**
5. **Deploy to production** (`make deploy-api-prod`)
6. **Ingest to production** (final ingestion with production credentials)

---

## Monitoring

### Check Corpus Health

```bash
# Count chunks by source
wrangler d1 execute patrasaar-db \
  --command "SELECT source, COUNT(*) FROM chunks GROUP BY source"

# Expected output:
# user-doc        | 0
# legal-corpus    | 1432

# Sample a chunk
wrangler d1 execute patrasaar-db \
  --command "SELECT text FROM chunks WHERE source='legal-corpus' LIMIT 1"
```

### Query Analytics

Track which legal sections are most cited:

```sql
SELECT 
  citations,
  COUNT(*) as times_cited
FROM inquiries
WHERE citations IS NOT NULL
GROUP BY citations
ORDER BY times_cited DESC
LIMIT 10
```

---

## FAQ

**Q: Can I ingest case law (judgements) instead of statutes?**  
A: Yes, the script works with any text. Judgements in plain text are ideal.

**Q: How often should I update the corpus?**  
A: New acts annually (post-monsoon session), high-volume judgements monthly. Use git tags to version.

**Q: What's the maximum corpus size?**  
A: Vectorize free tier: 10M vectors (~67k documents at 150 chunks each). Paid tier scales to billions.

**Q: Can I search by section number or act name?**  
A: Not yet. Future: structured metadata in Vectorize (act, section, year) for filtered retrieval.

**Q: What about Hindi/regional languages?**  
A: bge-base-en-v1.5 is English-only. Multilingual embedding models coming in v2.

