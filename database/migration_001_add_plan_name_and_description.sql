-- Migration: Add plan_name and description columns to plans table
-- Also create plan_days table if it doesn't exist

-- Check if plan_name column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'plans' 
        AND column_name = 'plan_name'
    ) THEN
        -- Add plan_name column (with a default value for existing rows)
        ALTER TABLE plans ADD COLUMN plan_name VARCHAR(255);
        -- Update existing rows with a default value
        UPDATE plans SET plan_name = week_name WHERE plan_name IS NULL;
        -- Make it NOT NULL after updating existing rows
        ALTER TABLE plans ALTER COLUMN plan_name SET NOT NULL;
    END IF;
END $$;

-- Check if description column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'plans' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE plans ADD COLUMN description TEXT;
    END IF;
END $$;

-- Create plan_days table if it doesn't exist
CREATE TABLE IF NOT EXISTS plan_days (
    id VARCHAR(255) PRIMARY KEY,
    plan_id VARCHAR(255) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    day_name VARCHAR(50) NOT NULL,
    content TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    UNIQUE(plan_id, day_of_week)
);

-- Create indexes for plan_days if they don't exist
CREATE INDEX IF NOT EXISTS idx_plan_days_plan_id ON plan_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_days_day_of_week ON plan_days(day_of_week);

