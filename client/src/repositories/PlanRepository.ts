import { Plan } from '../models/Plan';
import { IPlanRepository } from './IPlanRepository';

export class PlanRepository implements IPlanRepository {
  private readonly storageKey: string = 'manage-ur-plan-plans';

  public async getAll(): Promise<Plan[]> {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        return [];
      }

      const plans = JSON.parse(data) as Record<string, unknown>[];
      return plans.map((plan) => this.deserializePlan(plan));
    } catch (error) {
      console.error('Error loading plans from storage:', error);
      return [];
    }
  }

  public async getById(id: string): Promise<Plan | null> {
    const plans = await this.getAll();
    return plans.find((plan) => plan.id === id) || null;
  }

  public async getByName(planName: string): Promise<Plan | null> {
    const plans = await this.getAll();
    return plans.find((plan) => plan.planName === planName) || null;
  }

  public async create(plan: Plan): Promise<Plan> {
    const plans = await this.getAll();
    plans.push(plan);
    await this.saveAll(plans);
    return plan;
  }

  public async update(plan: Plan): Promise<Plan> {
    const plans = await this.getAll();
    const index = plans.findIndex((p) => p.id === plan.id);
    
    if (index === -1) {
      throw new Error(`Plan with id ${plan.id} not found`);
    }

    plans[index] = plan;
    await this.saveAll(plans);
    return plan;
  }

  public async delete(id: string): Promise<void> {
    const plans = await this.getAll();
    const filteredPlans = plans.filter((plan) => plan.id !== id);
    await this.saveAll(filteredPlans);
  }

  public async saveAll(plans: Plan[]): Promise<void> {
    try {
      const serializedPlans = plans.map((plan) => this.serializePlan(plan));
      localStorage.setItem(this.storageKey, JSON.stringify(serializedPlans));
    } catch (error) {
      console.error('Error saving plans to storage:', error);
      throw error;
    }
  }

  private serializePlan(plan: Plan): Record<string, unknown> {
    return {
      ...plan,
      createdAt: plan.createdAt.toISOString(),
      lastOpenedAt: plan.lastOpenedAt?.toISOString() || null
    };
  }

  private deserializePlan(planData: Record<string, unknown>): Plan {
    return {
      ...planData,
      createdAt: new Date(planData.createdAt as string),
      lastOpenedAt: planData.lastOpenedAt ? new Date(planData.lastOpenedAt as string) : undefined
    } as Plan;
  }
}

