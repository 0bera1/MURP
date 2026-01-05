import { useViewState } from '../hooks/useViewState.js';
import { usePlan } from '../hooks/usePlan.js';
import { Plan } from '../models/Plan.js';
import { ViewState } from '../models/ViewState.js';
import { getI18n } from '../services/I18nService.js';

export class PlanManagerComponent {
  private viewStateHook: ReturnType<typeof useViewState>;
  private planHook: ReturnType<typeof usePlan>;
  private containerElement: HTMLElement | null = null;
  private languageChangeListener: (() => void) | null = null;
  private i18n = getI18n();

  constructor() {
    this.viewStateHook = useViewState();
    this.planHook = usePlan();
  }

  public render(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    this.containerElement = container;
    this.updateView();
    this.setupViewStateListener();
  }

  private setupViewStateListener(): void {
    // Önceki listener'ları kaldır
    if (this.languageChangeListener) {
      window.removeEventListener('languageChanged', this.languageChangeListener);
      window.removeEventListener('forceUpdate', this.languageChangeListener);
    }

    window.addEventListener('viewStateChanged', () => {
      this.updateView();
    });

    window.addEventListener('planDataChanged', () => {
      this.updateView();
    });

    this.languageChangeListener = () => {
      if (this.viewStateHook.currentView === ViewState.PlanManager) {
        this.updateView();
      }
    };

    window.addEventListener('languageChanged', this.languageChangeListener);
    window.addEventListener('forceUpdate', this.languageChangeListener);
  }

  private async updateView(): Promise<void> {
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

  private async generateHTML(): Promise<string> {
    const plans = await this.planHook.getAllPlans();
    const sortedPlans = [...plans].sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      const aDate = a.lastOpenedAt?.getTime() || 0;
      const bDate = b.lastOpenedAt?.getTime() || 0;
      return bDate - aDate;
    });

    if (sortedPlans.length === 0) {
      return `
        <div class="plan-manager-container">
          <h2 class="view-title">${this.i18n.t('planManager.title')}</h2>
          <div class="empty-state">
            <p>${this.i18n.t('planManager.noPlansCreated')}</p>
            <div class="empty-state-actions">
              <button class="menu-button" data-action="newPlan">
                ${this.i18n.t('planManager.newPlan')}
              </button>
              <button class="menu-button back-button" data-action="back">
                ${this.i18n.t('common.back')}
              </button>
            </div>
          </div>
        </div>
      `;
    }

    const plansHTML = sortedPlans.map((plan) => this.generatePlanCardHTML(plan)).join('');

