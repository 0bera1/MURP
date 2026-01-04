import { Plan } from '../models/Plan';
import { IPlanRepository } from './IPlanRepository';
import { IDatabaseConnection } from '../database/IDatabaseConnection';

export class PostgreSQLPlanRepository implements IPlanRepository {
  private readonly databaseConnection: IDatabaseConnection;

  constructor(databaseConnection: IDatabaseConnection) {
    this.databaseConnection = databaseConnection;
  }

  public async getAll(): Promise<Plan[]> {
    const pool = this.databaseConnection.getPool();
    const query = 'SELECT * FROM plans ORDER BY created_at DESC';
    
    try {
      const result = await pool.query(query);
      return result.rows.map((row) => this.mapRowToPlan(row));
    } catch (error) {
      console.error('Error fetching all plans:', error);
      throw error;
    }
  }

  public async getById(id: string): Promise<Plan | null> {
    const pool = this.databaseConnection.getPool();
    const query = 'SELECT * FROM plans WHERE id = $1';
    
    try {
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToPlan(result.rows[0]);
    } catch (error) {
      console.error('Error fetching plan by id:', error);
      throw error;
    }
  }

  public async getByName(planName: string): Promise<Plan | null> {
    const pool = this.databaseConnection.getPool();
    const query = 'SELECT * FROM plans WHERE plan_name = $1';
    
    try {
      const result = await pool.query(query, [planName]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToPlan(result.rows[0]);
    } catch (error) {
      console.error('Error fetching plan by name:', error);
      throw error;
    }
  }

  public async create(plan: Plan): Promise<Plan> {
    const pool = this.databaseConnection.getPool();
    const query = `
      INSERT INTO plans (id, plan_name, description, year, week, week_name, is_active, is_completed, created_at, last_opened_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    try {
      const values = [
        plan.id,
        plan.planName,
        plan.description || null,
        plan.year,
        plan.week,
        plan.weekName,
        plan.isActive,
        plan.isCompleted,
        plan.createdAt,
        plan.lastOpenedAt || null
      ];

      const result = await pool.query(query, values);
      return this.mapRowToPlan(result.rows[0]);
    } catch (error) {
      console.error('Error creating plan:', error);
      throw error;
    }
  }

  public async update(plan: Plan): Promise<Plan> {
    const pool = this.databaseConnection.getPool();
    const query = `
      UPDATE plans
      SET plan_name = $2, description = $3, year = $4, week = $5, week_name = $6, 
          is_active = $7, is_completed = $8, last_opened_at = $9
      WHERE id = $1
      RETURNING *
    `;
    
    try {
      const values = [
        plan.id,
        plan.planName,
        plan.description || null,
        plan.year,
        plan.week,
        plan.weekName,
        plan.isActive,
        plan.isCompleted,
        plan.lastOpenedAt || null
      ];

      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Plan with id ${plan.id} not found`);
      }

      return this.mapRowToPlan(result.rows[0]);
    } catch (error) {
      console.error('Error updating plan:', error);
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    const pool = this.databaseConnection.getPool();
    const query = 'DELETE FROM plans WHERE id = $1';
    
    try {
      const result = await pool.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new Error(`Plan with id ${id} not found`);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      throw error;
    }
  }

  public async saveAll(plans: Plan[]): Promise<void> {
    const pool = this.databaseConnection.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const plan of plans) {
        const checkQuery = 'SELECT id FROM plans WHERE id = $1';
        const checkResult = await client.query(checkQuery, [plan.id]);

        if (checkResult.rows.length === 0) {
          const insertQuery = `
            INSERT INTO plans (id, plan_name, description, year, week, week_name, is_active, is_completed, created_at, last_opened_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `;
          await client.query(insertQuery, [
            plan.id,
            plan.planName,
            plan.description || null,
            plan.year,
            plan.week,
            plan.weekName,
            plan.isActive,
            plan.isCompleted,
            plan.createdAt,
            plan.lastOpenedAt || null
          ]);
        } else {
          const updateQuery = `
            UPDATE plans
            SET plan_name = $2, description = $3, year = $4, week = $5, week_name = $6, 
                is_active = $7, is_completed = $8, last_opened_at = $9
            WHERE id = $1
          `;
          await client.query(updateQuery, [
            plan.id,
            plan.planName,
            plan.description || null,
            plan.year,
            plan.week,
            plan.weekName,
            plan.isActive,
            plan.isCompleted,
            plan.lastOpenedAt || null
          ]);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving all plans:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToPlan(row: Record<string, unknown>): Plan {
    return {
      id: row.id as string,
      planName: row.plan_name as string,
      description: row.description as string | undefined,
      year: row.year as number,
      week: row.week as number,
      weekName: row.week_name as string,
      isActive: row.is_active as boolean,
      isCompleted: row.is_completed as boolean,
      createdAt: new Date(row.created_at as string),
      lastOpenedAt: row.last_opened_at ? new Date(row.last_opened_at as string) : undefined
    };
  }
}

