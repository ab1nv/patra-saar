# API Reference

**Base URL (Development):** `http://localhost:8787`  
**Base URL (Production):** `https://api.patrasaar.dev`

---

## Authentication

All endpoints except `/health` require a valid JWT token in the `patrasaar_token` cookie.

```
GET /api/endpoint
Cookie: patrasaar_token=eyJhbGciOiJIUzI1NiI...
```

Token is obtained via Google OAuth:
```
GET /auth/login → Redirect to Google → /auth/callback → Sets patrasaar_token cookie
```

---

## Inquiries API

### POST /inquiries/stream

Stream a RAG-powered legal inquiry response via Server-Sent Events.

**Request:**
```bash
POST /inquiries/stream
Content-Type: application/json
Authorization: Bearer <token>

{
  "documentIds": ["doc123", "doc456"],
  "question": "What is the punishment for murder under IPC?"
}
```

**Parameters:**
- `documentIds` *(string[])* — **Required.** List of user document IDs to search within. Can be empty `[]` to search only legal corpus.
- `question` *(string)* — **Required.** The legal question. Min 1 char, max 2000 chars.

**Response:** `text/event-stream` (Server-Sent Events)

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
X-Inquiry-Id: 550e8400-e29b-41d4-a716-446655440000

data: {"delta": "Under the "}
data: {"delta": "Bharatiya "}
data: {"delta": "Nyaya Sanhita 2023"}
data: {"delta": ", Section "}
data: {"delta": "101"}
...
```

**Error Responses:**

```json
// 400: Invalid request
{
  "error": "Invalid request",
  "details": {
    "fieldErrors": {
      "documentIds": ["Expected array"],
      "question": ["String must contain at least 1 character"]
    }
  }
}

// 401: Unauthorized
{
  "error": "Unauthorized"
}

// 422: No context found
{
  "error": "No relevant context found for this question"
}

// 502: LLM request failed
{
  "error": "LLM request failed",
  "status": 503
}
```

**Headers:**
- `X-Inquiry-Id` *(string)* — Unique ID for this inquiry (saved to D1)

**Example (JavaScript):**
```javascript
const response = await fetch('http://localhost:8787/inquiries/stream', {
  method: 'POST',
  credentials: 'include', // Send cookie
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentIds: [],
    question: 'What is the punishment for murder?'
  })
})

const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  const chunk = decoder.decode(value)
  for (const line of chunk.split('\n')) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6))
      console.log(data.delta) // Append to UI
    }
  }
}
```

---

### GET /inquiries

List all past inquiries for the current user.

**Request:**
```bash
GET /inquiries
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "inquiries": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "question": "What is the punishment for murder?",
      "answer": "Under the Bharatiya Nyaya Sanhita 2023...",
      "model_used": "google/gemini-flash-1.5",
      "created_at": 1712973600
    }
  ]
}
```

**Query Parameters:**
- None (always returns last 50 inquiries)

---

### GET /inquiries/:id

Get a single inquiry with full answer and citations.

**Request:**
```bash
GET /inquiries/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "question": "What is the punishment for murder?",
  "answer": "Under the Bharatiya Nyaya Sanhita 2023, Section 101...",
  "citations": [
    "doc123:42",
    "ipc_2023:15"
  ],
  "model_used": "google/gemini-flash-1.5",
  "confidence": 0.92,
  "created_at": 1712973600
}
```

**Error Responses:**

```json
// 404: Inquiry not found or not owned by current user
{
  "error": "Inquiry not found"
}
```

---

## Documents API

### POST /documents

Upload a PDF document and ingest it into the RAG.

**Request:**
```bash
POST /documents
Content-Type: multipart/form-data
Authorization: Bearer <token>

form-data:
  file: <PDF binary>
  caseId: optional-case-id
```

**Response:** `201 Created`
```json
{
  "id": "doc123",
  "name": "contract.pdf",
  "status": "processing",
  "chunkCount": 0,
  "createdAt": 1712973600
}
```

---

### GET /documents

List all documents uploaded by the current user.

**Request:**
```bash
GET /documents
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "documents": [
    {
      "id": "doc123",
      "name": "contract.pdf",
      "status": "processed",
      "chunkCount": 15,
      "createdAt": 1712973600
    }
  ]
}
```

---

### DELETE /documents/:id

Delete a document and its chunks from the RAG.

**Request:**
```bash
DELETE /documents/doc123
Authorization: Bearer <token>
```

**Response:** `204 No Content`

---

## Cases API

### POST /cases

Create a new case folder.

**Request:**
```bash
POST /cases
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Smith vs. Corp",
  "description": "Contract dispute case"
}
```

**Response:** `201 Created`
```json
{
  "id": "case123",
  "name": "Smith vs. Corp",
  "description": "Contract dispute case",
  "createdAt": 1712973600
}
```

---

### GET /cases

List all cases for the current user.

**Response:** `200 OK`
```json
{
  "cases": [
    {
      "id": "case123",
      "name": "Smith vs. Corp",
      "description": "Contract dispute case",
      "documentCount": 3,
      "createdAt": 1712973600
    }
  ]
}
```

---

### GET /cases/:id

Get a single case with its documents.

**Response:** `200 OK`
```json
{
  "id": "case123",
  "name": "Smith vs. Corp",
  "description": "Contract dispute case",
  "documents": [
    { "id": "doc1", "name": "contract.pdf" },
    { "id": "doc2", "name": "invoice.pdf" }
  ],
  "createdAt": 1712973600
}
```

---

### PUT /cases/:id

Update a case.

**Request:**
```bash
PUT /cases/case123
Content-Type: application/json

