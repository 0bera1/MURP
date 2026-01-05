import { app, BrowserWindow, ipcMain } from 'electron';
import { WindowManager } from './core/WindowManager';
import { DatabaseConnection } from './database/DatabaseConnection';
import { PlanServiceManager } from './services/PlanServiceManager';
import { AutoUpdateService } from './services/AutoUpdateService';
import { Plan } from './models/Plan';
import { PlanDay } from './models/PlanDay';
import { AppSettings } from './models/AppSettings';
import { UpdateInfo } from './services/IAutoUpdateService';

class MainApplication {
  private windowManager: WindowManager;
  private databaseConnection: DatabaseConnection;
  private planServiceManager: PlanServiceManager;
  private autoUpdateService: AutoUpdateService;

  constructor() {
    this.windowManager = new WindowManager();
    this.databaseConnection = new DatabaseConnection();
    this.planServiceManager = new PlanServiceManager(this.databaseConnection);
    this.autoUpdateService = new AutoUpdateService();
  }

  public async initialize(): Promise<void> {
    await app.whenReady();
    
    try {
      await this.planServiceManager.initialize();
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }

    // SettingsService'i WindowManager'a set et
    this.windowManager.setSettingsService(this.planServiceManager.getSettingsService());

    await this.createMainWindow();
    this.setupApplicationEvents();
    this.setupIPC();
  }

  private async createMainWindow(): Promise<void> {
    await this.windowManager.createMainWindow();
  }

