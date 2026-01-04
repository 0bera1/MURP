import { useViewState } from '../hooks/useViewState.js';
import { usePlan } from '../hooks/usePlan.js';
import { AppSettings } from '../models/AppSettings.js';

export class SettingsComponent {
  private viewStateHook: ReturnType<typeof useViewState>;
  private planHook: ReturnType<typeof usePlan>;
  private containerElement: HTMLElement | null = null;
  private currentSettings: AppSettings | null = null;
  private isFullScreen: boolean = false;

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
          <h2 class="view-title">Ayarlar</h2>
          <div class="error-message">Ayarlar yüklenirken bir hata oluştu.</div>
          <button type="button" class="menu-button back-button" data-action="back">← Geri</button>
        </div>
      `;
      this.attachBackButton();
    }
  }

  private renderSettings(): void {
    if (!this.containerElement || !this.currentSettings) {
      return;
    }

    this.containerElement.innerHTML = `
      <div class="settings-container">
        <h2 class="view-title">Ayarlar</h2>
        <form class="settings-form" id="settingsForm">
          <div class="settings-group">
            <label for="maxActivePlans" class="settings-label">
              Maksimum Aktif Plan Sayısı:
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
                Aynı anda kaç plan aktif olabilir (1-10 arası)
              </span>
            </div>
          </div>
          <div class="settings-group">
            <label class="settings-label">
              Uygulama Pencere Modu:
            </label>
            <div class="settings-input-group">
              <button type="button" class="settings-toggle-button ${this.isFullScreen ? 'active' : ''}" id="fullScreenToggle">
                <span class="toggle-label">Tam Ekran</span>
                <span class="toggle-switch">
                  <span class="toggle-slider"></span>
                </span>
              </button>
              <span class="settings-description">
                Uygulamayı tam ekran modunda aç/kapat
              </span>
            </div>
          </div>
          <div class="settings-actions">
            <button type="button" class="menu-button back-button" data-action="back">
              ← Geri
            </button>
            <button type="submit" class="menu-button continue-button">
              Kaydet
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

    this.attachBackButton();
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

      this.showMessage(`Tam ekran modu ${newState ? 'açıldı' : 'kapatıldı'}`, 'success');
    } catch (error) {
      console.error('SettingsComponent: Error toggling full screen:', error);
      this.showMessage('Tam ekran modu değiştirilirken bir hata oluştu', 'error');
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
      this.showMessage('Geçerli bir sayı giriniz (1-10 arası)', 'error');
      return;
    }

    // Mevcut aktif plan sayısını kontrol et
    const allPlans = await this.planHook.getAllPlans();
    const activePlans = allPlans.filter(plan => plan.isActive && !plan.isCompleted);
    const currentActiveCount = activePlans.length;

    // Eğer yeni limit mevcut aktif plan sayısından azsa uyar
    if (maxActivePlans < currentActiveCount) {
      const excessCount = currentActiveCount - maxActivePlans;
      const message = `Şu anda ${currentActiveCount} aktif plan var. Limit ${maxActivePlans} olarak ayarlanırsa, ${excessCount} plan pasif duruma getirilmesi gerekecek.\n\nLütfen önce Plan Yönetimi sayfasından ${excessCount} planı pasif duruma getirin, sonra bu ayarı kaydedin.`;
      
      if (!confirm(message)) {
        return;
      }
      
      // Kullanıcı onayladı ama yine de uyar
      this.showMessage(`Lütfen önce ${excessCount} planı pasif duruma getirin, sonra tekrar deneyin.`, 'error');
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
      this.showMessage('Ayarlar başarıyla kaydedildi!', 'success');
      
      // 1 saniye sonra ana sayfaya yönlendir
      setTimeout(() => {
        this.viewStateHook.navigateToHome();
      }, 1000);
    } catch (error) {
      console.error('SettingsComponent: Error saving settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ayarlar kaydedilirken bir hata oluştu';
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

