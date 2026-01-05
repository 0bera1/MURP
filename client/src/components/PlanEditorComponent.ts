import { useViewState } from '../hooks/useViewState.js';
import { usePlan } from '../hooks/usePlan.js';
import { ViewState } from '../models/ViewState.js';
import { Plan } from '../models/Plan.js';
import { PlanDay } from '../models/PlanDay.js';
import { getI18n } from '../services/I18nService.js';

export class PlanEditorComponent {
  private viewStateHook: ReturnType<typeof useViewState>;
  private planHook: ReturnType<typeof usePlan>;
  private containerElement: HTMLElement | null = null;
  private currentPage: number = 1;
  private totalPages: number = 2;
  private currentPlan: Plan | null = null;
  private currentPlanDays: PlanDay[] = [];
  private planId: string | null = null;
  private languageChangeListener: (() => void) | null = null;
  private i18n = getI18n();

  constructor() {
    this.viewStateHook = useViewState();
    this.planHook = usePlan();
  }

  public render(containerId: string, planId?: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    this.containerElement = container;
    // planId parametresi varsa kullan, yoksa mevcut planId'yi koru
    if (planId !== undefined) {
      this.planId = planId || null;
    }
    this.currentPage = 1;
    
    if (this.planId) {
      this.loadPlanData();
    } else if (this.currentPlan) {
      // Plan zaten yüklenmişse formu render et
      this.renderForm();
    } else {
      // PlanId yoksa ve plan da yoksa bekle - event'ten gelecek
    }
    
    this.setupViewStateListener();
  }

  private async loadPlanData(): Promise<void> {
    if (!this.planId) {
      return;
    }

    try {
      this.currentPlan = await this.planHook.getPlanById(this.planId);
      this.currentPlanDays = await this.planHook.getPlanDays(this.planId);
      
      if (!this.currentPlan) {
        this.showError(this.i18n.t('common.error'));
        this.viewStateHook.navigateToHome();
        return;
      }

      this.renderForm();
    } catch (error) {
      console.error('PlanEditorComponent: Error loading plan data:', error);
      this.showError(this.i18n.t('common.error'));
    }
  }

  private setupViewStateListener(): void {
    // Önceki listener'ları kaldır
    if (this.languageChangeListener) {
      window.removeEventListener('languageChanged', this.languageChangeListener);
      window.removeEventListener('forceUpdate', this.languageChangeListener);
    }

    window.addEventListener('viewStateChanged', ((event: CustomEvent<{ view: ViewState; planId?: string }>) => {
      // planId güncellenmişse kaydet, yoksa önceki değeri koru
      if (event.detail.planId !== undefined) {
        this.planId = event.detail.planId;
      }
      // PlanEditor view'ından çıkıldığında planId'yi temizle
      if (event.detail.view !== ViewState.PlanEditor) {
        this.planId = null;
        this.currentPlan = null;
        this.currentPlanDays = [];
      }
      this.updateView();
    }) as EventListener);

    this.languageChangeListener = () => {
      if (this.viewStateHook.currentView === ViewState.PlanEditor && this.currentPlan) {
        this.renderForm();
      }
    };

    window.addEventListener('languageChanged', this.languageChangeListener);
    window.addEventListener('forceUpdate', this.languageChangeListener);
  }

  private updateView(): void {
    if (!this.containerElement) {
      return;
    }

    const currentView = this.viewStateHook.currentView;
    
    if (currentView !== ViewState.PlanEditor) {
      this.containerElement.style.display = 'none';
      return;
    }

    this.containerElement.style.display = 'block';
    
    const existingForm = this.containerElement.querySelector('#planEditorForm');
    if (!existingForm) {
      if (this.currentPlan) {
        this.renderForm();
      } else if (this.planId) {
        // planId varsa verileri yükle
        this.loadPlanData();
      } else {
        // PlanId yoksa ve plan da yüklenmemişse home'a yönlendir
        // Ama önce bir kez daha kontrol et - belki planId henüz gelmedi
        // Kısa bir süre bekle, planId gelebilir
        setTimeout(() => {
          if (!this.planId && !this.currentPlan && this.containerElement) {
            this.viewStateHook.navigateToHome();
          }
        }, 100);
      }
    } else {
      this.updatePageDisplay();
    }
  }

  private renderForm(): void {
    if (!this.containerElement || !this.currentPlan) {
      return;
    }

    this.containerElement.innerHTML = this.generateHTML();
    this.attachEventListeners();
  }

