-- Add case_id column to inquiries mapping conversation boundaries.
ALTER TABLE inquiries ADD COLUMN case_id TEXT REFERENCES cases(id) ON DELETE CASCADE;

-- Index the lookups
CREATE INDEX IF NOT EXISTS idx_inquiries_case_id ON inquiries(case_id);
