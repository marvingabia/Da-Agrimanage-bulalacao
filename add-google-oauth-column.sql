-- Add Google OAuth support to existing users table
-- Run this if you already have a users table

USE da_agrimanage;

-- Add googleId column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS googleId VARCHAR(255) AFTER authProvider,
ADD INDEX IF NOT EXISTS idx_googleId (googleId);

-- Show updated table structure
DESCRIBE users;

SELECT 'Google OAuth column added successfully!' AS status;
