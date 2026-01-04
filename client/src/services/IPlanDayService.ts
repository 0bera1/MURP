import { PlanDay } from '../models/PlanDay';

export interface IPlanDayService {
  getByPlanId(planId: string): Promise<PlanDay[]>;
  createPlanDay(planDay: PlanDay): Promise<PlanDay>;
  updatePlanDay(planDay: PlanDay): Promise<PlanDay>;
  deletePlanDay(id: string): Promise<void>;
  createPlanDays(planDays: PlanDay[]): Promise<PlanDay[]>;
}

