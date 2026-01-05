import { Plan } from '../models/Plan';
import { IPlanRepository } from './IPlanRepository';
import { IDatabaseConnection } from '../database/IDatabaseConnection';

export class SQLitePlanRepository implements IPlanRepository {
  private readonly databaseConnection: IDatabaseConnection;

  constructor(databaseConnection: IDatabaseConnection) {
    this.databaseConnection = databaseConnection;
  }

  public async getAll(): Promise<Plan[]> {
    const db = this.databaseConnection.getDatabase();
    const query = 'SELECT * FROM plans ORDER BY created_at DESC';
    
    try {
      const rows = db.prepare(query).all() as Array<Record<string, unknown>>;
      return rows.map((row) => this.mapRowToPlan(row));
    } catch (error) {
      console.error('Error fetching all plans:', error);
      throw error;
    }
  }

  public async getById(id: string): Promise<Plan | null> {
    const db = this.databaseConnection.getDatabase();
    const query = 'SELECT * FROM plans WHERE id = ?';
    
    try {
      const row = db.prepare(query).get(id) as Record<string, unknown> | undefined;
      if (!row) {
        return null;
      }
      return this.mapRowToPlan(row);
    } catch (error) {
      console.error('Error fetching plan by id:', error);
      throw error;
    }
  }

  public async getByName(planName: string): Promise<Plan | null> {
    const db = this.databaseConnection.getDatabase();
    const query = 'SELECT * FROM plans WHERE plan_name = ?';
    
    try {
      const row = db.prepare(query).get(planName) as Record<string, unknown> | undefined;
      if (!row) {
        return null;
      }
      return this.mapRowToPlan(row);
    } catch (error) {
      console.error('Error fetching plan by name:', error);
      throw error;
    }
  }

  public async create(plan: Plan): Promise<Plan> {
    const db = this.databaseConnection.getDatabase();
    const query = `
      INSERT INTO plans (id, plan_name, description, year, week, week_name, is_active, is_completed, created_at, last_opened_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    try {
      db.prepare(query).run(
        plan.id,
        plan.planName,
        plan.description || null,
        plan.year,
        plan.week,
        plan.weekName,
        plan.isActive ? 1 : 0,
        plan.isCompleted ? 1 : 0,
        plan.createdAt.toISOString(),
        plan.lastOpenedAt ? plan.lastOpenedAt.toISOString() : null
      );

      const createdPlan = await this.getById(plan.id);
      if (!createdPlan) {
        throw new Error('Failed to retrieve created plan');
      }
      return createdPlan;
    } catch (error) {
      console.error('Error creating plan:', error);
      throw error;
    }
  }

  public async update(plan: Plan): Promise<Plan> {
    const db = this.databaseConnection.getDatabase();
    const query = `
      UPDATE plans
      SET plan_name = ?, description = ?, year = ?, week = ?, week_name = ?, 
          is_active = ?, is_completed = ?, last_opened_at = ?
      WHERE id = ?
    `;
    
    try {
      const result = db.prepare(query).run(
        plan.planName,
        plan.description || null,
        plan.year,
        plan.week,
        plan.weekName,
        plan.isActive ? 1 : 0,
        plan.isCompleted ? 1 : 0,
        plan.lastOpenedAt ? plan.lastOpenedAt.toISOString() : null,
        plan.id
      );
      
      if (result.changes === 0) {
        throw new Error(`Plan with id ${plan.id} not found`);
      }

      const updatedPlan = await this.getById(plan.id);
      if (!updatedPlan) {
        throw new Error('Failed to retrieve updated plan');
      }
      return updatedPlan;
    } catch (error) {
      console.error('Error updating plan:', error);
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    const db = this.databaseConnection.getDatabase();
    const query = 'DELETE FROM plans WHERE id = ?';
    
    try {
      const result = db.prepare(query).run(id);
      
      if (result.changes === 0) {
        throw new Error(`Plan with id ${id} not found`);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      throw error;
    }
  }

  public async saveAll(plans: Plan[]): Promise<void> {
    const db = this.databaseConnection.getDatabase();
    const transaction = db.transaction((plans: Plan[]) => {
      const checkStmt = db.prepare('SELECT id FROM plans WHERE id = ?');
      const insertStmt = db.prepare(`
        INSERT INTO plans (id, plan_name, description, year, week, week_name, is_active, is_completed, created_at, last_opened_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const updateStmt = db.prepare(`
        UPDATE plans
        SET plan_name = ?, description = ?, year = ?, week = ?, week_name = ?, 
            is_active = ?, is_completed = ?, last_opened_at = ?
        WHERE id = ?
      `);

      for (const plan of plans) {
        const existing = checkStmt.get(plan.id) as { id: string } | undefined;

        if (!existing) {
          insertStmt.run(
            plan.id,
            plan.planName,
            plan.description || null,
            plan.year,
            plan.week,
            plan.weekName,
            plan.isActive ? 1 : 0,
            plan.isCompleted ? 1 : 0,
            plan.createdAt.toISOString(),
            plan.lastOpenedAt ? plan.lastOpenedAt.toISOString() : null
          );
        } else {
          updateStmt.run(
            plan.planName,
            plan.description || null,
            plan.year,
            plan.week,
            plan.weekName,
            plan.isActive ? 1 : 0,
            plan.isCompleted ? 1 : 0,
            plan.lastOpenedAt ? plan.lastOpenedAt.toISOString() : null,
            plan.id
          );
        }
      }
    });

    try {
      transaction(plans);
    } catch (error) {
      console.error('Error saving all plans:', error);
      throw error;
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
      isActive: (row.is_active as number) === 1,
      isCompleted: (row.is_completed as number) === 1,
      createdAt: new Date(row.created_at as string),
      lastOpenedAt: row.last_opened_at ? new Date(row.last_opened_at as string) : undefined
    };
  }
}