  private generateHTML(): string {
    if (!this.currentPlan) {
      return '<div>Plan yükleniyor...</div>';
    }

    const daysOfWeek = this.getDaysOfWeek();
    const planDaysMap = new Map<number, PlanDay>();
    this.currentPlanDays.forEach(day => {
      planDaysMap.set(day.dayOfWeek, day);
    });

    return `
      <div class="new-plan-container">
        <h2 class="view-title">${this.i18n.t('planEditor.title')}</h2>
        <div class="page-indicator-top">
          <span class="page-number">${this.currentPage}</span>
          <span class="page-separator">/</span>
          <span class="page-total">${this.totalPages}</span>
        </div>
        <form class="new-plan-form" id="planEditorForm">
          <div class="form-pages-wrapper">
            <div class="form-pages">
              ${this.generatePage1()}
              ${this.generatePage2(daysOfWeek, planDaysMap)}
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="menu-button back-button" data-action="back">
              ${this.i18n.t('common.back')}
            </button>
            <button 
              type="submit" 
              class="menu-button continue-button submit-button ${this.currentPage === this.totalPages ? '' : 'hidden'}"
            >
              ${this.i18n.t('planEditor.update')}
            </button>
          </div>
        </form>
        ${this.generateSideNavigationButtons()}
      </div>
    `;
  }

  private generateSideNavigationButtons(): string {
    return `
      <button 
        type="button" 
        class="side-nav-button side-nav-left ${this.currentPage === 1 ? 'disabled' : ''}" 
        ${this.currentPage === 1 ? 'disabled' : ''}
      >
        ←
      </button>
      <button 
        type="button" 
        class="side-nav-button side-nav-right ${this.currentPage === this.totalPages ? 'disabled' : ''}" 
        ${this.currentPage === this.totalPages ? 'disabled' : ''}
      >
        →
      </button>
    `;
  }

  private generatePage1(): string {
    if (!this.currentPlan) {
      return '';
    }

    return `
      <div class="form-page ${this.currentPage === 1 ? 'active' : ''}" data-page="1">
        <div class="form-group">
          <label for="planName">${this.i18n.t('planEditor.planName')}: <span class="required">*</span></label>
          <input 
            type="text" 
            id="planName" 
            name="planName" 
            required
            class="form-input"
            placeholder="${this.i18n.t('planEditor.planNamePlaceholder')}"
            value="${this.escapeHtml(this.currentPlan.planName)}"
          />
        </div>
        <div class="form-group">
          <label for="description">${this.i18n.t('planEditor.description')}:</label>
          <textarea 
            id="description" 
            name="description" 
            class="form-input form-textarea"
            placeholder="${this.i18n.t('planEditor.descriptionPlaceholder')}"
            rows="5"
          >${this.escapeHtml(this.currentPlan.description || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group form-group-half">
            <label for="year">${this.i18n.t('planEditor.year')}:</label>
            <input 
              type="number" 
              id="year" 
              name="year" 
              value="${this.currentPlan.year}" 
              min="2020" 
              max="2100" 
              required
              class="form-input"
            />
          </div>
          <div class="form-group form-group-half">
            <label for="week">${this.i18n.t('planEditor.week')}:</label>
            <input 
              type="number" 
              id="week" 
              name="week" 
              value="${this.currentPlan.week}" 
              min="1" 
              max="53" 
              required
              class="form-input"
            />
          </div>
        </div>
      </div>
    `;
  }

