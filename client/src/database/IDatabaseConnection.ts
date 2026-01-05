import Database from 'better-sqlite3';

export interface IDatabaseConnection {
  getDatabase(): Database.Database;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

