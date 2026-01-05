import { contextBridge, ipcRenderer } from 'electron';
import { Plan } from '../models/Plan';
import { PlanDay } from '../models/PlanDay';
import { AppSettings } from '../models/AppSettings';
import { UpdateInfo } from '../services/IAutoUpdateService';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  exit: (): void => {
    ipcRenderer.send('app-exit');
  },
  plan: {
    getAll: (): Promise<Plan[]> => ipcRenderer.invoke('plan:getAll'),
    getById: (id: string): Promise<Plan | null> => ipcRenderer.invoke('plan:getById', id),
    getActive: (): Promise<Plan | null> => ipcRenderer.invoke('plan:getActive'),
    hasActive: (): Promise<boolean> => ipcRenderer.invoke('plan:hasActive'),
    getLastOpened: (): Promise<Plan | null> => ipcRenderer.invoke('plan:getLastOpened'),
    create: (planName: string, description: string | undefined, year: number, week: number, planDays: PlanDay[]): Promise<Plan> => ipcRenderer.invoke('plan:create', planName, description, year, week, planDays),
    update: (plan: Plan): Promise<Plan> => ipcRenderer.invoke('plan:update', plan),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('plan:delete', id),
    setActive: (id: string): Promise<void> => ipcRenderer.invoke('plan:setActive', id),
    setInactive: (id: string): Promise<void> => ipcRenderer.invoke('plan:setInactive', id),
    setCompleted: (id: string): Promise<void> => ipcRenderer.invoke('plan:setCompleted', id),
    markOpened: (id: string): Promise<void> => ipcRenderer.invoke('plan:markOpened', id)
  },
  planDays: {
    getByPlanId: (planId: string): Promise<PlanDay[]> => ipcRenderer.invoke('planDays:getByPlanId', planId),
    update: (planDay: PlanDay): Promise<PlanDay> => ipcRenderer.invoke('planDays:update', planDay),
    updateAll: (planId: string, planDays: PlanDay[]): Promise<void> => ipcRenderer.invoke('planDays:updateAll', planId, planDays)
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    update: (settings: Partial<AppSettings>): Promise<AppSettings> => ipcRenderer.invoke('settings:update', settings),
    getMaxActivePlans: (): Promise<number> => ipcRenderer.invoke('settings:getMaxActivePlans'),
    setMaxActivePlans: (maxActivePlans: number): Promise<void> => ipcRenderer.invoke('settings:setMaxActivePlans', maxActivePlans),
    getIsFullScreen: (): Promise<boolean> => ipcRenderer.invoke('settings:getIsFullScreen'),
    setIsFullScreen: (isFullScreen: boolean): Promise<void> => ipcRenderer.invoke('settings:setIsFullScreen', isFullScreen),
    getLanguage: (): Promise<string> => ipcRenderer.invoke('settings:getLanguage'),
    setLanguage: (language: string): Promise<void> => ipcRenderer.invoke('settings:setLanguage', language)
  },
  window: {
    isFullScreen: (): Promise<boolean> => ipcRenderer.invoke('window:isFullScreen'),
    setFullScreen: (fullScreen: boolean): Promise<void> => ipcRenderer.invoke('window:setFullScreen', fullScreen),
    toggleFullScreen: (): Promise<boolean> => ipcRenderer.invoke('window:toggleFullScreen')
  },
  update: {
    check: (): Promise<UpdateInfo | null> => ipcRenderer.invoke('update:check'),
    download: (): Promise<void> => ipcRenderer.invoke('update:download'),
    install: (): Promise<void> => ipcRenderer.invoke('update:install'),
    getCurrentVersion: (): Promise<string> => ipcRenderer.invoke('update:getCurrentVersion'),
    onUpdateAvailable: (callback: (info: UpdateInfo) => void): void => {
      ipcRenderer.on('update:available', (_event, info: UpdateInfo) => callback(info));
    },
    onUpdateDownloaded: (callback: () => void): void => {
      ipcRenderer.on('update:downloaded', () => callback());
    },
    onUpdateError: (callback: (error: { message: string }) => void): void => {
      ipcRenderer.on('update:error', (_event, error: { message: string }) => callback(error));
    }
  }
});