  private generatePage2(daysOfWeek: Array<{ dayOfWeek: number; dayName: string }>, planDaysMap: Map<number, PlanDay>): string {
    return `
      <div class="form-page ${this.currentPage === 2 ? 'active' : ''}" data-page="2">
        <div class="form-group">
          <label class="page-title-label">${this.i18n.t('planEditor.weeklyPlanDays')}</label>
          <div class="plan-days-table-container">
            <table class="plan-days-table">
              <thead>
                <tr>
                  <th>${this.i18n.t('planEditor.day')}</th>
                  <th>${this.i18n.t('planEditor.content')}</th>
                  <th>${this.i18n.t('planEditor.notes')}</th>
                </tr>
              </thead>
              <tbody>
                ${daysOfWeek.map((day, index) => {
                  const planDay = planDaysMap.get(day.dayOfWeek);
                  const parsed = planDay ? this.parseContent(planDay.content) : { mainContent: '', notes: '' };
                  
                  return `
                    <tr>
                      <td class="day-name-cell">
                        <input type="hidden" name="dayOfWeek_${index}" value="${day.dayOfWeek}" />
                        <input type="hidden" name="dayId_${index}" value="${planDay?.id || ''}" />
                        ${day.dayName}
                      </td>
                      <td class="day-content-cell">
                        <textarea 
                          name="dayContent_${index}" 
                          class="day-content-input"
                          placeholder="${day.dayName} ${this.i18n.t('planEditor.dayContentPlaceholder')}"
                          rows="2"
                        >${this.escapeHtml(parsed.mainContent)}</textarea>
                      </td>
                      <td class="day-notes-cell">
                        <textarea 
                          name="dayNotes_${index}" 
                          class="day-content-input"
                          placeholder="${this.i18n.t('planEditor.notesPlaceholder')}"
                          rows="2"
                        >${this.escapeHtml(parsed.notes)}</textarea>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  private parseContent(content: string): { mainContent: string; notes: string } {
    // Hem Türkçe hem İngilizce "Notlar:" / "Notes:" için regex
    const notesPatternTr = /\n\nNotlar:\s*(.+)$/s;
    const notesPatternEn = /\n\nNotes:\s*(.+)$/s;
    const notesMatch = content.match(notesPatternTr) || content.match(notesPatternEn);
    if (notesMatch) {
      const pattern = content.match(notesPatternTr) ? notesPatternTr : notesPatternEn;
      return {
        mainContent: content.replace(pattern, '').trim(),
        notes: notesMatch[1].trim()
      };
    }
    return { mainContent: content, notes: '' };
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private getDaysOfWeek(): Array<{ dayOfWeek: number; dayName: string }> {
    return [
      { dayOfWeek: 1, dayName: this.i18n.t('days.monday') },
      { dayOfWeek: 2, dayName: this.i18n.t('days.tuesday') },
      { dayOfWeek: 3, dayName: this.i18n.t('days.wednesday') },
      { dayOfWeek: 4, dayName: this.i18n.t('days.thursday') },
      { dayOfWeek: 5, dayName: this.i18n.t('days.friday') },
      { dayOfWeek: 6, dayName: this.i18n.t('days.saturday') },
      { dayOfWeek: 0, dayName: this.i18n.t('days.sunday') }
    ];
  }

  private attachEventListeners(): void {
    if (!this.containerElement) {
      return;
    }

    const form = this.containerElement.querySelector('#planEditorForm') as HTMLFormElement;
    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handleFormSubmit(form);
      });
    }

    const backButton = this.containerElement.querySelector('.back-button');
    if (backButton) {
      backButton.addEventListener('click', () => {
        this.viewStateHook.navigateToHome();
      });
    }

