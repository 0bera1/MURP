import { ViewContainer } from '../components/ViewContainer.js';
import { PlasmaBackground } from '../components/PlasmaBackground.js';
import { Plan } from '../models/Plan.js';
import { PlanDay } from '../models/PlanDay.js';
import { AppSettings } from '../models/AppSettings.js';
import { getI18n } from '../services/I18nService.js';

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

interface ElectronPlanDaysAPI {
  getByPlanId: (planId: string) => Promise<PlanDay[]>;
  update: (planDay: PlanDay) => Promise<PlanDay>;
  updateAll: (planId: string, planDays: PlanDay[]) => Promise<void>;
}

interface ElectronSettingsAPI {
  get: () => Promise<AppSettings>;
  update: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  getMaxActivePlans: () => Promise<number>;
  setMaxActivePlans: (maxActivePlans: number) => Promise<void>;
  getIsFullScreen: () => Promise<boolean>;
  setIsFullScreen: (isFullScreen: boolean) => Promise<void>;
  getLanguage: () => Promise<string>;
  setLanguage: (language: string) => Promise<void>;
}

interface ElectronWindowAPI {
  isFullScreen: () => Promise<boolean>;
  setFullScreen: (fullScreen: boolean) => Promise<void>;
  toggleFullScreen: () => Promise<boolean>;
}

interface ElectronUpdateAPI {
  check: () => Promise<{ version: string; releaseDate: string; releaseNotes?: string } | null>;
  download: () => Promise<void>;
  install: () => Promise<void>;
  getCurrentVersion: () => Promise<string>;
  onUpdateAvailable: (callback: (info: { version: string; releaseDate: string; releaseNotes?: string }) => void) => void;
  onUpdateDownloaded: (callback: () => void) => void;
  onUpdateError: (callback: (error: { message: string }) => void) => void;
}

interface ElectronAPI {
  platform: string;
  exit?: () => void;
  plan?: ElectronPlanAPI;
  planDays?: ElectronPlanDaysAPI;
  settings?: ElectronSettingsAPI;
  window?: ElectronWindowAPI;
  update?: ElectronUpdateAPI;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

class RendererApplication {
  private viewContainer: ViewContainer;
  private plasmaBackground: PlasmaBackground;

  constructor() {
    try {
      this.viewContainer = new ViewContainer();
      this.plasmaBackground = new PlasmaBackground({
        color: '#ff6b35',
        speed: 0.6,
        direction: 'forward',
        scale: 1.1,
        opacity: 0.8,
        mouseInteractive: true
      });
    } catch (error) {
      console.error('RendererApplication: Failed to create components:', error);
      throw error;
    }
  }

  public async initialize(): Promise<void> {
    try {
      // İlk olarak dil ayarını yükle ve i18n'i initialize et
      if (window.electronAPI?.settings) {
        try {
          const language = await window.electronAPI.settings.getLanguage();
          const i18n = getI18n();
          i18n.setLanguage(language as 'en' | 'tr');
        } catch (error) {
          console.error('Failed to load language setting:', error);
        }
      }

      // Dil değişikliği event listener'ı
      window.addEventListener('languageChanged', () => {
        // Sayfayı yenile veya component'leri yeniden render et
        const container = document.getElementById('app-container');
        if (container) {
          const event = new CustomEvent('forceUpdate');
          window.dispatchEvent(event);
        }
      });

      // DOM'un hazır olduğundan emin ol
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.viewContainer.initialize();
          this.plasmaBackground.initialize('app-container');
        });
      } else {
        // ViewContainer'ı önce initialize et, sonra background'ı
        this.viewContainer.initialize();
        // Background'ı initialize et
        this.plasmaBackground.initialize('app-container');
      }
    } catch (error) {
      console.error('Failed to initialize renderer application:', error);
      // Hata durumunda bile bir şeyler göster
      const container = document.getElementById('app-container');
      if (container) {
        container.innerHTML = `
          <div style="padding: 40px; text-align: center; color: white;">
            <h2>Uygulama başlatılamadı</h2>
            <p>Lütfen konsolu kontrol edin.</p>
            <p style="font-size: 0.9em; opacity: 0.8;">${error instanceof Error ? error.message : 'Bilinmeyen hata'}</p>
            <pre style="text-align: left; background: rgba(0,0,0,0.3); padding: 20px; margin-top: 20px; border-radius: 8px;">${error instanceof Error ? error.stack : String(error)}</pre>
          </div>
        `;
      } else {
        console.error('app-container element not found!');
        document.body.innerHTML = `
          <div style="padding: 40px; text-align: center; color: white;">
            <h2>Kritik Hata</h2>
            <p>app-container elementi bulunamadı!</p>
          </div>
        `;
      }
    }
  }
}

const rendererApp = new RendererApplication();
rendererApp.initialize().catch((error) => {
  console.error('Failed to initialize renderer:', error);
});

