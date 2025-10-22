-- Migration: Add rejection fields to work_entries
-- Date: 2025-10-21
-- Description: Add rejection_reason, rejected_by, rejected_at fields

BEGIN;

-- Add rejection fields
DO $$
BEGIN
  -- Add rejection_reason column (reason why work was rejected)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_entries' AND column_name = 'rejection_reason') THEN
    ALTER TABLE work_entries ADD COLUMN rejection_reason TEXT;
  END IF;

  -- Add rejected_by column (user who rejected the work)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_entries' AND column_name = 'rejected_by') THEN
    ALTER TABLE work_entries ADD COLUMN rejected_by UUID REFERENCES users(id);
  END IF;

  -- Add rejected_at column (timestamp when work was rejected)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_entries' AND column_name = 'rejected_at') THEN
    ALTER TABLE work_entries ADD COLUMN rejected_at TIMESTAMPTZ;
  END IF;

END $$;

-- Create index on rejected_at for filtering rejected entries
CREATE INDEX IF NOT EXISTS idx_work_entries_rejected_at ON work_entries(rejected_at) WHERE rejected_at IS NOT NULL;

-- Create index on rejected_by for queries
CREATE INDEX IF NOT EXISTS idx_work_entries_rejected_by ON work_entries(rejected_by) WHERE rejected_by IS NOT NULL;

COMMIT;

-- Print success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 04_add_rejection_fields completed successfully';
  RAISE NOTICE 'Added fields: rejection_reason, rejected_by, rejected_at';
END $$;
