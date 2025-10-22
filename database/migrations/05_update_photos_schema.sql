-- Migration: Update photos table to match Worker PWA models
-- Date: 2025-10-21
-- Description: Add url, ts, gps_lat, gps_lon, label fields and update structure

BEGIN;

-- Add new columns if they don't exist
DO $$
BEGIN
  -- Add url column (Supabase Storage path)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'photos' AND column_name = 'url') THEN
    ALTER TABLE photos ADD COLUMN url TEXT;
  END IF;

  -- Add ts column (timestamp when photo was taken)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'photos' AND column_name = 'ts') THEN
    ALTER TABLE photos ADD COLUMN ts TIMESTAMPTZ;
  END IF;

  -- Add gps_lat column (GPS latitude)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'photos' AND column_name = 'gps_lat') THEN
    ALTER TABLE photos ADD COLUMN gps_lat DECIMAL(10, 8);
  END IF;

  -- Add gps_lon column (GPS longitude)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'photos' AND column_name = 'gps_lon') THEN
    ALTER TABLE photos ADD COLUMN gps_lon DECIMAL(11, 8);
  END IF;

  -- Add label column (before, during, after, instrument, other)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'photos' AND column_name = 'label') THEN
    ALTER TABLE photos ADD COLUMN label TEXT;
  END IF;

  -- Add author_user_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'photos' AND column_name = 'author_user_id') THEN
    ALTER TABLE photos ADD COLUMN author_user_id UUID REFERENCES users(id);
  END IF;

  -- Add cut_stage_id column (for future cut stages)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'photos' AND column_name = 'cut_stage_id') THEN
    ALTER TABLE photos ADD COLUMN cut_stage_id UUID;
  END IF;

  -- Add updated_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'photos' AND column_name = 'updated_at') THEN
    ALTER TABLE photos ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;

END $$;

-- Make filename and file_path nullable (since we're using url now)
ALTER TABLE photos ALTER COLUMN filename DROP NOT NULL;
ALTER TABLE photos ALTER COLUMN file_path DROP NOT NULL;

-- Create index on label for filtering
CREATE INDEX IF NOT EXISTS idx_photos_label ON photos(label);

-- Create index on ts for sorting
CREATE INDEX IF NOT EXISTS idx_photos_ts ON photos(ts);

COMMIT;

-- Print success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 05_update_photos_schema completed successfully';
  RAISE NOTICE 'Added fields: url, ts, gps_lat, gps_lon, label, author_user_id, cut_stage_id';
END $$;
