import { autoUpdater, UpdateInfo as ElectronUpdateInfo } from 'electron-updater';
import { IAutoUpdateService, UpdateInfo } from './IAutoUpdateService';
import { app } from 'electron';

export class AutoUpdateService implements IAutoUpdateService {
  private updateAvailableCallbacks: Array<(info: UpdateInfo) => void> = [];
  private updateDownloadedCallbacks: Array<() => void> = [];
  private updateErrorCallbacks: Array<(error: Error) => void> = [];

  constructor() {
    // Auto updater yapılandırması
    autoUpdater.autoDownload = false; // Otomatik indirme kapalı, kullanıcı onayı ile
    autoUpdater.autoInstallOnAppQuit = true; // Uygulama kapanırken otomatik kurulum

    // Event listener'ları
    autoUpdater.on('update-available', (info: ElectronUpdateInfo) => {
      const updateInfo: UpdateInfo = {
        version: info.version,
        releaseDate: info.releaseDate ? new Date(info.releaseDate).toISOString() : new Date().toISOString(),
        releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined
      };
      this.updateAvailableCallbacks.forEach((callback) => callback(updateInfo));
    });

    autoUpdater.on('update-downloaded', () => {
      this.updateDownloadedCallbacks.forEach((callback) => callback());
    });

    autoUpdater.on('error', (error: Error) => {
      this.updateErrorCallbacks.forEach((callback) => callback(error));
    });
  }

  public async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      const result = await autoUpdater.checkForUpdates();
      if (result && result.updateInfo) {
        return {
          version: result.updateInfo.version,
          releaseDate: result.updateInfo.releaseDate 
            ? new Date(result.updateInfo.releaseDate).toISOString() 
            : new Date().toISOString(),
          releaseNotes: typeof result.updateInfo.releaseNotes === 'string' 
            ? result.updateInfo.releaseNotes 
            : undefined
        };
      }
      return null;
    } catch (error) {
      console.error('Error checking for updates:', error);
      throw error;
    }
  }

  public async downloadUpdate(): Promise<void> {
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('Error downloading update:', error);
      throw error;
    }
  }

  public async installUpdate(): Promise<void> {
    try {
      autoUpdater.quitAndInstall(false, true);
    } catch (error) {
      console.error('Error installing update:', error);
      throw error;
    }
  }

  public getCurrentVersion(): string {
    return app.getVersion();
  }

  public onUpdateAvailable(callback: (info: UpdateInfo) => void): void {
    this.updateAvailableCallbacks.push(callback);
  }

  public onUpdateDownloaded(callback: () => void): void {
    this.updateDownloadedCallbacks.push(callback);
  }

  public onUpdateError(callback: (error: Error) => void): void {
    this.updateErrorCallbacks.push(callback);
  }
}

