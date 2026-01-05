import { ISettingsRepository } from './ISettingsRepository';
import { IDatabaseConnection } from '../database/IDatabaseConnection';

export class SQLiteSettingsRepository implements ISettingsRepository {
  private readonly databaseConnection: IDatabaseConnection;

  constructor(databaseConnection: IDatabaseConnection) {
    this.databaseConnection = databaseConnection;
  }

  public async get(key: string): Promise<string | null> {
    const db = this.databaseConnection.getDatabase();
    const query = 'SELECT value FROM settings WHERE key = ?';
    
    try {
      const row = db.prepare(query).get(key) as { value: string } | undefined;
      if (!row) {
        return null;
      }
      return row.value;
    } catch (error) {
      console.error(`Error fetching setting ${key}:`, error);
      throw error;
    }
  }

  public async set(key: string, value: string): Promise<void> {
    const db = this.databaseConnection.getDatabase();
    const query = `
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `;
    
    try {
      db.prepare(query).run(key, value, value);
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      throw error;
    }
  }

  public async getAll(): Promise<Record<string, string>> {
    const db = this.databaseConnection.getDatabase();
    const query = 'SELECT key, value FROM settings';
    
    try {
      const rows = db.prepare(query).all() as Array<{ key: string; value: string }>;
      const settings: Record<string, string> = {};
      rows.forEach((row) => {
        settings[row.key] = row.value;
      });
      return settings;
    } catch (error) {
      console.error('Error fetching all settings:', error);
      throw error;
    }
  }
}




