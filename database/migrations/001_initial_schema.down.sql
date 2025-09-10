-- Rollback initial schema migration
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP INDEX IF EXISTS idx_chat_sessions_created_at;
DROP INDEX IF EXISTS idx_chat_sessions_document_id;
DROP INDEX IF EXISTS idx_documents_filename;
DROP INDEX IF EXISTS idx_documents_created_at;
DROP INDEX IF EXISTS idx_documents_status;

DROP TABLE IF EXISTS chat_sessions;
DROP TABLE IF EXISTS documents;

DROP EXTENSION IF EXISTS "uuid-ossp";