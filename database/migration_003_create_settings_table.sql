-- Migration: Create settings table for application settings
-- This table stores key-value pairs for application settings

CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default value for max_active_plans (default: 1)
INSERT INTO settings (key, value)
VALUES ('max_active_plans', '1')
ON CONFLICT (key) DO NOTHING;

