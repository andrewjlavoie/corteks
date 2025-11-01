-- PostgreSQL initialization script for AI Notes POC
-- This script runs automatically when the database container starts for the first time

-- Create the notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  type VARCHAR(10) CHECK(type IN ('user', 'ai')) NOT NULL,

  -- Content stored as JSONB (Tiptap JSON format)
  content JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}',

  -- AI Processing fields
  process_type VARCHAR(50),
  status VARCHAR(20) CHECK(status IN ('draft', 'processing', 'complete', 'failed')) DEFAULT 'draft',
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notes_parent_id ON notes(parent_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status);
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(type);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function before each update
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert a welcome note to get users started
INSERT INTO notes (type, content, status)
VALUES (
  'user',
  '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Welcome to AI Notes POC!"}]},{"type":"paragraph","content":[{"type":"text","text":"This is your first note. Try these steps:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Edit this note or create a new one"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Click one of the AI process buttons (Research, Summarize, etc.)"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Watch as AI generates a child note with processed content"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Explore the tree structure on the left"}]}]}]},{"type":"paragraph","content":[{"type":"text","text":"Have fun exploring!"}]}]}',
  'draft'
) ON CONFLICT DO NOTHING;

-- Create a view for easier querying of note hierarchies (optional but useful)
CREATE OR REPLACE VIEW note_tree AS
WITH RECURSIVE tree AS (
  -- Base case: root notes (no parent)
  SELECT
    id,
    parent_id,
    type,
    content,
    process_type,
    status,
    created_at,
    ARRAY[id] AS path,
    0 AS depth
  FROM notes
  WHERE parent_id IS NULL

  UNION ALL

  -- Recursive case: child notes
  SELECT
    n.id,
    n.parent_id,
    n.type,
    n.content,
    n.process_type,
    n.status,
    n.created_at,
    t.path || n.id,
    t.depth + 1
  FROM notes n
  INNER JOIN tree t ON n.parent_id = t.id
)
SELECT * FROM tree
ORDER BY path;

-- Grant privileges (if needed for additional users)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO notesuser;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO notesuser;
