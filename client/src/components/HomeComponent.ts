import { useViewState } from '../hooks/useViewState.js';
import { usePlan } from '../hooks/usePlan.js';
import { ViewState } from '../models/ViewState.js';
import { getI18n } from '../services/I18nService.js';

export class HomeComponent {
  private viewStateHook: ReturnType<typeof useViewState>;
  private planHook: ReturnType<typeof usePlan>;
  private containerElement: HTMLElement | null = null;
  private isUpdating: boolean = false;
  private lastRenderedHTML: string = '';
  private viewStateListener: (() => void) | null = null;
  private planDataListener: (() => void) | null = null;
  private languageChangeListener: (() => void) | null = null;
  private i18n = getI18n();

  constructor() {
    try {
      this.viewStateHook = useViewState();
      this.planHook = usePlan();
    } catch (error) {
      console.error('HomeComponent: Constructor error:', error);
      throw error;
    }
  }

  public render(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    this.containerElement = container;
    // Flag'i resetle ve HTML'i temizle ki yeniden render edilsin
    this.isUpdating = false;
    this.lastRenderedHTML = '';
    this.updateView();
    this.setupViewStateListener();
  }

  private setupViewStateListener(): void {
    // Önceki listener'ları kaldır
    if (this.viewStateListener) {
      window.removeEventListener('viewStateChanged', this.viewStateListener);
    }
    if (this.planDataListener) {
      window.removeEventListener('planDataChanged', this.planDataListener);
    }
    if (this.languageChangeListener) {
      window.removeEventListener('languageChanged', this.languageChangeListener);
    }
    if (this.languageChangeListener) {
      window.removeEventListener('forceUpdate', this.languageChangeListener);
    }

    // Yeni listener'ları ekle
    this.viewStateListener = () => {
      this.updateView();
    };
    this.planDataListener = () => {
      // Plan data değiştiğinde sadece Home view'deyse update et
      if (this.viewStateHook.currentView === ViewState.Home) {
        this.updateView();
      }
    };
    this.languageChangeListener = () => {
      // Dil değiştiğinde view'ı güncelle
      if (this.viewStateHook.currentView === ViewState.Home) {
        this.lastRenderedHTML = ''; // Force re-render
        this.updateView();
      }
    };

    window.addEventListener('viewStateChanged', this.viewStateListener);
    window.addEventListener('planDataChanged', this.planDataListener);
    window.addEventListener('languageChanged', this.languageChangeListener);
    window.addEventListener('forceUpdate', this.languageChangeListener);
  }

  private async updateView(): Promise<void> {
    if (!this.containerElement) {
      console.error('HomeComponent: containerElement is null');
      return;
    }

    const currentView = this.viewStateHook.currentView;
    
    if (currentView !== ViewState.Home) {
      this.containerElement.style.display = 'none';
      this.isUpdating = false; // View değiştiğinde flag'i resetle
      return;
    }

    // Eğer zaten güncelleniyorsa ve aynı view'daysa skip et
    if (this.isUpdating) {
      return;
    }

    this.containerElement.style.display = 'block';
    this.isUpdating = true;
    
    try {
      const html = await this.generateHTML();
      
      // Container boşsa veya HTML değiştiyse render et
      const containerIsEmpty = !this.containerElement.innerHTML || this.containerElement.innerHTML.trim() === '<div id="home-view"></div>';
      const htmlChanged = html !== this.lastRenderedHTML;
      
      if (containerIsEmpty || htmlChanged) {
        this.containerElement.innerHTML = html;
        this.lastRenderedHTML = html;
        this.attachEventListeners();
      } else {
      }
    } catch (error) {
      console.error('HomeComponent: Error updating view:', error);
      this.containerElement.innerHTML = `
        <div style="padding: 40px; text-align: center; color: white;">
          <h2>${this.i18n.t('home.errorOccurred')}</h2>
          <p>${error instanceof Error ? error.message : this.i18n.t('home.unknownError')}</p>
          <button class="menu-button" onclick="location.reload()">${this.i18n.t('common.reload')}</button>
        </div>
      `;
    } finally {
      this.isUpdating = false;
    }
  }

