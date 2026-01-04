import { ViewState } from '../models/ViewState.js';
import { ViewStateManager } from '../managers/ViewStateManager.js';

let viewStateManagerInstance: ViewStateManager | null = null;

function getViewStateManager(): ViewStateManager {
  if (!viewStateManagerInstance) {
    viewStateManagerInstance = new ViewStateManager();
  }
  return viewStateManagerInstance;
}

export function useViewState(): {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  navigateToHome: () => void;
  navigateToNewPlan: () => void;
  navigateToPlanManager: () => void;
  navigateToSettings: () => void;
  navigateToPlanEditor: (planId?: string) => void;
} {
  const manager = getViewStateManager();

  const setView = (view: ViewState): void => {
    manager.setView(view);
    updateUI();
  };

  const navigateToHome = (): void => {
    setView(ViewState.Home);
  };

  const navigateToNewPlan = (): void => {
    setView(ViewState.NewPlan);
  };

  const navigateToPlanManager = (): void => {
    setView(ViewState.PlanManager);
  };

  const navigateToSettings = (): void => {
    setView(ViewState.Settings);
  };

  let currentPlanId: string | undefined = undefined;

  const navigateToPlanEditor = (planId?: string): void => {
    currentPlanId = planId;
    setView(ViewState.PlanEditor);
  };

  const updateUI = (): void => {
    const newView = manager.getCurrentView();
    const event = new CustomEvent('viewStateChanged', { 
      detail: { 
        view: newView,
        planId: newView === ViewState.PlanEditor ? currentPlanId : undefined
      } 
    });
    window.dispatchEvent(event);
    // PlanId'yi sadece PlanEditor için sakla, diğer view'larda temizle
    if (newView !== ViewState.PlanEditor) {
      currentPlanId = undefined;
    }
  };

  manager.onViewChange((_view: ViewState) => {
    updateUI();
  });

  return {
    get currentView(): ViewState {
      return manager.getCurrentView();
    },
    setView,
    navigateToHome,
    navigateToNewPlan,
    navigateToPlanManager,
    navigateToSettings,
    navigateToPlanEditor
  };
}

