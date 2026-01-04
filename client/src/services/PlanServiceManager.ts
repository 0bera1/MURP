import { IPlanService } from './IPlanService';
import { PlanService } from './PlanService';
import { IDatabaseConnection } from '../database/IDatabaseConnection';
import { PostgreSQLPlanRepository } from '../repositories/PostgreSQLPlanRepository';
import { PlanDayService } from './PlanDayService';
import { IPlanDayService } from './IPlanDayService';
import { ISettingsService } from './ISettingsService';
import { SettingsService } from './SettingsService';
import { PostgreSQLSettingsRepository } from '../repositories/PostgreSQLSettingsRepository';

export class PlanServiceManager {
  private planService: IPlanService | null = null;
  private planDayService: IPlanDayService | null = null;
  private settingsService: ISettingsService | null = null;
  private databaseConnection: IDatabaseConnection;

  constructor(databaseConnection: IDatabaseConnection) {
    this.databaseConnection = databaseConnection;
  }

  public async initialize(): Promise<void> {
    if (!this.databaseConnection.isConnected()) {
      await this.databaseConnection.connect();
    }

    const repository = new PostgreSQLPlanRepository(this.databaseConnection);
    this.planDayService = new PlanDayService(undefined, this.databaseConnection);
    const settingsRepository = new PostgreSQLSettingsRepository(this.databaseConnection);
    this.settingsService = new SettingsService(settingsRepository);
    this.planService = new PlanService(repository, this.planDayService, this.settingsService);
    await this.planService.initialize();
  }

  public getPlanService(): IPlanService {
    if (!this.planService) {
      throw new Error('PlanService not initialized. Call initialize() first.');
    }
    return this.planService;
  }

  public getPlanDayService(): IPlanDayService {
    if (!this.planDayService) {
      throw new Error('PlanDayService not initialized. Call initialize() first.');
    }
    return this.planDayService;
  }

  public getSettingsService(): ISettingsService {
    if (!this.settingsService) {
      throw new Error('SettingsService not initialized. Call initialize() first.');
    }
    return this.settingsService;
  }

  public async cleanup(): Promise<void> {
    await this.databaseConnection.disconnect();
  }
}

