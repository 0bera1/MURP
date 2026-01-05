import { useViewState } from '../hooks/useViewState';
import { usePlan } from '../hooks/usePlan';
import { ViewState } from '../models/ViewState';
export class PlanManagerComponent {
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
        window.addEventListener('planDataChanged', () => {
            this.updateView();
        });
    }
    async updateView() {
        if (!this.containerElement) {
            return;
        }
        const currentView = this.viewStateHook.currentView;
        if (currentView !== ViewState.PlanManager) {
            this.containerElement.style.display = 'none';
            return;
        }
        this.containerElement.style.display = 'block';
        this.containerElement.innerHTML = await this.generateHTML();
        this.attachEventListeners();
    }
    async generateHTML() {
        const plans = await this.planHook.getAllPlans();
        const sortedPlans = [...plans].sort((a, b) => {
            if (a.isActive && !b.isActive)
                return -1;
            if (!a.isActive && b.isActive)
                return 1;
            const aDate = a.lastOpenedAt?.getTime() || 0;
            const bDate = b.lastOpenedAt?.getTime() || 0;
            return bDate - aDate;
        });
        if (sortedPlans.length === 0) {
            return `
        <div class="plan-manager-container">
          <h2 class="view-title">Plan Yönetimi</h2>
          <div class="empty-state">
            <p>Henüz plan oluşturulmamış.</p>
            <div class="empty-state-actions">
              <button class="menu-button" data-action="newPlan">
                Yeni Plan Oluştur
              </button>
              <button class="menu-button back-button" data-action="back">
                ← Geri
              </button>
            </div>
          </div>
        </div>
      `;
        }
        const plansHTML = sortedPlans.map((plan) => this.generatePlanCardHTML(plan)).join('');
        return `
      <div class="plan-manager-container">
        <h2 class="view-title">Plan Yönetimi</h2>
        <div class="plans-list">
          ${plansHTML}
        </div>
        <div class="plan-manager-actions">
          <button class="menu-button" data-action="newPlan">
            + Yeni Plan Oluştur
          </button>
          <button class="menu-button back-button" data-action="back">
            ← Geri
          </button>
        </div>
      </div>
    `;
    }
    generatePlanCardHTML(plan) {
        const statusBadge = plan.isCompleted
            ? '<span class="status-badge completed">Tamamlandı</span>'
            : plan.isActive
                ? '<span class="status-badge active">Aktif</span>'
                : '<span class="status-badge inactive">Pasif</span>';
        const lastOpenedText = plan.lastOpenedAt
            ? `Son açılış: ${this.formatDate(plan.lastOpenedAt)}`
            : 'Henüz açılmadı';
        return `
      <div class="plan-card" data-plan-id="${plan.id}">
        <div class="plan-card-header">
          <h3 class="plan-card-title">${plan.weekName}</h3>
          ${statusBadge}
        </div>
        <div class="plan-card-body">
          <p class="plan-card-info">Oluşturulma: ${this.formatDate(plan.createdAt)}</p>
          <p class="plan-card-info">${lastOpenedText}</p>
        </div>
        <div class="plan-card-actions">
          ${!plan.isActive && !plan.isCompleted ? `
            <button class="plan-action-button activate" data-action="activate" data-plan-id="${plan.id}">
              Aktif Et
            </button>
          ` : ''}
          ${plan.isActive && !plan.isCompleted ? `
            <button class="plan-action-button edit" data-action="edit" data-plan-id="${plan.id}">
              Düzenle
            </button>
            <button class="plan-action-button complete" data-action="complete" data-plan-id="${plan.id}">
              Tamamla
            </button>
          ` : ''}
          <button class="plan-action-button delete" data-action="delete" data-plan-id="${plan.id}">
            Sil
          </button>
        </div>
      </div>
    `;
    }
    attachEventListeners() {
        if (!this.containerElement) {
            return;
        }
        const backButton = this.containerElement.querySelector('.back-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.viewStateHook.navigateToHome();
            });
        }
        const newPlanButton = this.containerElement.querySelector('[data-action="newPlan"]');
        if (newPlanButton) {
            newPlanButton.addEventListener('click', () => {
                this.viewStateHook.navigateToNewPlan();
            });
        }
        const actionButtons = this.containerElement.querySelectorAll('.plan-action-button');
        actionButtons.forEach((button) => {
            button.addEventListener('click', async (event) => {
                const target = event.target;
                const action = target.getAttribute('data-action');
                const planId = target.getAttribute('data-plan-id');
                if (planId) {
                    await this.handlePlanAction(action || '', planId);
                }
            });
        });
    }
    async handlePlanAction(action, planId) {
        try {
            switch (action) {
                case 'activate':
                    await this.planHook.setPlanActive(planId);
                    await this.planHook.markPlanOpened(planId);
                    break;
                case 'edit':
                    await this.planHook.markPlanOpened(planId);
                    this.viewStateHook.navigateToPlanEditor(planId);
                    break;
                case 'complete':
                    if (confirm('Bu planı tamamlandı olarak işaretlemek istediğinize emin misiniz?')) {
                        await this.planHook.setPlanCompleted(planId);
                    }
                    break;
                case 'delete':
                    if (confirm('Bu planı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
                        await this.planHook.deletePlan(planId);
                    }
                    break;
                default:
                    console.warn(`Unknown action: ${action}`);
            }
        }
        catch (error) {
            console.error(`Error handling plan action ${action}:`, error);
            alert('İşlem sırasında bir hata oluştu');
        }
    }
    formatDate(date) {
        return new Intl.DateTimeFormat('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }
}