  private async generateHTML(): Promise<string> {
    try {
      // Refresh'i sadece gerçekten gerekirse çağır
      const { hasActivePlan, activePlan } = this.planHook;
      
      // Eğer plan data yoksa refresh yap
      if (!activePlan && !hasActivePlan) {
        await this.planHook.refresh();
        const refreshed = this.planHook;
        const continueButtonHTML = refreshed.hasActivePlan && refreshed.activePlan
          ? `<button class="menu-button continue-button" data-action="continue">
              Continue to ${refreshed.activePlan.planName} (${refreshed.activePlan.weekName})
            </button>`
          : '';

        const html = `
          <div class="home-container">
            <h1 class="home-title">${this.i18n.t('home.title')}</h1>
            <div class="menu-buttons">
              ${continueButtonHTML}
              <button class="menu-button" data-action="newPlan">
                ${this.i18n.t('home.newPlan')}
              </button>
              <button class="menu-button" data-action="managePlan">
                ${this.i18n.t('home.managePlan')}
              </button>
              <button class="menu-button" data-action="settings">
                ${this.i18n.t('common.settings')}
              </button>
              <button class="menu-button exit-button" data-action="exit">
                ${this.i18n.t('common.exit')}
              </button>
            </div>
          </div>
        `;
        return html;
      }
      
      // Plan data varsa direkt kullan
      const continueButtonHTML = hasActivePlan && activePlan
        ? `<button class="menu-button continue-button" data-action="continue">
            ${this.i18n.t('home.continueTo')} ${activePlan.planName} (${activePlan.weekName})
          </button>`
        : '';

      const html = `
        <div class="home-container">
          <h1 class="home-title">${this.i18n.t('home.title')}</h1>
          <div class="menu-buttons">
            ${continueButtonHTML}
            <button class="menu-button" data-action="newPlan">
              ${this.i18n.t('home.newPlan')}
            </button>
            <button class="menu-button" data-action="managePlan">
              ${this.i18n.t('home.managePlan')}
            </button>
            <button class="menu-button" data-action="settings">
              ${this.i18n.t('common.settings')}
            </button>
            <button class="menu-button exit-button" data-action="exit">
              ${this.i18n.t('common.exit')}
            </button>
          </div>
        </div>
      `;
      return html;
    } catch (error) {
      console.error('HomeComponent: Error generating HTML:', error);
      return `
        <div class="home-container">
          <h1 class="home-title">${this.i18n.t('common.error')}</h1>
          <p style="color: red;">${error instanceof Error ? error.message : this.i18n.t('home.unknownError')}</p>
          <button class="menu-button" onclick="location.reload()">${this.i18n.t('common.reload')}</button>
        </div>
      `;
    }
  }

  private attachEventListeners(): void {
    if (!this.containerElement) {
      return;
    }

    const buttons = this.containerElement.querySelectorAll('.menu-button');
    buttons.forEach((button) => {
      button.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const action = target.getAttribute('data-action');
        this.handleButtonClick(action || '');
      });
    });
  }

  private handleButtonClick(action: string): void {
    switch (action) {
      case 'continue':
        const activePlan = this.planHook.activePlan;
        if (activePlan) {
          this.viewStateHook.navigateToPlanEditor(activePlan.id);
        } else {
          this.viewStateHook.navigateToPlanEditor();
        }
        break;
      case 'newPlan':
        this.viewStateHook.navigateToNewPlan();
        break;
      case 'managePlan':
        this.viewStateHook.navigateToPlanManager();
        break;
      case 'settings':
        this.viewStateHook.navigateToSettings();
        break;
      case 'exit':
        this.handleExit();
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
  }

  private handleExit(): void {
    if (window.electronAPI && (window.electronAPI as { exit?: () => void }).exit) {
      (window.electronAPI as { exit: () => void }).exit();
    } else {
      window.close();
    }
  }
}

