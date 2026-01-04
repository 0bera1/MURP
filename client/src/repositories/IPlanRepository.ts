import { Plan } from '../models/Plan';

export interface IPlanRepository {
  getAll(): Promise<Plan[]>;
  getById(id: string): Promise<Plan | null>;
  getByName(planName: string): Promise<Plan | null>;
  create(plan: Plan): Promise<Plan>;
  update(plan: Plan): Promise<Plan>;
  delete(id: string): Promise<void>;
  saveAll(plans: Plan[]): Promise<void>;
}

