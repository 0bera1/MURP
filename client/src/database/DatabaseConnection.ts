import { Pool, PoolClient } from 'pg';
import { IDatabaseConnection } from './IDatabaseConnection';
import { DatabaseConfigProvider } from '../config/DatabaseConfig';

export class DatabaseConnection implements IDatabaseConnection {
  private pool: Pool | null = null;
  private connected: boolean = false;

  public getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database connection not initialized. Call connect() first.');
    }
    return this.pool;
  }

  public async connect(): Promise<void> {
    if (this.connected && this.pool) {
      return;
    }

    const config = DatabaseConfigProvider.getConfig();

    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    this.pool.on('error', (error: Error) => {
      console.error('Unexpected error on idle client', error);
      this.connected = false;
    });

    try {
      const client: PoolClient = await this.pool.connect();
      
      // Run migrations
      await this.runMigrations(client);
      
      client.release();
      this.connected = true;
      console.log('Database connection established');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      this.connected = false;
      throw error;
    }
  }

  private async runMigrations(client: PoolClient): Promise<void> {
    try {
      // Migration 001: Add plan_name and description columns
      await client.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'plans' 
                AND column_name = 'plan_name'
            ) THEN
                ALTER TABLE plans ADD COLUMN plan_name VARCHAR(255);
                UPDATE plans SET plan_name = week_name WHERE plan_name IS NULL;
                ALTER TABLE plans ALTER COLUMN plan_name SET NOT NULL;
            END IF;
        END $$;
      `);

      await client.query(`
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
      `);

      // Create plan_days table if it doesn't exist
      await client.query(`
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
      `);

      // Create indexes for plan_days if they don't exist
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_plan_days_plan_id ON plan_days(plan_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_plan_days_day_of_week ON plan_days(day_of_week);
      `);

      // Migration 002: Remove year/week unique constraint and add plan_name unique constraint
      await client.query(`
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
      `);

      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_plan_name ON plans(plan_name);
      `);

      // Migration 003: Create settings table
      await client.query(`
        CREATE TABLE IF NOT EXISTS settings (
            key VARCHAR(255) PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        INSERT INTO settings (key, value)
        VALUES ('max_active_plans', '1')
        ON CONFLICT (key) DO NOTHING;
      `);

      console.log('Database migrations completed successfully');
    } catch (error) {
      console.error('Error running migrations:', error);
      // Don't throw - allow connection to proceed even if migrations fail
      // This prevents breaking existing installations
    }
  }

  public async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.connected = false;
      console.log('Database connection closed');
    }
  }

  public isConnected(): boolean {
    return this.connected && this.pool !== null;
  }
}

