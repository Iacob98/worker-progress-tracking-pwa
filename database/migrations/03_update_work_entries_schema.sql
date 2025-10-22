-- Migration: Update work_entries table to match Worker PWA models
-- Date: 2025-10-21
-- Description: Add missing columns and update schema to match types/models.ts

-- Drop existing work_entries table structure and recreate with correct schema
-- Note: This assumes the table is currently based on the old schema

BEGIN;

-- Add new columns if they don't exist
DO $$
BEGIN
  -- Add date column (replaces start_time/end_time for daily work entries)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_entries' AND column_name = 'date') THEN
    ALTER TABLE work_entries ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;

  -- Add cabinet_id for linking to cabinets/NVTs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_entries' AND column_name = 'cabinet_id') THEN
    ALTER TABLE work_entries ADD COLUMN cabinet_id UUID REFERENCES cabinets(id);
  END IF;

  -- Add segment_id for linking to segments
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_entries' AND column_name = 'segment_id') THEN
    ALTER TABLE work_entries ADD COLUMN segment_id UUID REFERENCES segments(id);
  END IF;

  -- Add cut_id for future cut tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_entries' AND column_name = 'cut_id') THEN
    ALTER TABLE work_entries ADD COLUMN cut_id UUID;
  END IF;

  -- Add house_id for house connections
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_entries' AND column_name = 'house_id') THEN
    ALTER TABLE work_entries ADD COLUMN house_id UUID;
  END IF;

  -- Add stage_code for work stage tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_entries' AND column_name = 'stage_code') THEN
    ALTER TABLE work_entries ADD COLUMN stage_code TEXT NOT NULL DEFAULT 'stage_1_marking';
  END IF;

  -- Add meters_done_m for progress tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_entries' AND column_name = 'meters_done_m') THEN
    ALTER TABLE work_entries ADD COLUMN meters_done_m DECIMAL(10,2) NOT NULL DEFAULT 0;
  END IF;

  -- Add method (work method)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_entries' AND column_name = 'method') THEN
    ALTER TABLE work_entries ADD COLUMN method TEXT;
  END IF;

  -- Add width_m
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_entries' AND column_name = 'width_m') THEN
    ALTER TABLE work_entries ADD COLUMN width_m DECIMAL(5,2);
  END IF;

  -- Add depth_m
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_entries' AND column_name = 'depth_m') THEN
    ALTER TABLE work_entries ADD COLUMN depth_m DECIMAL(5,2);
  END IF;

  -- Add cables_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_entries' AND column_name = 'cables_count') THEN
    ALTER TABLE work_entries ADD COLUMN cables_count INTEGER;
  END IF;

  -- Add has_protection_pipe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_entries' AND column_name = 'has_protection_pipe') THEN
    ALTER TABLE work_entries ADD COLUMN has_protection_pipe BOOLEAN;
  END IF;

  -- Add soil_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'work_entries' AND column_name = 'soil_type') THEN
    ALTER TABLE work_entries ADD COLUMN soil_type TEXT;
  END IF;

END $$;

-- Remove work_type column if it exists (replaced by stage_code)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'work_entries' AND column_name = 'work_type') THEN
    ALTER TABLE work_entries DROP COLUMN work_type;
  END IF;
END $$;

-- Remove start_time, end_time, duration_hours if they exist (replaced by date)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'work_entries' AND column_name = 'start_time') THEN
    ALTER TABLE work_entries DROP COLUMN start_time;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'work_entries' AND column_name = 'end_time') THEN
    ALTER TABLE work_entries DROP COLUMN end_time;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'work_entries' AND column_name = 'duration_hours') THEN
    ALTER TABLE work_entries DROP COLUMN duration_hours;
  END IF;
END $$;

-- Remove status column (replaced by approved boolean only)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'work_entries' AND column_name = 'status') THEN
    ALTER TABLE work_entries DROP COLUMN status;
  END IF;
END $$;

-- Remove location columns that are redundant (latitude, longitude, location_accuracy)
-- These should be on photos instead
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'work_entries' AND column_name = 'latitude') THEN
    ALTER TABLE work_entries DROP COLUMN latitude;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'work_entries' AND column_name = 'longitude') THEN
    ALTER TABLE work_entries DROP COLUMN longitude;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'work_entries' AND column_name = 'location_accuracy') THEN
    ALTER TABLE work_entries DROP COLUMN location_accuracy;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'work_entries' AND column_name = 'description') THEN
    ALTER TABLE work_entries DROP COLUMN description;
  END IF;
END $$;

-- Create index on date for better query performance
CREATE INDEX IF NOT EXISTS idx_work_entries_date ON work_entries(date);

-- Create index on segment_id for queries
CREATE INDEX IF NOT EXISTS idx_work_entries_segment_id ON work_entries(segment_id);

-- Create index on cabinet_id for queries
CREATE INDEX IF NOT EXISTS idx_work_entries_cabinet_id ON work_entries(cabinet_id);

COMMIT;

-- Print success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 03_update_work_entries_schema completed successfully';
END $$;
