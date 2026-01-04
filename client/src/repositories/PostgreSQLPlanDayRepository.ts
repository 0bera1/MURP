import { PlanDay } from '../models/PlanDay';
import { IPlanDayRepository } from './IPlanDayRepository';
import { IDatabaseConnection } from '../database/IDatabaseConnection';

export class PostgreSQLPlanDayRepository implements IPlanDayRepository {
  private readonly databaseConnection: IDatabaseConnection;

  constructor(databaseConnection: IDatabaseConnection) {
    this.databaseConnection = databaseConnection;
  }

  public async getByPlanId(planId: string): Promise<PlanDay[]> {
    const pool = this.databaseConnection.getPool();
    const query = 'SELECT * FROM plan_days WHERE plan_id = $1 ORDER BY day_of_week ASC';
    
    try {
      const result = await pool.query(query, [planId]);
      return result.rows.map((row) => this.mapRowToPlanDay(row));
    } catch (error) {
      console.error('Error fetching plan days by plan id:', error);
      throw error;
    }
  }

  public async create(planDay: PlanDay): Promise<PlanDay> {
    const pool = this.databaseConnection.getPool();
    const query = `
      INSERT INTO plan_days (id, plan_id, day_of_week, day_name, content, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    try {
      const values = [
        planDay.id,
        planDay.planId,
        planDay.dayOfWeek,
        planDay.dayName,
        planDay.content || '',
        planDay.createdAt,
        planDay.updatedAt
      ];

      const result = await pool.query(query, values);
      return this.mapRowToPlanDay(result.rows[0]);
    } catch (error) {
      console.error('Error creating plan day:', error);
      throw error;
    }
  }

  public async update(planDay: PlanDay): Promise<PlanDay> {
    const pool = this.databaseConnection.getPool();
    const query = `
      UPDATE plan_days
      SET content = $2, updated_at = $3
      WHERE id = $1
      RETURNING *
    `;
    
    try {
      const values = [
        planDay.id,
        planDay.content,
        planDay.updatedAt
      ];

      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`PlanDay with id ${planDay.id} not found`);
      }

      return this.mapRowToPlanDay(result.rows[0]);
    } catch (error) {
      console.error('Error updating plan day:', error);
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    const pool = this.databaseConnection.getPool();
    const query = 'DELETE FROM plan_days WHERE id = $1';
    
    try {
      const result = await pool.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new Error(`PlanDay with id ${id} not found`);
      }
    } catch (error) {
      console.error('Error deleting plan day:', error);
      throw error;
    }
  }

  public async deleteByPlanId(planId: string): Promise<void> {
    const pool = this.databaseConnection.getPool();
    const query = 'DELETE FROM plan_days WHERE plan_id = $1';
    
    try {
      await pool.query(query, [planId]);
    } catch (error) {
      console.error('Error deleting plan days by plan id:', error);
      throw error;
    }
  }

  public async createAll(planDays: PlanDay[]): Promise<PlanDay[]> {
    const pool = this.databaseConnection.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const createdDays: PlanDay[] = [];

      for (const planDay of planDays) {
        const query = `
          INSERT INTO plan_days (id, plan_id, day_of_week, day_name, content, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        const values = [
          planDay.id,
          planDay.planId,
          planDay.dayOfWeek,
          planDay.dayName,
          planDay.content || '',
          planDay.createdAt,
          planDay.updatedAt
        ];

        const result = await client.query(query, values);
        createdDays.push(this.mapRowToPlanDay(result.rows[0]));
      }

      await client.query('COMMIT');
      return createdDays;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating all plan days:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToPlanDay(row: Record<string, unknown>): PlanDay {
    return {
      id: row.id as string,
      planId: row.plan_id as string,
      dayOfWeek: row.day_of_week as number,
      dayName: row.day_name as string,
      content: (row.content as string) || '',
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    };
  }
}

