-- Add pin_code column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10);

-- Add comment explaining the column
COMMENT ON COLUMN users.pin_code IS 'PIN code for mobile app authentication (4-6 digits)';

-- Example: Update existing user K1_4@kometa.com with PIN 6850
-- UPDATE users SET pin_code = '6850' WHERE email = 'K1_4@kometa.com';