    return `
      <div class="plan-manager-container">
        <h2 class="view-title">${this.i18n.t('planManager.title')}</h2>
        <div class="plans-list">
          ${plansHTML}
        </div>
        <div class="plan-manager-actions">
          <button class="menu-button" data-action="newPlan">
            ${this.i18n.t('planManager.newPlan')}
          </button>
          <button class="menu-button back-button" data-action="back">
            ${this.i18n.t('common.back')}
          </button>
        </div>
      </div>
    `;
  }

  private generatePlanCardHTML(plan: Plan): string {
    const statusBadge = plan.isCompleted
      ? `<span class="status-badge completed">${this.i18n.t('planManager.status.completed')}</span>`
      : plan.isActive
        ? `<span class="status-badge active">${this.i18n.t('planManager.status.active')}</span>`
        : `<span class="status-badge inactive">${this.i18n.t('planManager.status.inactive')}</span>`;

    const lastOpenedText = plan.lastOpenedAt
      ? `${this.i18n.t('planManager.lastOpenedPrefix')} ${this.formatDate(plan.lastOpenedAt)}`
      : this.i18n.t('planManager.neverOpened');

    return `
      <div class="plan-card" data-plan-id="${plan.id}">
        <div class="plan-card-header">
          <h3 class="plan-card-title">${plan.planName}</h3>
          ${statusBadge}
        </div>
        <div class="plan-card-body">
          <p class="plan-card-info plan-card-week">${plan.weekName}</p>
          ${plan.description ? `<p class="plan-card-description">${plan.description}</p>` : ''}
          <p class="plan-card-info">${this.i18n.t('planManager.createdPrefix')} ${this.formatDate(plan.createdAt)}</p>
          <p class="plan-card-info">${lastOpenedText}</p>
        </div>
        <div class="plan-card-actions">
          ${!plan.isActive && !plan.isCompleted ? `
            <button class="plan-action-button activate" data-action="activate" data-plan-id="${plan.id}">
              ${this.i18n.t('planManager.actions.activate')}
            </button>
          ` : ''}
          ${plan.isActive && !plan.isCompleted ? `
            <button class="plan-action-button edit" data-action="edit" data-plan-id="${plan.id}">
              ${this.i18n.t('planManager.actions.edit')}
            </button>
            <button class="plan-action-button deactivate" data-action="deactivate" data-plan-id="${plan.id}">
              ${this.i18n.t('planManager.actions.deactivate')}
            </button>
            <button class="plan-action-button complete" data-action="complete" data-plan-id="${plan.id}">
              ${this.i18n.t('planManager.actions.complete')}
            </button>
          ` : ''}
          <button class="plan-action-button delete" data-action="delete" data-plan-id="${plan.id}">
            ${this.i18n.t('planManager.actions.delete')}
          </button>
        </div>
      </div>
    `;
  }

  private attachEventListeners(): void {
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
        const target = event.target as HTMLElement;
        const action = target.getAttribute('data-action');
        const planId = target.getAttribute('data-plan-id');

        if (planId) {
          await this.handlePlanAction(action || '', planId);
        }
      });
    });
  }

  private async handlePlanAction(action: string, planId: string): Promise<void> {
    try {
      switch (action) {
        case 'activate':
          await this.handleActivatePlan(planId);
          break;
        case 'edit':
          await this.planHook.markPlanOpened(planId);
          this.viewStateHook.navigateToPlanEditor(planId);
          break;
        case 'deactivate':
          if (confirm(this.i18n.t('planManager.deactivateConfirm'))) {
            await this.planHook.setPlanInactive(planId);
          }
          break;
        case 'complete':
          if (confirm(this.i18n.t('planManager.completeConfirm'))) {
            await this.planHook.setPlanCompleted(planId);
          }
          break;
        case 'delete':
          if (confirm(this.i18n.t('planManager.deleteConfirm'))) {
            await this.planHook.deletePlan(planId);
          }
          break;
        default:
          console.warn(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error(`Error handling plan action ${action}:`, error);
      alert(this.i18n.t('planManager.actionError'));
    }
  }

  private formatDate(date: Date): string {
    const locale = this.i18n.getLanguage() === 'tr' ? 'tr-TR' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private async handleActivatePlan(planId: string): Promise<void> {
    // Aktif plan sayısını kontrol et
    const allPlans = await this.planHook.getAllPlans();
    const activePlans = allPlans.filter(plan => plan.isActive && !plan.isCompleted);

    // Settings'ten maksimum aktif plan sayısını al
    const settingsAPI = (window.electronAPI as {
      settings?: {
        getMaxActivePlans: () => Promise<number>
      }
    }).settings;

    if (!settingsAPI) {
      throw new Error('Settings API not available');
    }

    const maxActivePlans = await settingsAPI.getMaxActivePlans();

    // Limit dolmuşsa modal göster
    if (activePlans.length >= maxActivePlans) {
      const selectedPlanId = await this.showPlanSelectionModal(activePlans, maxActivePlans);

      if (selectedPlanId === null) {
        // Kullanıcı iptal etti
        return;
      }

      // Seçilen planı pasif yap
      await this.planHook.setPlanInactive(selectedPlanId);
    }

    // Yeni planı aktif et
    await this.planHook.setPlanActive(planId);
    await this.planHook.markPlanOpened(planId);
  }

  private showPlanSelectionModal(activePlans: Plan[], maxActivePlans: number): Promise<string | null> {
    return new Promise((resolve) => {
      const modalHTML = `
        <div class="plan-selection-modal-overlay" id="planSelectionModal">
          <div class="plan-selection-modal">
            <div class="plan-selection-modal-header">
              <h3>${this.i18n.t('planManager.activePlanLimitReached')}</h3>
            </div>
            <div class="plan-selection-modal-body">
              <p class="plan-selection-warning">
                ${this.i18n.t('planManager.activePlanLimitMessage', { count: activePlans.length.toString(), limit: maxActivePlans.toString() })}
              </p>
              <p class="plan-selection-instruction">
                ${this.i18n.t('planManager.activePlanLimitInstruction')}
              </p>
              <div class="plan-selection-list">
                ${activePlans.map(plan => `
                  <div class="plan-selection-item" data-plan-id="${plan.id}">
                    <div class="plan-selection-item-info">
                      <strong>${plan.planName}</strong>
                      <span class="plan-selection-item-week">${plan.weekName}</span>
                    </div>
                    <button class="plan-selection-select-btn" data-plan-id="${plan.id}">
                      ${this.i18n.t('planManager.selectThisPlan')}
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="plan-selection-modal-footer">
              <button class="plan-selection-cancel-btn" id="planSelectionCancel">
                ${this.i18n.t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      `;

      // Modal'ı ekle
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = modalHTML;
      const modal = tempDiv.firstElementChild as HTMLElement;
      document.body.appendChild(modal);

      // Event listener'ları ekle
      const selectButtons = modal.querySelectorAll('.plan-selection-select-btn');
      selectButtons.forEach(button => {
        button.addEventListener('click', () => {
          const selectedPlanId = button.getAttribute('data-plan-id');
          if (modal.parentNode) {
            document.body.removeChild(modal);
          }
          resolve(selectedPlanId || null);
        });
      });

      const cancelButton = modal.querySelector('#planSelectionCancel');
      if (cancelButton) {
        cancelButton.addEventListener('click', () => {
          if (modal.parentNode) {
            document.body.removeChild(modal);
          }
          resolve(null);
        });
      }

      // Overlay'e tıklanınca da iptal et
      modal.addEventListener('click', (e) => {
        // Sadece overlay'e (modal'ın kendisine) tıklanınca kapat
        if (e.target === modal) {
          if (modal.parentNode) {
            document.body.removeChild(modal);
          }
          resolve(null);
        }
      });

      // Modal içeriğine tıklanınca kapanmasın
      const modalContent = modal.querySelector('.plan-selection-modal');
      if (modalContent) {
        modalContent.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
    });
  }
}

