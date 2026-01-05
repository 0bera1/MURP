function getPlanAPI() {
    if (!window.electronAPI || !window.electronAPI.plan) {
        return null;
    }
    return window.electronAPI.plan;
}
function waitForPlanAPI(timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkAPI = () => {
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
export function usePlan() {
    let planAPI = null;
    let activePlan = null;
    let hasActivePlan = false;
    let lastOpenedPlan = null;
    let apiReady = false;
    const ensureAPI = async () => {
        if (planAPI && apiReady) {
            return planAPI;
        }
        planAPI = await waitForPlanAPI();
        apiReady = true;
        return planAPI;
    };
    const refresh = async () => {
        try {
            const api = await ensureAPI();
            activePlan = await api.getActive();
            hasActivePlan = await api.hasActive();
            lastOpenedPlan = await api.getLastOpened();
            notifyPlanChange();
        }
        catch (error) {
            console.error('usePlan: Failed to load plan data:', error);
            // Hata durumunda bile devam et, sadece boş değerlerle
            activePlan = null;
            hasActivePlan = false;
            lastOpenedPlan = null;
        }
    };
    const notifyPlanChange = () => {
        const event = new CustomEvent('planDataChanged');
        window.dispatchEvent(event);
    };
    // API hazır olana kadar bekle, sonra refresh yap
    ensureAPI()
        .then(() => refresh())
        .catch((error) => {
        console.error('Failed to initialize Plan API:', error);
    });
    return {
        get activePlan() {
            return activePlan;
        },
        get hasActivePlan() {
            return hasActivePlan;
        },
        get lastOpenedPlan() {
            return lastOpenedPlan;
        },
        getAllPlans: async () => {
            const api = await ensureAPI();
            return await api.getAll();
        },
        createPlan: async (year, week) => {
            const api = await ensureAPI();
            const plan = await api.create(year, week);
            await refresh();
            return plan;
        },
        updatePlan: async (plan) => {
            const api = await ensureAPI();
            const updatedPlan = await api.update(plan);
            await refresh();
            return updatedPlan;
        },
        deletePlan: async (id) => {
            const api = await ensureAPI();
            await api.delete(id);
            await refresh();
        },
        setPlanActive: async (id) => {
            const api = await ensureAPI();
            await api.setActive(id);
            await refresh();
        },
        setPlanCompleted: async (id) => {
            const api = await ensureAPI();
            await api.setCompleted(id);
            await refresh();
        },
        markPlanOpened: async (id) => {
            const api = await ensureAPI();
            await api.markOpened(id);
            await refresh();
        },
        refresh
    };
}
