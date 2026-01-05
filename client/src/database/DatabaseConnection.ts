import Database from 'better-sqlite3';
import { IDatabaseConnection } from './IDatabaseConnection';
import { DatabaseConfigProvider } from '../config/DatabaseConfig';
import * as fs from 'fs';
import * as path from 'path';

export class DatabaseConnection implements IDatabaseConnection {
  private database: Database.Database | null = null;
  private connected: boolean = false;

  public getDatabase(): Database.Database {
    if (!this.database) {
      throw new Error('Database connection not initialized. Call connect() first.');
    }
    return this.database;
  }

  public async connect(): Promise<void> {
    if (this.connected && this.database) {
      return;
    }

    const config = DatabaseConfigProvider.getConfig();

    // Veritabanı dosyasının bulunduğu dizini oluştur
    const dbDir = path.dirname(config.databasePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    try {
      this.database = new Database(config.databasePath);
      
      // Foreign key desteğini etkinleştir
      this.database.pragma('foreign_keys = ON');
      
      // Run migrations
      await this.runMigrations();
      
      this.connected = true;
    } catch (error) {
      console.error('Failed to connect to database:', error);
      this.connected = false;
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      // Plans tablosunu oluştur (eğer yoksa)
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS plans (
          id VARCHAR(255) PRIMARY KEY,
          plan_name VARCHAR(255) NOT NULL,
          description TEXT,
          year INTEGER NOT NULL,
          week INTEGER NOT NULL,
          week_name VARCHAR(255) NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 0,
          is_completed INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_opened_at TIMESTAMP
        );
      `);

      // Migration 001: Add plan_name and description columns (eğer yoksa)
      const planNameExists = this.database.prepare(`
        SELECT COUNT(*) as count 
        FROM pragma_table_info('plans') 
        WHERE name = 'plan_name'
      `).get() as { count: number };

      if (planNameExists.count === 0) {
        this.database.exec(`
          ALTER TABLE plans ADD COLUMN plan_name VARCHAR(255);
          UPDATE plans SET plan_name = week_name WHERE plan_name IS NULL;
        `);
        // Mevcut kayıtları güncelle
        this.database.exec(`
          UPDATE plans SET plan_name = week_name WHERE plan_name IS NULL;
        `);
      }

      const descriptionExists = this.database.prepare(`
        SELECT COUNT(*) as count 
        FROM pragma_table_info('plans') 
        WHERE name = 'description'
      `).get() as { count: number };

      if (descriptionExists.count === 0) {
        this.database.exec(`
          ALTER TABLE plans ADD COLUMN description TEXT;
        `);
      }

      // Create plan_days table if it doesn't exist
      this.database.exec(`
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
      this.database.exec(`
        CREATE INDEX IF NOT EXISTS idx_plan_days_plan_id ON plan_days(plan_id);
        CREATE INDEX IF NOT EXISTS idx_plan_days_day_of_week ON plan_days(day_of_week);
      `);

      // Migration 002: Remove year/week unique constraint and add plan_name unique constraint
      // SQLite'da index'i kontrol et ve varsa sil
      const indexes = this.database.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type = 'index' AND name = 'idx_plans_year_week'
      `).all() as Array<{ name: string }>;

      if (indexes.length > 0) {
        this.database.exec(`DROP INDEX idx_plans_year_week;`);
      }

      // plan_name için unique index oluştur (eğer yoksa)
      const planNameIndex = this.database.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type = 'index' AND name = 'idx_plans_plan_name'
      `).all() as Array<{ name: string }>;

      if (planNameIndex.length === 0) {
        this.database.exec(`
          CREATE UNIQUE INDEX idx_plans_plan_name ON plans(plan_name);
        `);
      }

      // Migration 003: Create settings table
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Varsayılan ayarları ekle (eğer yoksa)
      const maxActivePlansExists = this.database.prepare(`
        SELECT COUNT(*) as count FROM settings WHERE key = 'max_active_plans'
      `).get() as { count: number };

      if (maxActivePlansExists.count === 0) {
        this.database.prepare(`
          INSERT INTO settings (key, value) VALUES ('max_active_plans', '1')
        `).run();
      }

    } catch (error) {
      console.error('Error running migrations:', error);
      // Don't throw - allow connection to proceed even if migrations fail
      // This prevents breaking existing installations
    }
  }

  public async disconnect(): Promise<void> {
    if (this.database) {
      this.database.close();
      this.database = null;
      this.connected = false;
    }
  }

  public isConnected(): boolean {
    return this.connected && this.database !== null;
  }
}