    this.attachPageNavigationListeners();
  }

  private attachPageNavigationListeners(): void {
    if (!this.containerElement) {
      return;
    }

    const prevPageButton = this.containerElement.querySelector('.side-nav-left');
    if (prevPageButton) {
      const newPrevButton = prevPageButton.cloneNode(true) as HTMLElement;
      prevPageButton.parentNode?.replaceChild(newPrevButton, prevPageButton);
      newPrevButton.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.updatePageDisplay();
          this.attachPageNavigationListeners();
        }
      });
    }

    const nextPageButton = this.containerElement.querySelector('.side-nav-right');
    if (nextPageButton) {
      const newNextButton = nextPageButton.cloneNode(true) as HTMLElement;
      nextPageButton.parentNode?.replaceChild(newNextButton, nextPageButton);
      newNextButton.addEventListener('click', () => {
        if (this.currentPage < this.totalPages) {
          if (this.currentPage === 1) {
            const planNameInput = this.containerElement?.querySelector('#planName') as HTMLInputElement;
            if (!planNameInput || !planNameInput.value.trim()) {
              this.showError('Plan adı zorunludur');
              return;
            }
          }
          this.currentPage++;
          this.updatePageDisplay();
          this.attachPageNavigationListeners();
        }
      });
    }
  }

  private updatePageDisplay(): void {
    if (!this.containerElement) {
      return;
    }

    const pages = this.containerElement.querySelectorAll('.form-page');
    pages.forEach((page, index) => {
      if (index + 1 === this.currentPage) {
        page.classList.add('active');
      } else {
        page.classList.remove('active');
      }
    });

    const prevButton = this.containerElement.querySelector('.side-nav-left') as HTMLButtonElement;
    const nextButton = this.containerElement.querySelector('.side-nav-right') as HTMLButtonElement;
    const pageNumber = this.containerElement.querySelector('.page-number');
    const submitButton = this.containerElement.querySelector('.submit-button') as HTMLElement;

    if (prevButton) {
      prevButton.disabled = this.currentPage === 1;
      prevButton.classList.toggle('disabled', this.currentPage === 1);
    }

    if (nextButton) {
      nextButton.disabled = this.currentPage === this.totalPages;
      nextButton.classList.toggle('disabled', this.currentPage === this.totalPages);
    }

    if (pageNumber) {
      pageNumber.textContent = this.currentPage.toString();
    }

    if (submitButton) {
      if (this.currentPage === this.totalPages) {
        submitButton.classList.remove('hidden');
      } else {
        submitButton.classList.add('hidden');
      }
    }
  }

  private async handleFormSubmit(form: HTMLFormElement): Promise<void> {
    if (!this.currentPlan) {
      return;
    }

    const formData = new FormData(form);
    const planName = (formData.get('planName') as string)?.trim();
    const description = (formData.get('description') as string)?.trim() || undefined;
    const year = parseInt(formData.get('year') as string, 10);
    const week = parseInt(formData.get('week') as string, 10);

    if (!planName || planName.length === 0) {
      this.showError('Plan adı zorunludur');
      return;
    }

    if (isNaN(year) || isNaN(week) || week < 1 || week > 53) {
      this.showError('Geçerli bir yıl ve hafta numarası giriniz (1-53)');
      return;
    }

    try {
      // Plan'ı güncelle
      const updatedPlan: Plan = {
        ...this.currentPlan,
        planName,
        description,
        year,
        week,
        weekName: `${year} / ${week}. Hafta`
      };

      // Önce başarı mesajını göster (güncelleme sırasında görünür olsun)
      this.showSuccess('Plan güncelleniyor...');
      
      // Plan'ı güncelle (bu refresh() çağırır ve planDataChanged event'ini tetikler)
      await this.planHook.updatePlan(updatedPlan);

      // Plan günlerini güncelle
      const planDays: PlanDay[] = [];
      const daysOfWeek = this.getDaysOfWeek();
      
      daysOfWeek.forEach((day, index) => {
        const dayId = (formData.get(`dayId_${index}`) as string)?.trim() || '';
        const dayContent = (formData.get(`dayContent_${index}`) as string)?.trim() || '';
        const dayNotes = (formData.get(`dayNotes_${index}`) as string)?.trim() || '';
        const notesLabel = this.i18n.getLanguage() === 'tr' ? 'Notlar:' : 'Notes:';
        const fullContent = dayNotes ? `${dayContent}\n\n${notesLabel} ${dayNotes}` : dayContent;
        
        // Mevcut planDay'i bul
        const existingDay = this.currentPlanDays.find(pd => pd.dayOfWeek === day.dayOfWeek);
        
        const planDay: PlanDay = {
          id: dayId || existingDay?.id || this.generatePlanDayId(),
          planId: this.currentPlan!.id,
          dayOfWeek: day.dayOfWeek,
          dayName: day.dayName,
          content: fullContent,
          createdAt: existingDay?.createdAt || new Date(),
          updatedAt: new Date()
        };
        planDays.push(planDay);
      });

      await this.planHook.updatePlanDays(this.currentPlan.id, planDays);
      
      // Başarı mesajını güncelle
      this.showSuccess('Plan başarıyla güncellendi! Ana sayfaya yönlendiriliyorsunuz...');
      
      // Hemen home'a yönlendir (updatePlan zaten refresh() çağırdı)
      setTimeout(() => {
        this.viewStateHook.navigateToHome();
      }, 1000);
    } catch (error) {
      console.error('Error updating plan:', error);
      this.showError(`Plan güncellenirken bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
  }

  private generatePlanDayId(): string {
    return `planday-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private showError(message: string): void {
    if (!this.containerElement) {
      return;
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      background: rgba(220, 53, 69, 0.2);
      border: 2px solid rgba(220, 53, 69, 0.5);
      color: #fff;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
    `;

    const form = this.containerElement.querySelector('#planEditorForm');
    if (form && form.parentNode) {
      form.parentNode.insertBefore(errorDiv, form);
      setTimeout(() => {
        errorDiv.remove();
      }, 5000);
    }
  }

  private showSuccess(message: string): void {
    if (!this.containerElement) {
      return;
    }

    // Önceki mesajları kaldır
    const existingMessages = this.containerElement.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());

    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
      background: rgba(40, 167, 69, 0.2);
      border: 2px solid rgba(40, 167, 69, 0.5);
      color: #fff;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      text-align: center;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 10000;
      min-width: 300px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;

    const form = this.containerElement.querySelector('#planEditorForm');
    if (form && form.parentNode) {
      form.parentNode.insertBefore(successDiv, form);
      setTimeout(() => {
        successDiv.remove();
      }, 3000);
    } else {
      // Form yoksa body'ye ekle
      document.body.appendChild(successDiv);
      setTimeout(() => {
        successDiv.remove();
      }, 3000);
    }
  }
}

