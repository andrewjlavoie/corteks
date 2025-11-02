-- Migration: Add folder support to notes table
-- This migration adds the ability to organize notes into folders

-- Add new columns
ALTER TABLE notes ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'note';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Allow NULL content for folders
ALTER TABLE notes ALTER COLUMN content DROP NOT NULL;

-- Add constraint for item_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_item_type'
  ) THEN
    ALTER TABLE notes ADD CONSTRAINT check_item_type
      CHECK(item_type IN ('folder', 'note', 'ai-note'));
  END IF;
END $$;

-- Update existing data to use new item_type
UPDATE notes SET item_type = 'note' WHERE type = 'user' AND item_type = 'note';
UPDATE notes SET item_type = 'ai-note' WHERE type = 'ai' AND item_type = 'note';

-- Create index on item_type for better query performance
CREATE INDEX IF NOT EXISTS idx_notes_item_type ON notes(item_type);

-- Create index on name for folder/note lookup
CREATE INDEX IF NOT EXISTS idx_notes_name ON notes(name) WHERE name IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN notes.item_type IS 'Type of item: folder (organizational), note (user content), or ai-note (AI generated)';
COMMENT ON COLUMN notes.name IS 'Name of folder or optional display name for notes';
