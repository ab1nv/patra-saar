-- Initial schema for PatraSaar
-- Creates all core tables: users, documents, chunks, cases, inquiries

CREATE TABLE users (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  google_id    TEXT UNIQUE NOT NULL,
  email        TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  picture_url  TEXT,
  plan         TEXT NOT NULL DEFAULT 'free',
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE cases (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE documents (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id      TEXT REFERENCES cases(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  doc_type     TEXT NOT NULL,
  r2_key       TEXT NOT NULL UNIQUE,
  page_count   INTEGER,
  language     TEXT DEFAULT 'en',
  status       TEXT DEFAULT 'processing',
  summary      TEXT,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE chunks (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  document_id  TEXT NOT NULL,
  chunk_index  INTEGER NOT NULL,
  page_number  INTEGER NOT NULL,
  text         TEXT NOT NULL,
  token_count  INTEGER,
  vector_id    TEXT UNIQUE,
  source       TEXT NOT NULL DEFAULT 'user-doc'
);

CREATE TABLE inquiries (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_ids TEXT NOT NULL,
  question     TEXT NOT NULL,
  answer       TEXT,
  citations    TEXT,
  model_used   TEXT,
  confidence   REAL,
  tags         TEXT,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chunks_source ON chunks(source);
CREATE INDEX idx_inquiries_user_id ON inquiries(user_id);
