-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(255) PRIMARY KEY,
    plan_name VARCHAR(255) NOT NULL,
    description TEXT,
    year INTEGER NOT NULL,
    week INTEGER NOT NULL,
    week_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_opened_at TIMESTAMP
);

-- Create index for active plans
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active) WHERE is_active = true;

-- Create index for last_opened_at
CREATE INDEX IF NOT EXISTS idx_plans_last_opened_at ON plans(last_opened_at DESC);

-- Create unique constraint for plan_name (plan names must be unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_plan_name ON plans(plan_name);

-- Create plan_days table for storing daily plan data
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

-- Create index for plan_days
CREATE INDEX IF NOT EXISTS idx_plan_days_plan_id ON plan_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_days_day_of_week ON plan_days(day_of_week);

