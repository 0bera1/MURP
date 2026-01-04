export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxConnections?: number;
}

export class DatabaseConfigProvider {
  public static getConfig(): DatabaseConfig {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'manage_ur_plan',
      user: process.env.DB_USER || 'manageurplan',
      password: process.env.DB_PASSWORD || 'manageurplan123',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10)
    };
  }
}

