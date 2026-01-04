-- Migration: Remove year/week unique constraint and add plan_name unique constraint
-- This allows multiple plans for the same year/week combination
-- But ensures plan names are unique

-- Drop the existing unique index on year/week if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_plans_year_week'
    ) THEN
        DROP INDEX idx_plans_year_week;
    END IF;
END $$;

-- Create unique index on plan_name if it doesn't exist
-- This ensures plan names are unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_plan_name ON plans(plan_name);

