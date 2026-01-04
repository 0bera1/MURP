import { PlanDay } from '../models/PlanDay';

export interface IPlanDayRepository {
  getByPlanId(planId: string): Promise<PlanDay[]>;
  create(planDay: PlanDay): Promise<PlanDay>;
  update(planDay: PlanDay): Promise<PlanDay>;
  delete(id: string): Promise<void>;
  deleteByPlanId(planId: string): Promise<void>;
  createAll(planDays: PlanDay[]): Promise<PlanDay[]>;
}

