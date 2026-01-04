import { Plan } from '../models/Plan';
import { PlanDay } from '../models/PlanDay';

export interface IPlanService {
  getActivePlan(): Promise<Plan | null>;
  getActivePlans(): Promise<Plan[]>;
  hasActivePlan(): Promise<boolean>;
  getLastOpenedPlan(): Promise<Plan | null>;
  getAllPlans(): Promise<Plan[]>;
  getPlanById(id: string): Promise<Plan | null>;
  createPlan(planName: string, description: string | undefined, year: number, week: number, planDays: PlanDay[]): Promise<Plan>;
  updatePlan(plan: Plan): Promise<Plan>;
  deletePlan(id: string): Promise<void>;
  setPlanActive(id: string): Promise<void>;
  setPlanInactive(id: string): Promise<void>;
  setPlanCompleted(id: string): Promise<void>;
  markPlanOpened(id: string): Promise<void>;
  initialize(): Promise<void>;
}

