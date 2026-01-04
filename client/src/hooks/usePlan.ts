import { Plan } from '../models/Plan.js';
import { PlanDay } from '../models/PlanDay.js';

interface ElectronPlanAPI {
  getAll: () => Promise<Plan[]>;
  getById: (id: string) => Promise<Plan | null>;
  getActive: () => Promise<Plan | null>;
  hasActive: () => Promise<boolean>;
  getLastOpened: () => Promise<Plan | null>;
  create: (planName: string, description: string | undefined, year: number, week: number, planDays: PlanDay[]) => Promise<Plan>;
  update: (plan: Plan) => Promise<Plan>;
  delete: (id: string) => Promise<void>;
  setActive: (id: string) => Promise<void>;
  setInactive: (id: string) => Promise<void>;
  setCompleted: (id: string) => Promise<void>;
  markOpened: (id: string) => Promise<void>;
}

function getPlanAPI(): ElectronPlanAPI | null {
  if (!window.electronAPI || !(window.electronAPI as { plan?: ElectronPlanAPI }).plan) {
    return null;
  }
  return (window.electronAPI as { plan: ElectronPlanAPI }).plan;
}

function waitForPlanAPI(timeout: number = 5000): Promise<ElectronPlanAPI> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkAPI = (): void => {
      const api = getPlanAPI();
      if (api) {
        resolve(api);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error('Plan API not available after timeout'));
        return;
      }
      
      setTimeout(checkAPI, 100);
    };
    
    checkAPI();
  });
}

export function usePlan(): {
  activePlan: Plan | null;
  hasActivePlan: boolean;
  lastOpenedPlan: Plan | null;
  getAllPlans: () => Promise<Plan[]>;
  getPlanById: (id: string) => Promise<Plan | null>;
  createPlan: (planName: string, description: string | undefined, year: number, week: number, planDays: PlanDay[]) => Promise<Plan>;
  updatePlan: (plan: Plan) => Promise<Plan>;
  deletePlan: (id: string) => Promise<void>;
  setPlanActive: (id: string) => Promise<void>;
  setPlanInactive: (id: string) => Promise<void>;
  setPlanCompleted: (id: string) => Promise<void>;
  markPlanOpened: (id: string) => Promise<void>;
  getPlanDays: (planId: string) => Promise<PlanDay[]>;
  updatePlanDays: (planId: string, planDays: PlanDay[]) => Promise<void>;
  refresh: () => Promise<void>;
} {
  let planAPI: ElectronPlanAPI | null = null;
  let activePlan: Plan | null = null;
  let hasActivePlan: boolean = false;
  let lastOpenedPlan: Plan | null = null;
  let apiReady: boolean = false;

  const ensureAPI = async (): Promise<ElectronPlanAPI> => {
    if (planAPI && apiReady) {
      return planAPI;
    }
    
    planAPI = await waitForPlanAPI();
    apiReady = true;
    return planAPI;
  };

  let lastActivePlanId: string | null = null;
  let lastHasActivePlan: boolean = false;

  const refresh = async (): Promise<void> => {
    try {
      console.log('usePlan: refresh called');
      const api = await ensureAPI();
      console.log('usePlan: API ensured');
      const newActivePlan = await api.getActive();
      console.log('usePlan: activePlan loaded:', newActivePlan);
      const newHasActivePlan = await api.hasActive();
      console.log('usePlan: hasActivePlan:', newHasActivePlan);
      const newLastOpenedPlan = await api.getLastOpened();
      console.log('usePlan: lastOpenedPlan loaded:', newLastOpenedPlan);
      
      // Sadece değişiklik varsa notify et
      const activePlanChanged = (newActivePlan?.id || null) !== lastActivePlanId;
      const hasActivePlanChanged = newHasActivePlan !== lastHasActivePlan;
      
      activePlan = newActivePlan;
      hasActivePlan = newHasActivePlan;
      lastOpenedPlan = newLastOpenedPlan;
      
      if (activePlanChanged || hasActivePlanChanged) {
        lastActivePlanId = newActivePlan?.id || null;
        lastHasActivePlan = newHasActivePlan;
        notifyPlanChange();
      }
    } catch (error) {
      console.error('usePlan: Failed to load plan data:', error);
      // Hata durumunda bile devam et, sadece boş değerlerle
      activePlan = null;
      hasActivePlan = false;
      lastOpenedPlan = null;
    }
  };

  const notifyPlanChange = (): void => {
    const event = new CustomEvent('planDataChanged');
    window.dispatchEvent(event);
  };

  // API hazır olana kadar bekle, sonra refresh yap
  ensureAPI()
    .then(() => refresh())
    .catch((error: Error) => {
      console.error('Failed to initialize Plan API:', error);
    });

  return {
    get activePlan(): Plan | null {
      return activePlan;
    },
    get hasActivePlan(): boolean {
      return hasActivePlan;
    },
    get lastOpenedPlan(): Plan | null {
      return lastOpenedPlan;
    },
    getAllPlans: async (): Promise<Plan[]> => {
      const api = await ensureAPI();
      return await api.getAll();
    },
    createPlan: async (planName: string, description: string | undefined, year: number, week: number, planDays: PlanDay[]): Promise<Plan> => {
      const api = await ensureAPI();
      const plan = await api.create(planName, description, year, week, planDays);
      await refresh();
      return plan;
    },
    updatePlan: async (plan: Plan): Promise<Plan> => {
      const api = await ensureAPI();
      const updatedPlan = await api.update(plan);
      await refresh();
      return updatedPlan;
    },
    deletePlan: async (id: string): Promise<void> => {
      const api = await ensureAPI();
      await api.delete(id);
      await refresh();
    },
    setPlanActive: async (id: string): Promise<void> => {
      const api = await ensureAPI();
      await api.setActive(id);
      await refresh();
    },
    setPlanInactive: async (id: string): Promise<void> => {
      const api = await ensureAPI();
      await api.setInactive(id);
      await refresh();
    },
    setPlanCompleted: async (id: string): Promise<void> => {
      const api = await ensureAPI();
      await api.setCompleted(id);
      await refresh();
    },
    markPlanOpened: async (id: string): Promise<void> => {
      const api = await ensureAPI();
      await api.markOpened(id);
      await refresh();
    },
    getPlanById: async (id: string): Promise<Plan | null> => {
      const api = await ensureAPI();
      return await api.getById(id);
    },
    getPlanDays: async (planId: string): Promise<PlanDay[]> => {
      const planDaysAPI = (window.electronAPI as { planDays?: { getByPlanId: (planId: string) => Promise<PlanDay[]> } }).planDays;
      if (!planDaysAPI) {
        throw new Error('PlanDays API not available');
      }
      return await planDaysAPI.getByPlanId(planId);
    },
    updatePlanDays: async (planId: string, planDays: PlanDay[]): Promise<void> => {
      const planDaysAPI = (window.electronAPI as { planDays?: { updateAll: (planId: string, planDays: PlanDay[]) => Promise<void> } }).planDays;
      if (!planDaysAPI) {
        throw new Error('PlanDays API not available');
      }
      return await planDaysAPI.updateAll(planId, planDays);
    },
    refresh
  };
}

