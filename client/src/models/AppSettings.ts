export type SupportedLanguage = 'en' | 'tr';

export interface AppSettings {
  maxActivePlans: number;
  isFullScreen: boolean;
  language: SupportedLanguage;
}

export const DEFAULT_SETTINGS: AppSettings = {
  maxActivePlans: 1,
  isFullScreen: false,
  language: 'tr'
};

