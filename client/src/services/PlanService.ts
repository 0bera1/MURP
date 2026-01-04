import { Plan } from '../models/Plan';
import { PlanDay } from '../models/PlanDay';
import { IPlanService } from './IPlanService';
import { IPlanRepository } from '../repositories/IPlanRepository';
import { PlanRepository } from '../repositories/PlanRepository';
import { IPlanDayService } from './IPlanDayService';
import { PlanDayService } from './PlanDayService';
import { ISettingsService } from './ISettingsService';

export class PlanService implements IPlanService {
  private repository: IPlanRepository;
  private planDayService: IPlanDayService;
  private settingsService: ISettingsService | null = null;
  private plans: Plan[] = [];
  private initialized: boolean = false;

  constructor(repository?: IPlanRepository, planDayService?: IPlanDayService, settingsService?: ISettingsService) {
    this.repository = repository || new PlanRepository();
    this.planDayService = planDayService || new PlanDayService();
    this.settingsService = settingsService || null;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.plans = await this.repository.getAll();
    this.initialized = true;
  }

  public async getActivePlan(): Promise<Plan | null> {
    await this.ensureInitialized();
    const activePlans = this.plans.filter((plan) => plan.isActive && !plan.isCompleted);
    // En son açılan aktif planı döndür
    if (activePlans.length > 0) {
      return activePlans.sort((a, b) => {
        const aDate = a.lastOpenedAt?.getTime() || 0;
        const bDate = b.lastOpenedAt?.getTime() || 0;
        return bDate - aDate;
      })[0];
    }
    return null;
  }

  public async getActivePlans(): Promise<Plan[]> {
    await this.ensureInitialized();
    return this.plans.filter((plan) => plan.isActive && !plan.isCompleted);
  }

  public async hasActivePlan(): Promise<boolean> {
    const activePlan = await this.getActivePlan();
    return activePlan !== null;
  }

  public async getLastOpenedPlan(): Promise<Plan | null> {
    await this.ensureInitialized();
    
    if (this.plans.length === 0) {
      return null;
    }

    const sortedPlans = [...this.plans].sort((a, b) => {
      const aDate = a.lastOpenedAt?.getTime() || 0;
      const bDate = b.lastOpenedAt?.getTime() || 0;
      return bDate - aDate;
    });

    return sortedPlans[0] || null;
  }

  public async getAllPlans(): Promise<Plan[]> {
    await this.ensureInitialized();
    return [...this.plans];
  }

  public async getPlanById(id: string): Promise<Plan | null> {
    await this.ensureInitialized();
    return this.plans.find((plan) => plan.id === id) || null;
  }

  public async createPlan(planName: string, description: string | undefined, year: number, week: number, planDays: PlanDay[]): Promise<Plan> {
    await this.ensureInitialized();

    // Plan adının benzersiz olup olmadığını kontrol et
    const existingPlan = await this.repository.getByName(planName);
    if (existingPlan) {
      throw new Error(`Bu plan adı zaten kullanılıyor: "${planName}"`);
    }

    // Aktif plan limitini kontrol et
    const activePlans = await this.getActivePlans();
    const maxActivePlans = this.settingsService ? await this.settingsService.getMaxActivePlans() : 1;
    
    if (activePlans.length >= maxActivePlans) {
      // En eski aktif planı pasif yap
      const oldestActivePlan = activePlans.sort((a, b) => {
        const aDate = a.lastOpenedAt?.getTime() || a.createdAt.getTime();
        const bDate = b.lastOpenedAt?.getTime() || b.createdAt.getTime();
        return aDate - bDate;
      })[0];
      
      if (oldestActivePlan) {
        await this.setPlanInactive(oldestActivePlan.id);
      }
    }

    const weekName = this.generateWeekName(year, week);
    const planId = this.generatePlanId();
    const now = new Date();
    
    const newPlan: Plan = {
      id: planId,
      planName,
      description,
      year,
      week,
      weekName,
      isActive: true,
      isCompleted: false,
      createdAt: now,
      lastOpenedAt: now
    };

    const createdPlan = await this.repository.create(newPlan);
    
    // Plan günlerini oluştur
    if (planDays.length > 0) {
      const planDaysWithPlanId = planDays.map((day) => ({
        ...day,
        planId: planId,
        id: this.generatePlanDayId(),
        createdAt: now,
        updatedAt: now
      }));
      await this.planDayService.createPlanDays(planDaysWithPlanId);
    }
    
    this.plans.push(createdPlan);
    return createdPlan;
  }

