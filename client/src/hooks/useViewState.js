import { ViewState } from '../models/ViewState';
import { ViewStateManager } from '../managers/ViewStateManager';
let viewStateManagerInstance = null;
function getViewStateManager() {
    if (!viewStateManagerInstance) {
        viewStateManagerInstance = new ViewStateManager();
    }
    return viewStateManagerInstance;
}
export function useViewState() {
    const manager = getViewStateManager();
    const currentView = manager.getCurrentView();
    const setView = (view) => {
        manager.setView(view);
        updateUI();
    };
    const navigateToHome = () => {
        setView(ViewState.Home);
    };
    const navigateToNewPlan = () => {
        setView(ViewState.NewPlan);
    };
    const navigateToPlanManager = () => {
        setView(ViewState.PlanManager);
    };
    const navigateToSettings = () => {
        setView(ViewState.Settings);
    };
    const navigateToPlanEditor = (_planId) => {
        setView(ViewState.PlanEditor);
    };
    const updateUI = () => {
        const newView = manager.getCurrentView();
        const event = new CustomEvent('viewStateChanged', { detail: { view: newView } });
        window.dispatchEvent(event);
    };
    manager.onViewChange((_view) => {
        updateUI();
    });
    return {
        currentView,
        setView,
        navigateToHome,
        navigateToNewPlan,
        navigateToPlanManager,
        navigateToSettings,
        navigateToPlanEditor
    };
}
