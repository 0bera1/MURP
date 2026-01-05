import { AppSettings, SupportedLanguage } from '../models/AppSettings';

export interface ISettingsService {
  getSettings(): Promise<AppSettings>;
  updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
  getMaxActivePlans(): Promise<number>;
  setMaxActivePlans(maxActivePlans: number): Promise<void>;
  getIsFullScreen(): Promise<boolean>;
  setIsFullScreen(isFullScreen: boolean): Promise<void>;
  getLanguage(): Promise<SupportedLanguage>;
  setLanguage(language: SupportedLanguage): Promise<void>;
}

