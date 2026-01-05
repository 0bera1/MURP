import { useViewState } from '../hooks/useViewState.js';
import { usePlan } from '../hooks/usePlan.js';
import { AppSettings } from '../models/AppSettings.js';
import { getI18n } from '../services/I18nService.js';

export class SettingsComponent {
  private viewStateHook: ReturnType<typeof useViewState>;
  private planHook: ReturnType<typeof usePlan>;
  private containerElement: HTMLElement | null = null;
  private currentSettings: AppSettings | null = null;
  private isFullScreen: boolean = false;
  private i18n = getI18n();

  constructor() {
    this.viewStateHook = useViewState();
    this.planHook = usePlan();
  }

  public render(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`SettingsComponent: Container with id "${containerId}" not found`);
      return;
    }

    this.containerElement = container;
    this.loadAndRenderSettings();
  }

  private async loadAndRenderSettings(): Promise<void> {
    if (!this.containerElement) {
      return;
    }

    try {
      const settingsAPI = (window.electronAPI as { settings?: { get: () => Promise<AppSettings> } }).settings;
      if (!settingsAPI) {
        throw new Error('Settings API not available');
      }

      this.currentSettings = await settingsAPI.get();
      
      // Full screen durumunu settings'ten kontrol et
      const settingsAPIForFullScreen = (window.electronAPI as { settings?: { getIsFullScreen: () => Promise<boolean> } }).settings;
      if (settingsAPIForFullScreen) {
        this.isFullScreen = await settingsAPIForFullScreen.getIsFullScreen();
      }
      this.renderSettings();
      this.attachEventListeners();
    } catch (error) {
      console.error('SettingsComponent: Error loading settings:', error);
      this.containerElement.innerHTML = `
        <div class="settings-container">
          <h2 class="view-title">${this.i18n.t('settings.title')}</h2>
          <div class="error-message">${this.i18n.t('settings.loadError')}</div>
          <button type="button" class="menu-button back-button" data-action="back">${this.i18n.t('common.back')}</button>
        </div>
      `;
      this.attachBackButton();
    }
  }

  private renderSettings(): void {
    if (!this.containerElement || !this.currentSettings) {
      return;
    }

    const languages = this.i18n.getSupportedLanguages();
    const languageOptions = languages.map(lang => 
      `<option value="${lang.code}" ${this.currentSettings!.language === lang.code ? 'selected' : ''}>${lang.name}</option>`
    ).join('');

    this.containerElement.innerHTML = `
      <div class="settings-container">
        <h2 class="view-title">${this.i18n.t('settings.title')}</h2>
        <form class="settings-form" id="settingsForm">
          <div class="settings-group">
            <label for="maxActivePlans" class="settings-label">
              ${this.i18n.t('settings.maxActivePlans')}:
            </label>
            <div class="settings-input-group">
              <input 
                type="number" 
                id="maxActivePlans" 
                name="maxActivePlans" 
                class="settings-input"
                min="1" 
                max="10" 
                step="1"
                value="${this.currentSettings.maxActivePlans}"
                required
                autocomplete="off"
              />
              <span class="settings-description">
                ${this.i18n.t('settings.maxActivePlansDescription')}
              </span>
            </div>
          </div>
          <div class="settings-group">
            <label class="settings-label">
              ${this.i18n.t('settings.windowMode')}:
            </label>
            <div class="settings-input-group">
              <button type="button" class="settings-toggle-button ${this.isFullScreen ? 'active' : ''}" id="fullScreenToggle">
                <span class="toggle-label">${this.i18n.t('settings.fullScreen')}</span>
                <span class="toggle-switch">
                  <span class="toggle-slider"></span>
                </span>
              </button>
              <span class="settings-description">
                ${this.i18n.t('settings.fullScreenDescription')}
              </span>
            </div>
          </div>
          <div class="settings-group">
            <label for="language" class="settings-label">
              ${this.i18n.t('settings.language')}:
            </label>
            <div class="settings-input-group">
              <select 
                id="language" 
                name="language" 
                class="settings-input"
                required
              >
                ${languageOptions}
              </select>
              <span class="settings-description">
                ${this.i18n.t('settings.languageDescription')}
              </span>
            </div>
          </div>
          <div class="settings-actions">
            <button type="button" class="menu-button back-button" data-action="back">
              ${this.i18n.t('common.back')}
            </button>
            <button type="submit" class="menu-button continue-button">
              ${this.i18n.t('common.save')}
            </button>
          </div>
        </form>
        <div id="settingsMessage" class="settings-message hidden"></div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    if (!this.containerElement) {
      return;
    }

    const form = this.containerElement.querySelector('#settingsForm') as HTMLFormElement;
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit(form);
      });
    }

    // Full screen toggle butonu
    const fullScreenToggle = this.containerElement.querySelector('#fullScreenToggle');
    if (fullScreenToggle) {
      fullScreenToggle.addEventListener('click', async () => {
        await this.handleFullScreenToggle();
      });
    }

    // Language select
    const languageSelect = this.containerElement.querySelector('#language') as HTMLSelectElement;
    if (languageSelect) {
      languageSelect.addEventListener('change', async () => {
        await this.handleLanguageChange(languageSelect.value);
      });
    }

    this.attachBackButton();
  }

  private async handleLanguageChange(language: string): Promise<void> {
    try {
      const settingsAPI = (window.electronAPI as { 
        settings?: { 
          setLanguage: (language: string) => Promise<void> 
        } 
      }).settings;

      if (!settingsAPI) {
        throw new Error('Settings API not available');
      }

      await settingsAPI.setLanguage(language);
      this.i18n.setLanguage(language as 'en' | 'tr');
      this.currentSettings = { ...this.currentSettings!, language: language as 'en' | 'tr' };
      
      // Sayfayı yeniden render et
      this.renderSettings();
      this.attachEventListeners();
    } catch (error) {
      console.error('SettingsComponent: Error changing language:', error);
      this.showMessage(this.i18n.t('settings.saveError'), 'error');
    }
  }

  private async handleFullScreenToggle(): Promise<void> {
    try {
      const settingsAPI = (window.electronAPI as { 
        settings?: { 
          setIsFullScreen: (isFullScreen: boolean) => Promise<void> 
        } 
      }).settings;

      if (!settingsAPI) {
        throw new Error('Settings API not available');
      }

      const newState = !this.isFullScreen;
      await settingsAPI.setIsFullScreen(newState);
      this.isFullScreen = newState;

      // Toggle butonunun görünümünü güncelle
      const toggleButton = this.containerElement?.querySelector('#fullScreenToggle');
      if (toggleButton) {
        if (newState) {
          toggleButton.classList.add('active');
        } else {
          toggleButton.classList.remove('active');
        }
      }

      this.showMessage(newState ? this.i18n.t('settings.fullScreenEnabled') : this.i18n.t('settings.fullScreenDisabled'), 'success');
    } catch (error) {
      console.error('SettingsComponent: Error toggling full screen:', error);
      this.showMessage(this.i18n.t('settings.fullScreenToggleError'), 'error');
    }
  }

  private attachBackButton(): void {
    const backButton = this.containerElement?.querySelector('[data-action="back"]');
    if (backButton) {
      backButton.addEventListener('click', () => {
        this.viewStateHook.navigateToHome();
      });
    }
  }

  private async handleFormSubmit(form: HTMLFormElement): Promise<void> {
    if (!this.containerElement) {
      return;
    }

    const formData = new FormData(form);
    const maxActivePlans = parseInt(formData.get('maxActivePlans') as string, 10);

    if (isNaN(maxActivePlans) || maxActivePlans < 1 || maxActivePlans > 10) {
      this.showMessage(this.i18n.t('settings.invalidNumber'), 'error');
      return;
    }

    // Mevcut aktif plan sayısını kontrol et
    const allPlans = await this.planHook.getAllPlans();
    const activePlans = allPlans.filter(plan => plan.isActive && !plan.isCompleted);
    const currentActiveCount = activePlans.length;

    // Eğer yeni limit mevcut aktif plan sayısından azsa uyar
    if (maxActivePlans < currentActiveCount) {
      const excessCount = currentActiveCount - maxActivePlans;
      const message = this.i18n.t('settings.activePlansWarning', { 
        count: currentActiveCount.toString(), 
        limit: maxActivePlans.toString(), 
        excess: excessCount.toString() 
      }) + '\n\n' + this.i18n.t('settings.activePlansWarningAction', { count: excessCount.toString() });
      
      if (!confirm(message)) {
        return;
      }
      
      // Kullanıcı onayladı ama yine de uyar
      this.showMessage(this.i18n.t('settings.activePlansWarningActionShort', { count: excessCount.toString() }), 'error');
      return;
    }

    try {
      const settingsAPI = (window.electronAPI as { 
        settings?: { 
          setMaxActivePlans: (maxActivePlans: number) => Promise<void> 
        } 
      }).settings;
      
      if (!settingsAPI) {
        throw new Error('Settings API not available');
      }

      await settingsAPI.setMaxActivePlans(maxActivePlans);
      this.currentSettings = { ...this.currentSettings!, maxActivePlans };
      this.showMessage(this.i18n.t('settings.saveSuccess'), 'success');
      
      // 1 saniye sonra ana sayfaya yönlendir
      setTimeout(() => {
        this.viewStateHook.navigateToHome();
      }, 1000);
    } catch (error) {
      console.error('SettingsComponent: Error saving settings:', error);
      const errorMessage = error instanceof Error ? error.message : this.i18n.t('settings.saveError');
      this.showMessage(errorMessage, 'error');
    }
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    if (!this.containerElement) {
      return;
    }

    const messageDiv = this.containerElement.querySelector('#settingsMessage') as HTMLElement;
    if (messageDiv) {
      messageDiv.textContent = message;
      messageDiv.className = `settings-message ${type}`;
      messageDiv.classList.remove('hidden');
      
      if (type === 'success') {
        setTimeout(() => {
          messageDiv.classList.add('hidden');
        }, 3000);
      }
    }
  }
}