  public async updatePlan(plan: Plan): Promise<Plan> {
    await this.ensureInitialized();
    
    // Mevcut planı al
    const existingPlan = await this.getPlanById(plan.id);
    if (!existingPlan) {
      throw new Error(`Plan with id ${plan.id} not found`);
    }

    // Plan adı değiştiyse benzersizlik kontrolü yap
    if (existingPlan.planName !== plan.planName) {
      const planWithSameName = await this.repository.getByName(plan.planName);
      if (planWithSameName && planWithSameName.id !== plan.id) {
        throw new Error(`Bu plan adı zaten kullanılıyor: "${plan.planName}"`);
      }
    }

    const updatedPlan = await this.repository.update(plan);
    
    const index = this.plans.findIndex((p) => p.id === plan.id);
    if (index !== -1) {
      this.plans[index] = updatedPlan;
    }

    return updatedPlan;
  }

  public async deletePlan(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.repository.delete(id);
    this.plans = this.plans.filter((plan) => plan.id !== id);
  }

  public async setPlanActive(id: string): Promise<void> {
    await this.ensureInitialized();
    
    const plan = await this.getPlanById(id);
    if (!plan) {
      throw new Error(`Plan with id ${id} not found`);
    }

    // Eğer plan zaten aktifse, sadece lastOpenedAt'i güncelle
    if (plan.isActive) {
      plan.lastOpenedAt = new Date();
      await this.updatePlan(plan);
      return;
    }

    // Aktif plan limitini kontrol et
    const activePlans = await this.getActivePlans();
    const maxActivePlans = this.settingsService ? await this.settingsService.getMaxActivePlans() : 1;
    
    // Limit dolmuşsa hata fırlat (frontend kontrolü yapacak)
    if (activePlans.length >= maxActivePlans) {
      throw new Error(`Aktif plan limiti dolu. Maksimum ${maxActivePlans} aktif plan olabilir. Lütfen önce bir planı pasif yapın veya Settings'ten limiti artırın.`);
    }

    plan.isActive = true;
    plan.lastOpenedAt = new Date();
    await this.updatePlan(plan);
  }

  public async setPlanCompleted(id: string): Promise<void> {
    await this.ensureInitialized();
    
    const plan = await this.getPlanById(id);
    if (!plan) {
      throw new Error(`Plan with id ${id} not found`);
    }

    plan.isCompleted = true;
    plan.isActive = false;
    await this.updatePlan(plan);
  }

  public async markPlanOpened(id: string): Promise<void> {
    await this.ensureInitialized();
    
    const plan = await this.getPlanById(id);
    if (!plan) {
      throw new Error(`Plan with id ${id} not found`);
    }

    plan.lastOpenedAt = new Date();
    await this.updatePlan(plan);
  }

  public async setPlanInactive(id: string): Promise<void> {
    await this.ensureInitialized();
    
    const plan = await this.getPlanById(id);
    if (!plan) {
      throw new Error(`Plan with id ${id} not found`);
    }

    plan.isActive = false;
    await this.updatePlan(plan);
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private generatePlanId(): string {
    return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWeekName(year: number, week: number): string {
    return `${year} / ${week}. Hafta`;
  }

  private generatePlanDayId(): string {
    return `planday-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

