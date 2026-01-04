import { Pool } from 'pg';

export interface IDatabaseConnection {
  getPool(): Pool;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

