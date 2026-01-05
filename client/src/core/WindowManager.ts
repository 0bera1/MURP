import { BrowserWindow, globalShortcut } from 'electron';
import * as path from 'path';
import { ISettingsService } from '../services/ISettingsService';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private settingsService: ISettingsService | null = null;

  public setSettingsService(settingsService: ISettingsService): void {
    this.settingsService = settingsService;
  }

  public async createMainWindow(): Promise<BrowserWindow> {
    if (this.mainWindow) {
      return this.mainWindow;
    }

    // Icon dosya yolu - Windows için PNG/ICO, diğer platformlar için SVG
    const iconPath = process.platform === 'win32' 
      ? path.join(__dirname, '../murpIco.png')
      : path.join(__dirname, '../murpicon.svg');

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      frame: true, // Pencere çerçevesi
      autoHideMenuBar: true, // Menü çubuğunu gizle
      icon: iconPath, // App icon
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Her zaman local HTML dosyasını yükle (development server yok)
    const htmlPath = path.join(__dirname, '../renderer/index.html');
    this.mainWindow.loadFile(htmlPath);
    
    // Development modunda DevTools'u aç
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    if (isDev) {
      this.mainWindow.webContents.openDevTools();
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // F11 tuşunu devre dışı bırak
    globalShortcut.register('F11', () => {
      // F11 tuşuna basıldığında hiçbir şey yapma
      return false;
    });

    // Başlangıçta tam ekran ayarını yükle
    if (this.settingsService) {
      try {
        const isFullScreen = await this.settingsService.getIsFullScreen();
        if (isFullScreen) {
          this.mainWindow.setFullScreen(true);
        }
      } catch (error) {
        console.error('Error loading full screen setting:', error);
      }
    }

    return this.mainWindow;
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  public isFullScreen(): boolean {
    return this.mainWindow?.isFullScreen() || false;
  }

  public setFullScreen(fullScreen: boolean): void {
    if (this.mainWindow) {
      this.mainWindow.setFullScreen(fullScreen);
    }
  }

  public toggleFullScreen(): void {
    if (this.mainWindow) {
      this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
    }
  }
}

