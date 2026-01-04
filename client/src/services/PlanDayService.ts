import { PlanDay } from '../models/PlanDay';
import { IPlanDayService } from './IPlanDayService';
import { IPlanDayRepository } from '../repositories/IPlanDayRepository';
import { PostgreSQLPlanDayRepository } from '../repositories/PostgreSQLPlanDayRepository';
import { IDatabaseConnection } from '../database/IDatabaseConnection';
import { DatabaseConnection } from '../database/DatabaseConnection';

export class PlanDayService implements IPlanDayService {
  private repository: IPlanDayRepository;
  private databaseConnection: IDatabaseConnection;

  constructor(repository?: IPlanDayRepository, databaseConnection?: IDatabaseConnection) {
    this.databaseConnection = databaseConnection || new DatabaseConnection();
    this.repository = repository || new PostgreSQLPlanDayRepository(this.databaseConnection);
  }

  public async getByPlanId(planId: string): Promise<PlanDay[]> {
    return await this.repository.getByPlanId(planId);
  }

  public async createPlanDay(planDay: PlanDay): Promise<PlanDay> {
    return await this.repository.create(planDay);
  }

  public async updatePlanDay(planDay: PlanDay): Promise<PlanDay> {
    planDay.updatedAt = new Date();
    return await this.repository.update(planDay);
  }

  public async deletePlanDay(id: string): Promise<void> {
    return await this.repository.delete(id);
  }

  public async createPlanDays(planDays: PlanDay[]): Promise<PlanDay[]> {
    return await this.repository.createAll(planDays);
  }
}

