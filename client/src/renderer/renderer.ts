import { ViewContainer } from '../components/ViewContainer.js';
import { PlasmaBackground } from '../components/PlasmaBackground.js';
import { Plan } from '../models/Plan.js';
import { PlanDay } from '../models/PlanDay.js';
import { AppSettings } from '../models/AppSettings.js';

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
}

interface ElectronWindowAPI {
  isFullScreen: () => Promise<boolean>;
  setFullScreen: (fullScreen: boolean) => Promise<void>;
  toggleFullScreen: () => Promise<boolean>;
}

interface ElectronAPI {
  platform: string;
  exit?: () => void;
  plan?: ElectronPlanAPI;
  planDays?: ElectronPlanDaysAPI;
  settings?: ElectronSettingsAPI;
  window?: ElectronWindowAPI;
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
    console.log('RendererApplication: Constructor called');
    try {
      this.viewContainer = new ViewContainer();
      console.log('RendererApplication: ViewContainer created');
      this.plasmaBackground = new PlasmaBackground({
        color: '#ff6b35',
        speed: 0.6,
        direction: 'forward',
        scale: 1.1,
        opacity: 0.8,
        mouseInteractive: true
      });
      console.log('RendererApplication: PlasmaBackground created');
    } catch (error) {
      console.error('RendererApplication: Failed to create components:', error);
      throw error;
    }
  }

  public initialize(): void {
    console.log('RendererApplication: Initialize called');
    console.log('Document ready state:', document.readyState);
    console.log('App container exists:', !!document.getElementById('app-container'));
    console.log('window.electronAPI exists:', !!window.electronAPI);
    
    try {
      // DOM'un hazır olduğundan emin ol
      if (document.readyState === 'loading') {
        console.log('Waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', () => {
          console.log('DOMContentLoaded fired');
          this.viewContainer.initialize();
          this.plasmaBackground.initialize('app-container');
        });
      } else {
        console.log('DOM already ready, initializing immediately');
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

console.log('Renderer script loaded');
const rendererApp = new RendererApplication();
rendererApp.initialize();

