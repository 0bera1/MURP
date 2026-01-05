import { app } from 'electron';
import * as path from 'path';

export interface DatabaseConfig {
  databasePath: string;
}

export class DatabaseConfigProvider {
  public static getConfig(): DatabaseConfig {
    const userDataPath = app.getPath('userData');
    const databasePath = process.env.DB_PATH || path.join(userDataPath, 'manage_ur_plan.db');
    return {
      databasePath: databasePath
    };
  }
}

