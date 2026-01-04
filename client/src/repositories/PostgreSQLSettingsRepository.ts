import { ISettingsRepository } from './ISettingsRepository';
import { IDatabaseConnection } from '../database/IDatabaseConnection';

export class PostgreSQLSettingsRepository implements ISettingsRepository {
  private readonly databaseConnection: IDatabaseConnection;

  constructor(databaseConnection: IDatabaseConnection) {
    this.databaseConnection = databaseConnection;
  }

  public async get(key: string): Promise<string | null> {
    const pool = this.databaseConnection.getPool();
    const query = 'SELECT value FROM settings WHERE key = $1';
    
    try {
      const result = await pool.query(query, [key]);
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0].value as string;
    } catch (error) {
      console.error(`Error fetching setting ${key}:`, error);
      throw error;
    }
  }

  public async set(key: string, value: string): Promise<void> {
    const pool = this.databaseConnection.getPool();
    const query = `
      INSERT INTO settings (key, value, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
    `;
    
    try {
      await pool.query(query, [key, value]);
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      throw error;
    }
  }

  public async getAll(): Promise<Record<string, string>> {
    const pool = this.databaseConnection.getPool();
    const query = 'SELECT key, value FROM settings';
    
    try {
      const result = await pool.query(query);
      const settings: Record<string, string> = {};
      result.rows.forEach((row) => {
        settings[row.key] = row.value;
      });
      return settings;
    } catch (error) {
      console.error('Error fetching all settings:', error);
      throw error;
    }
  }
}