  private setupApplicationEvents(): void {
    app.on('window-all-closed', async () => {
      await this.planServiceManager.cleanup();
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    app.on('before-quit', async () => {
      await this.planServiceManager.cleanup();
    });
  }

  private setupIPC(): void {
    ipcMain.on('app-exit', () => {
      app.quit();
    });

    // Plan CRUD operations
    ipcMain.handle('plan:getAll', async (): Promise<Plan[]> => {
      const planService = this.planServiceManager.getPlanService();
      return await planService.getAllPlans();
    });

    ipcMain.handle('plan:getById', async (_event, id: string): Promise<Plan | null> => {
      const planService = this.planServiceManager.getPlanService();
      return await planService.getPlanById(id);
    });

    ipcMain.handle('plan:getActive', async (): Promise<Plan | null> => {
      const planService = this.planServiceManager.getPlanService();
      return await planService.getActivePlan();
    });

    ipcMain.handle('plan:hasActive', async (): Promise<boolean> => {
      const planService = this.planServiceManager.getPlanService();
      return await planService.hasActivePlan();
    });

    ipcMain.handle('plan:getLastOpened', async (): Promise<Plan | null> => {
      const planService = this.planServiceManager.getPlanService();
      return await planService.getLastOpenedPlan();
    });

    ipcMain.handle('plan:create', async (_event, planName: string, description: string | undefined, year: number, week: number, planDays: PlanDay[]): Promise<Plan> => {
      const planService = this.planServiceManager.getPlanService();
      return await planService.createPlan(planName, description, year, week, planDays);
    });

    ipcMain.handle('plan:update', async (_event, plan: Plan): Promise<Plan> => {
      const planService = this.planServiceManager.getPlanService();
      return await planService.updatePlan(plan);
    });

    ipcMain.handle('plan:delete', async (_event, id: string): Promise<void> => {
      const planService = this.planServiceManager.getPlanService();
      return await planService.deletePlan(id);
    });

    ipcMain.handle('plan:setActive', async (_event, id: string): Promise<void> => {
      const planService = this.planServiceManager.getPlanService();
      return await planService.setPlanActive(id);
    });

    ipcMain.handle('plan:setInactive', async (_event, id: string): Promise<void> => {
      const planService = this.planServiceManager.getPlanService();
      return await planService.setPlanInactive(id);
    });

    ipcMain.handle('plan:setCompleted', async (_event, id: string): Promise<void> => {
      const planService = this.planServiceManager.getPlanService();
      return await planService.setPlanCompleted(id);
    });

    ipcMain.handle('plan:markOpened', async (_event, id: string): Promise<void> => {
      const planService = this.planServiceManager.getPlanService();
      return await planService.markPlanOpened(id);
    });

    // Plan Days operations
    ipcMain.handle('planDays:getByPlanId', async (_event, planId: string): Promise<PlanDay[]> => {
      const planDayService = this.planServiceManager.getPlanDayService();
      return await planDayService.getByPlanId(planId);
    });

    ipcMain.handle('planDays:update', async (_event, planDay: PlanDay): Promise<PlanDay> => {
      const planDayService = this.planServiceManager.getPlanDayService();
      return await planDayService.updatePlanDay(planDay);
    });

    ipcMain.handle('planDays:updateAll', async (_event, planId: string, planDays: PlanDay[]): Promise<void> => {
      const planDayService = this.planServiceManager.getPlanDayService();
      // Mevcut plan günlerini sil ve yenilerini oluştur
      const existingDays = await planDayService.getByPlanId(planId);
      for (const day of existingDays) {
        await planDayService.deletePlanDay(day.id);
      }
      // Yeni günleri oluştur
      for (const day of planDays) {
        day.planId = planId;
        await planDayService.createPlanDay(day);
      }
    });

    // Settings operations
    ipcMain.handle('settings:get', async (): Promise<AppSettings> => {
      const settingsService = this.planServiceManager.getSettingsService();
      return await settingsService.getSettings();
    });

    ipcMain.handle('settings:update', async (_event, settings: Partial<AppSettings>): Promise<AppSettings> => {
      const settingsService = this.planServiceManager.getSettingsService();
      return await settingsService.updateSettings(settings);
    });

    ipcMain.handle('settings:getMaxActivePlans', async (): Promise<number> => {
      const settingsService = this.planServiceManager.getSettingsService();
      return await settingsService.getMaxActivePlans();
    });

    ipcMain.handle('settings:setMaxActivePlans', async (_event, maxActivePlans: number): Promise<void> => {
      const settingsService = this.planServiceManager.getSettingsService();
      return await settingsService.setMaxActivePlans(maxActivePlans);
    });

    // Window operations
    ipcMain.handle('window:isFullScreen', async (): Promise<boolean> => {
      return this.windowManager.isFullScreen();
    });

    ipcMain.handle('window:setFullScreen', async (_event, fullScreen: boolean): Promise<void> => {
      this.windowManager.setFullScreen(fullScreen);
    });

    ipcMain.handle('window:toggleFullScreen', async (): Promise<boolean> => {
      const currentState = this.windowManager.isFullScreen();
      this.windowManager.toggleFullScreen();
      const newState = !currentState;
      
      // Ayarı veritabanına kaydet
      const settingsService = this.planServiceManager.getSettingsService();
      await settingsService.setIsFullScreen(newState);
      
      return newState; // Return new state
    });

    // Settings operations for full screen
    ipcMain.handle('settings:getIsFullScreen', async (): Promise<boolean> => {
      const settingsService = this.planServiceManager.getSettingsService();
      return await settingsService.getIsFullScreen();
    });

    ipcMain.handle('settings:setIsFullScreen', async (_event, isFullScreen: boolean): Promise<void> => {
      const settingsService = this.planServiceManager.getSettingsService();
      await settingsService.setIsFullScreen(isFullScreen);
      // Pencere durumunu da güncelle
      this.windowManager.setFullScreen(isFullScreen);
    });

    ipcMain.handle('settings:getLanguage', async (): Promise<string> => {
      const settingsService = this.planServiceManager.getSettingsService();
      return await settingsService.getLanguage();
    });

    ipcMain.handle('settings:setLanguage', async (_event, language: string): Promise<void> => {
      const settingsService = this.planServiceManager.getSettingsService();
      await settingsService.setLanguage(language as 'en' | 'tr');
    });

    // Update operations
    ipcMain.handle('update:check', async (): Promise<UpdateInfo | null> => {
      try {
        return await this.autoUpdateService.checkForUpdates();
      } catch (error) {
        console.error('Error checking for updates:', error);
        throw error;
      }
    });

    ipcMain.handle('update:download', async (): Promise<void> => {
      try {
        await this.autoUpdateService.downloadUpdate();
      } catch (error) {
        console.error('Error downloading update:', error);
        throw error;
      }
    });

    ipcMain.handle('update:install', async (): Promise<void> => {
      try {
        await this.autoUpdateService.installUpdate();
      } catch (error) {
        console.error('Error installing update:', error);
        throw error;
      }
    });

    ipcMain.handle('update:getCurrentVersion', async (): Promise<string> => {
      return this.autoUpdateService.getCurrentVersion();
    });

    // Update event listeners
    this.autoUpdateService.onUpdateAvailable((info: UpdateInfo) => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('update:available', info);
      }
    });

    this.autoUpdateService.onUpdateDownloaded(() => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('update:downloaded');
      }
    });

    this.autoUpdateService.onUpdateError((error: Error) => {
      const mainWindow = this.windowManager.getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('update:error', { message: error.message });
      }
    });
  }
}

const mainApp = new MainApplication();
mainApp.initialize().catch((error: Error) => {
  console.error('Application initialization failed:', error);
  app.quit();
});

