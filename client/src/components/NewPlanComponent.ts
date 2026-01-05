import { useViewState } from '../hooks/useViewState.js';
import { usePlan } from '../hooks/usePlan.js';
import { ViewState } from '../models/ViewState.js';
import { PlanDay } from '../models/PlanDay.js';
import { getI18n } from '../services/I18nService.js';

export class NewPlanComponent {
  private viewStateHook: ReturnType<typeof useViewState>;
  private planHook: ReturnType<typeof usePlan>;
  private containerElement: HTMLElement | null = null;
  private currentPage: number = 1;
  private totalPages: number = 2;
  private languageChangeListener: (() => void) | null = null;
  private i18n = getI18n();

  constructor() {
    this.viewStateHook = useViewState();
    this.planHook = usePlan();
  }

  public render(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    this.containerElement = container;
    this.currentPage = 1; // Reset to first page when rendering
    this.containerElement.style.display = 'block';
    this.containerElement.innerHTML = this.generateHTML();
    this.attachEventListeners();
    this.setupViewStateListener();
  }

  private setupViewStateListener(): void {
    // Önceki listener'ları kaldır
    if (this.languageChangeListener) {
      window.removeEventListener('languageChanged', this.languageChangeListener);
      window.removeEventListener('forceUpdate', this.languageChangeListener);
    }

    window.addEventListener('viewStateChanged', () => {
      this.updateView();
    });

    this.languageChangeListener = () => {
      if (this.viewStateHook.currentView === ViewState.NewPlan) {
        this.containerElement!.innerHTML = this.generateHTML();
        this.attachEventListeners();
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
    
    if (currentView !== ViewState.NewPlan) {
      this.containerElement.style.display = 'none';
      return;
    }

    this.containerElement.style.display = 'block';
    
    // Sadece sayfa değiştiyse HTML'i yeniden oluştur
    const existingForm = this.containerElement.querySelector('#newPlanForm');
    if (!existingForm) {
      this.containerElement.innerHTML = this.generateHTML();
      this.attachEventListeners();
    } else {
      // Sayfa değişikliği için sadece aktif sayfayı güncelle
      this.updatePageDisplay();
      // Event listener'ları tekrar ekle (sayfa geçişlerinde)
      this.attachPageNavigationListeners();
    }
  }

  private attachPageNavigationListeners(): void {
    if (!this.containerElement) {
      return;
    }

    // Önceki listener'ları kaldır ve yeni ekle
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
          // Sayfa 1'den 2'ye geçerken validasyon yap
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

    // Tüm sayfaları güncelle
    const pages = this.containerElement.querySelectorAll('.form-page');
    pages.forEach((page, index) => {
      if (index + 1 === this.currentPage) {
        page.classList.add('active');
      } else {
        page.classList.remove('active');
      }
    });

    // Yan navigasyon butonlarını güncelle
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

    // Son sayfada Kaydet butonunu göster
    if (submitButton) {
      if (this.currentPage === this.totalPages) {
        submitButton.classList.remove('hidden');
      } else {
        submitButton.classList.add('hidden');
      }
    }
  }

  private generateHTML(): string {
    const currentYear = new Date().getFullYear();
    const currentWeek = this.getWeekNumber(new Date());
    const daysOfWeek = this.getDaysOfWeek();

    return `
      <div class="new-plan-container">
        <h2 class="view-title">${this.i18n.t('newPlan.title')}</h2>
        <div class="page-indicator-top">
          <span class="page-number">${this.currentPage}</span>
          <span class="page-separator">/</span>
          <span class="page-total">${this.totalPages}</span>
        </div>
        <form class="new-plan-form" id="newPlanForm">
          <div class="form-pages-wrapper">
            <div class="form-pages">
              ${this.generatePage1(currentYear, currentWeek)}
              ${this.generatePage2(daysOfWeek)}
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
              ${this.i18n.t('common.save')}
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

  private generatePage1(currentYear: number, currentWeek: number): string {
    return `
      <div class="form-page ${this.currentPage === 1 ? 'active' : ''}" data-page="1">
        <div class="form-group">
          <label for="planName">${this.i18n.t('newPlan.planName')}: <span class="required">*</span></label>
          <input 
            type="text" 
            id="planName" 
            name="planName" 
            required
            class="form-input"
            placeholder="${this.i18n.t('newPlan.planNamePlaceholder')}"
          />
        </div>
        <div class="form-group">
          <label for="description">${this.i18n.t('newPlan.description')}:</label>
          <textarea 
            id="description" 
            name="description" 
            class="form-input form-textarea"
            placeholder="${this.i18n.t('newPlan.descriptionPlaceholder')}"
            rows="5"
          ></textarea>
        </div>
        <div class="form-row">
          <div class="form-group form-group-half">
            <label for="year">${this.i18n.t('newPlan.year')}:</label>
            <input 
              type="number" 
              id="year" 
              name="year" 
              value="${currentYear}" 
              min="2020" 
              max="2100" 
              required
              class="form-input"
            />
          </div>
          <div class="form-group form-group-half">
            <label for="week">${this.i18n.t('newPlan.week')}:</label>
            <input 
              type="number" 
              id="week" 
              name="week" 
              value="${currentWeek}" 
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

  private generatePage2(daysOfWeek: Array<{ dayOfWeek: number; dayName: string }>): string {
    return `
      <div class="form-page ${this.currentPage === 2 ? 'active' : ''}" data-page="2">
        <div class="form-group">
          <label class="page-title-label">${this.i18n.t('newPlan.weeklyPlanDays')}</label>
          <div class="plan-days-table-container">
            <table class="plan-days-table">
              <thead>
                <tr>
                  <th>${this.i18n.t('newPlan.day')}</th>
                  <th>${this.i18n.t('newPlan.content')}</th>
                  <th>${this.i18n.t('newPlan.notes')}</th>
                </tr>
              </thead>
              <tbody>
                ${daysOfWeek.map((day, index) => `
                  <tr>
                    <td class="day-name-cell">
                      <input type="hidden" name="dayOfWeek_${index}" value="${day.dayOfWeek}" />
                      ${day.dayName}
                    </td>
                    <td class="day-content-cell">
                      <textarea 
                        name="dayContent_${index}" 
                        class="day-content-input"
                        placeholder="${day.dayName} ${this.i18n.t('newPlan.dayContentPlaceholder')}"
                        rows="2"
                      ></textarea>
                    </td>
                    <td class="day-notes-cell">
                      <textarea 
                        name="dayNotes_${index}" 
                        class="day-content-input"
                        placeholder="${this.i18n.t('newPlan.notesPlaceholder')}"
                        rows="2"
                      ></textarea>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
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

    const form = this.containerElement.querySelector('#newPlanForm') as HTMLFormElement;
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

  private async handleFormSubmit(form: HTMLFormElement): Promise<void> {
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
      // Plan günlerini oluştur
      const planDays: PlanDay[] = [];
      const daysOfWeek = this.getDaysOfWeek();
      
      daysOfWeek.forEach((day, index) => {
        const dayContent = (formData.get(`dayContent_${index}`) as string)?.trim() || '';
        const dayNotes = (formData.get(`dayNotes_${index}`) as string)?.trim() || '';
        // Notlar içeriğe ekleniyor (eğer notlar varsa)
        const notesLabel = this.i18n.getLanguage() === 'tr' ? 'Notlar:' : 'Notes:';
        const fullContent = dayNotes ? `${dayContent}\n\n${notesLabel} ${dayNotes}` : dayContent;
        const planDay: PlanDay = {
          id: '', // Service'de oluşturulacak
          planId: '', // Service'de oluşturulacak
          dayOfWeek: day.dayOfWeek,
          dayName: day.dayName,
          content: fullContent,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        planDays.push(planDay);
      });

      await this.planHook.createPlan(planName, description, year, week, planDays);
      // Plan oluşturulduktan sonra Plan Yönetimi sayfasına yönlendir
      this.viewStateHook.navigateToPlanManager();
    } catch (error) {
      console.error('Error creating plan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Plan oluşturulurken bir hata oluştu';
      this.showError(errorMessage);
    }
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

    const form = this.containerElement.querySelector('#newPlanForm');
    if (form && form.parentNode) {
      form.parentNode.insertBefore(errorDiv, form);
      setTimeout(() => {
        errorDiv.remove();
      }, 5000);
    }
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}

