import { PlanDay } from '../models/PlanDay';
import { IPlanDayRepository } from './IPlanDayRepository';
import { IDatabaseConnection } from '../database/IDatabaseConnection';

export class SQLitePlanDayRepository implements IPlanDayRepository {
  private readonly databaseConnection: IDatabaseConnection;

  constructor(databaseConnection: IDatabaseConnection) {
    this.databaseConnection = databaseConnection;
  }

  public async getById(id: string): Promise<PlanDay | null> {
    const db = this.databaseConnection.getDatabase();
    const query = 'SELECT * FROM plan_days WHERE id = ?';
    
    try {
      const row = db.prepare(query).get(id) as Record<string, unknown> | undefined;
      if (!row) {
        return null;
      }
      return this.mapRowToPlanDay(row);
    } catch (error) {
      console.error('Error fetching plan day by id:', error);
      throw error;
    }
  }

  public async getByPlanId(planId: string): Promise<PlanDay[]> {
    const db = this.databaseConnection.getDatabase();
    const query = 'SELECT * FROM plan_days WHERE plan_id = ? ORDER BY day_of_week ASC';
    
    try {
      const rows = db.prepare(query).all(planId) as Array<Record<string, unknown>>;
      return rows.map((row) => this.mapRowToPlanDay(row));
    } catch (error) {
      console.error('Error fetching plan days by plan id:', error);
      throw error;
    }
  }

  public async create(planDay: PlanDay): Promise<PlanDay> {
    const db = this.databaseConnection.getDatabase();
    const query = `
      INSERT INTO plan_days (id, plan_id, day_of_week, day_name, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    try {
      db.prepare(query).run(
        planDay.id,
        planDay.planId,
        planDay.dayOfWeek,
        planDay.dayName,
        planDay.content || '',
        planDay.createdAt.toISOString(),
        planDay.updatedAt.toISOString()
      );

      const createdPlanDay = await this.getById(planDay.id);
      if (!createdPlanDay) {
        throw new Error('Failed to retrieve created plan day');
      }
      return createdPlanDay;
    } catch (error) {
      console.error('Error creating plan day:', error);
      throw error;
    }
  }

  public async update(planDay: PlanDay): Promise<PlanDay> {
    const db = this.databaseConnection.getDatabase();
    const query = `
      UPDATE plan_days
      SET content = ?, updated_at = ?
      WHERE id = ?
    `;
    
    try {
      const result = db.prepare(query).run(
        planDay.content,
        planDay.updatedAt.toISOString(),
        planDay.id
      );
      
      if (result.changes === 0) {
        throw new Error(`PlanDay with id ${planDay.id} not found`);
      }

      const updatedPlanDay = await this.getById(planDay.id);
      if (!updatedPlanDay) {
        throw new Error('Failed to retrieve updated plan day');
      }
      return updatedPlanDay;
    } catch (error) {
      console.error('Error updating plan day:', error);
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    const db = this.databaseConnection.getDatabase();
    const query = 'DELETE FROM plan_days WHERE id = ?';
    
    try {
      const result = db.prepare(query).run(id);
      
      if (result.changes === 0) {
        throw new Error(`PlanDay with id ${id} not found`);
      }
    } catch (error) {
      console.error('Error deleting plan day:', error);
      throw error;
    }
  }

  public async deleteByPlanId(planId: string): Promise<void> {
    const db = this.databaseConnection.getDatabase();
    const query = 'DELETE FROM plan_days WHERE plan_id = ?';
    
    try {
      db.prepare(query).run(planId);
    } catch (error) {
      console.error('Error deleting plan days by plan id:', error);
      throw error;
    }
  }

  public async createAll(planDays: PlanDay[]): Promise<PlanDay[]> {
    const db = this.databaseConnection.getDatabase();
    const transaction = db.transaction((planDays: PlanDay[]) => {
      const insertStmt = db.prepare(`
        INSERT INTO plan_days (id, plan_id, day_of_week, day_name, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const planDay of planDays) {
        insertStmt.run(
          planDay.id,
          planDay.planId,
          planDay.dayOfWeek,
          planDay.dayName,
          planDay.content || '',
          planDay.createdAt.toISOString(),
          planDay.updatedAt.toISOString()
        );
      }

      return planDays;
    });

    try {
      return transaction(planDays);
    } catch (error) {
      console.error('Error creating all plan days:', error);
      throw error;
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

