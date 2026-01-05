import enTranslations from '../i18n/en.js';
import trTranslations from '../i18n/tr.js';

export type SupportedLanguage = 'en' | 'tr';

interface Translations {
  [key: string]: string | Translations;
}

class I18nService {
  private currentLanguage: SupportedLanguage = 'tr';
  private translations: Record<SupportedLanguage, Translations> = {
    en: enTranslations as Translations,
    tr: trTranslations as Translations
  };

  constructor() {
    this.detectLanguage();
  }

  private detectLanguage(): void {
    // Browser locale'den dil tespiti
    const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'tr';
    const langCode = browserLang.split('-')[0].toLowerCase();
    
    // Desteklenen dillerden biriyse kullan, değilse varsayılan olarak Türkçe
    if (langCode === 'en' || langCode === 'tr') {
      this.currentLanguage = langCode as SupportedLanguage;
    } else {
      this.currentLanguage = 'tr';
    }
  }

  public setLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
    // Dil değiştiğinde event dispatch et
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language } }));
  }

  public getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  public t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    let value: string | Translations | undefined = this.translations[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found
        value = this.translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key; // Return key if translation not found
          }
        }
        break;
      }
    }

    if (typeof value === 'string') {
      // Replace parameters
      if (params) {
        let result = value;
        for (const [paramKey, paramValue] of Object.entries(params)) {
          result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
        }
        return result;
      }
      return value;
    }

    return key;
  }

  public getSupportedLanguages(): Array<{ code: SupportedLanguage; name: string }> {
    return [
      { code: 'tr', name: this.t('settings.turkish') },
      { code: 'en', name: this.t('settings.english') }
    ];
  }
}

// Singleton instance
let i18nInstance: I18nService | null = null;

export function getI18n(): I18nService {
  if (!i18nInstance) {
    i18nInstance = new I18nService();
  }
  return i18nInstance;
}

