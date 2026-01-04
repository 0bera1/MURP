import { useViewState } from '../hooks/useViewState';
import { usePlan } from '../hooks/usePlan';
import { ViewState } from '../models/ViewState';
export class NewPlanComponent {
    constructor() {
        this.containerElement = null;
        this.viewStateHook = useViewState();
        this.planHook = usePlan();
    }
    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }
        this.containerElement = container;
        this.updateView();
        this.setupViewStateListener();
    }
    setupViewStateListener() {
        window.addEventListener('viewStateChanged', () => {
            this.updateView();
        });
    }
    updateView() {
        if (!this.containerElement) {
            return;
        }
        const currentView = this.viewStateHook.currentView;
        if (currentView !== ViewState.NewPlan) {
            this.containerElement.style.display = 'none';
            return;
        }
        this.containerElement.style.display = 'block';
        this.containerElement.innerHTML = this.generateHTML();
        this.attachEventListeners();
    }
    generateHTML() {
        const currentYear = new Date().getFullYear();
        const currentWeek = this.getWeekNumber(new Date());
        return `
      <div class="new-plan-container">
        <h2 class="view-title">Yeni Plan Oluştur</h2>
        <form class="new-plan-form" id="newPlanForm">
          <div class="form-group">
            <label for="year">Yıl:</label>
            <input 
              type="number" 
              id="year" 
              name="year" 
              value="${currentYear}" 
              min="2020" 
              max="2100" 
              required
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label for="week">Hafta:</label>
            <input 
              type="number" 
              id="week" 
              name="week" 
              value="${currentWeek}" 
              min="1" 
              max="53" 
              required
              class="form-input"
            />
          </div>
          <div class="form-actions">
            <button type="submit" class="menu-button continue-button">
              Plan Oluştur
            </button>
            <button type="button" class="menu-button back-button" data-action="back">
              ← Geri
            </button>
          </div>
        </form>
      </div>
    `;
    }
    attachEventListeners() {
        if (!this.containerElement) {
            return;
        }
        const form = this.containerElement.querySelector('#newPlanForm');
        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.handleFormSubmit(form);
            });
        }
        const backButton = this.containerElement.querySelector('.back-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.viewStateHook.navigateToHome();
            });
        }
    }
    async handleFormSubmit(form) {
        const formData = new FormData(form);
        const year = parseInt(formData.get('year'), 10);
        const week = parseInt(formData.get('week'), 10);
        if (isNaN(year) || isNaN(week) || week < 1 || week > 53) {
            this.showError('Geçerli bir yıl ve hafta numarası giriniz (1-53)');
            return;
        }
        try {
            await this.planHook.createPlan(year, week);
            const activePlan = await this.planHook.getAllPlans();
            const createdPlan = activePlan.find((p) => p.year === year && p.week === week);
            if (createdPlan) {
                await this.planHook.markPlanOpened(createdPlan.id);
                this.viewStateHook.navigateToPlanEditor(createdPlan.id);
            }
            else {
                this.viewStateHook.navigateToHome();
            }
        }
        catch (error) {
            console.error('Error creating plan:', error);
            this.showError('Plan oluşturulurken bir hata oluştu');
        }
    }
    showError(message) {
        if (!this.containerElement) {
            return;
        }
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
      background: rgba(220, 53, 69, 0.2);
      border: 2px solid rgba(220, 53, 69, 0.5);
      color: #fff;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    `;
        const form = this.containerElement.querySelector('#newPlanForm');
        if (form && form.parentNode) {
            form.parentNode.insertBefore(errorDiv, form);
            setTimeout(() => {
                errorDiv.remove();
            }, 5000);
        }
    }
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }
}
