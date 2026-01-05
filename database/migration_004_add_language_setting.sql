-- Migration 004: Add language setting
-- Add language setting to settings table if it doesn't exist

DO $$
BEGIN
    -- Insert language setting if it doesn't exist
    INSERT INTO settings (key, value)
    VALUES ('language', 'tr')
    ON CONFLICT (key) DO NOTHING;
END $$;