{
  "name": "Smith vs. Corp Ltd.",
  "description": "Updated description"
}
```

**Response:** `200 OK`

---

### DELETE /cases/:id

Delete a case (documents remain but folder is removed).

**Response:** `204 No Content`

---

## Auth API

### GET /auth/login

Initiate Google OAuth login flow.

**Request:**
```bash
GET /auth/login?next=/inquiries
```

**Response:** `302 Found`
```
Location: https://accounts.google.com/o/oauth2/v2/auth?client_id=...&state=...
```

Sets two cookies:
- `oauth_state` — CSRF token (expires 10 min)
- `oauth_next` — Post-login redirect URL (expires 10 min)

---

### GET /auth/callback

OAuth callback handler (Google redirects here after user approves).

**Request:**
```bash
GET /auth/callback?code=...&state=...
```

**Response:** `302 Found`
```
Location: /dashboard (or whatever was in oauth_next)
Set-Cookie: patrasaar_token=eyJhbGciOiJIUzI1NiI...
```

---

### POST /auth/google

Exchange OAuth code for JWT token (internal use by callback).

**Request:**
```bash
POST /auth/google
Content-Type: application/json

{
  "code": "4/0AWtgzBr...",
  "redirect_uri": "http://localhost:5173/auth/callback"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### GET /auth/me

Get current authenticated user.

**Response:** `200 OK`
```json
{
  "id": "user123",
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "https://...",
  "plan": "free"
}
```

---

### POST /auth/logout

Sign out and clear token cookie.

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

Sets:
```
Set-Cookie: patrasaar_token=; Max-Age=0
```

---

## Health Check

### GET /health

System health check.

**Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": 1712973600,
  "environment": "development"
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Human-readable error message",
  "details": "Optional additional context",
  "requestId": "Optional tracing ID"
}
```

Common HTTP status codes:
- `200` — Success
- `201` — Created
- `204` — No Content (delete)
- `400` — Bad Request (validation error)
- `401` — Unauthorized (missing/invalid token)
- `403` — Forbidden (not owner of resource)
- `404` — Not Found
- `422` — Unprocessable Entity (semantic error, e.g., no context found)
- `500` — Internal Server Error
- `502` — Bad Gateway (LLM service unavailable)
- `503` — Service Unavailable (Vectorize rate limit)

---

## Rate Limiting

Each authenticated user is rate-limited:
- **Inquiries:** 30 queries per hour
- **Document uploads:** 10 per hour
- **API calls (general):** 60 per minute

Rate limit headers:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 27
X-RateLimit-Reset: 1712977200
```

When limit exceeded:
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Retry-After: 1200
```

---

## Streaming Response Format

Inquiry responses use Server-Sent Events (SSE). Each message is a JSON object:

```
data: {"delta": "text chunk", "done": false}
data: {"delta": "more text", "done": false}
data: {"delta": null, "done": true}
```

- `delta` — Incremental text (null when done)
- `done` — Whether this is the final message

Frontend should accumulate all `delta` values into a single string.

---

## Webhooks (Planned)

_Future feature_: Subscribe to inquiry completion events

```bash
POST /webhooks
{
  "url": "https://your-service.com/inquiry-complete",
  "events": ["inquiry.completed"]
}
```

---

## SDKs & Client Libraries

### JavaScript/TypeScript

```javascript
import { PatrasaarClient } from '@patrasaar/client'

const client = new PatrasaarClient({
  baseUrl: 'https://api.patrasaar.dev',
  apiKey: 'pk_...'
})

const stream = await client.inquiries.stream({
  documentIds: [],
  question: 'What is murder?'
})

for await (const chunk of stream) {
  console.log(chunk.delta)
}
```

_Available on npm: `npm install @patrasaar/client`_

### Python

_Coming soon_

### REST via curl

All examples in this doc can be used directly with `curl`:

```bash
curl -X POST http://localhost:8787/inquiries/stream \
  -H "Content-Type: application/json" \
  -d '{"documentIds":[],"question":"What is murder?"}' \
  --cookie "patrasaar_token=..." \
  -N  # Disable buffering to see SSE stream
```

