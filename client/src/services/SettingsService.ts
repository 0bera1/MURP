import { ISettingsService } from './ISettingsService';
import { ISettingsRepository } from '../repositories/ISettingsRepository';
import { AppSettings, DEFAULT_SETTINGS, SupportedLanguage } from '../models/AppSettings';

export class SettingsService implements ISettingsService {
  private readonly repository: ISettingsRepository;
  private settingsCache: AppSettings | null = null;

  constructor(repository: ISettingsRepository) {
    this.repository = repository;
  }

  public async getSettings(): Promise<AppSettings> {
    if (this.settingsCache) {
      return this.settingsCache;
    }

    try {
      const maxActivePlansStr = await this.repository.get('max_active_plans');
      const maxActivePlans = maxActivePlansStr ? parseInt(maxActivePlansStr, 10) : DEFAULT_SETTINGS.maxActivePlans;
      
      const isFullScreenStr = await this.repository.get('is_full_screen');
      const isFullScreen = isFullScreenStr ? isFullScreenStr === 'true' : DEFAULT_SETTINGS.isFullScreen;

      const languageStr = await this.repository.get('language');
      const language = (languageStr && (languageStr === 'en' || languageStr === 'tr')) 
        ? languageStr as SupportedLanguage 
        : DEFAULT_SETTINGS.language;

      this.settingsCache = {
        maxActivePlans: maxActivePlans || DEFAULT_SETTINGS.maxActivePlans,
        isFullScreen: isFullScreen,
        language: language
      };

      return this.settingsCache;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  public async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    try {
      if (settings.maxActivePlans !== undefined) {
        await this.repository.set('max_active_plans', settings.maxActivePlans.toString());
      }

      if (settings.isFullScreen !== undefined) {
        await this.repository.set('is_full_screen', settings.isFullScreen.toString());
      }

      if (settings.language !== undefined) {
        await this.repository.set('language', settings.language);
      }

      // Cache'i temizle
      this.settingsCache = null;

      return await this.getSettings();
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  public async getMaxActivePlans(): Promise<number> {
    const settings = await this.getSettings();
    return settings.maxActivePlans;
  }

  public async setMaxActivePlans(maxActivePlans: number): Promise<void> {
    if (maxActivePlans < 1) {
      throw new Error('Maksimum aktif plan sayısı en az 1 olmalıdır');
    }
    await this.updateSettings({ maxActivePlans });
  }

  public async getIsFullScreen(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.isFullScreen;
  }

  public async setIsFullScreen(isFullScreen: boolean): Promise<void> {
    await this.updateSettings({ isFullScreen });
  }

  public async getLanguage(): Promise<SupportedLanguage> {
    const settings = await this.getSettings();
    return settings.language;
  }

  public async setLanguage(language: SupportedLanguage): Promise<void> {
    await this.updateSettings({ language });
  }
}

