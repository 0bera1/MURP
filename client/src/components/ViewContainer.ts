import { ViewState } from '../models/ViewState.js';
import { HomeComponent } from './HomeComponent.js';
import { NewPlanComponent } from './NewPlanComponent.js';
import { PlanManagerComponent } from './PlanManagerComponent.js';
import { PlanEditorComponent } from './PlanEditorComponent.js';
import { SettingsComponent } from './SettingsComponent.js';

export class ViewContainer {
  private homeComponent: HomeComponent;
  private newPlanComponent: NewPlanComponent;
  private planManagerComponent: PlanManagerComponent;
  private planEditorComponent: PlanEditorComponent;
  private settingsComponent: SettingsComponent;
  private currentView: ViewState = ViewState.Home;
  private currentPlanId: string | undefined = undefined;

  constructor() {
    this.homeComponent = new HomeComponent();
    this.newPlanComponent = new NewPlanComponent();
    this.planManagerComponent = new PlanManagerComponent();
    this.planEditorComponent = new PlanEditorComponent();
    this.settingsComponent = new SettingsComponent();
  }

  public initialize(): void {
    console.log('ViewContainer: Initialize called');
    console.log('Current view:', this.currentView);
    try {
      this.setupViewStateListener();
      console.log('ViewContainer: View state listener setup complete');
      this.renderCurrentView();
      console.log('ViewContainer: Initial render complete');
    } catch (error) {
      console.error('ViewContainer: Initialize error:', error);
      throw error;
    }
  }

  private setupViewStateListener(): void {
    window.addEventListener('viewStateChanged', ((event: CustomEvent<{ view: ViewState; planId?: string }>) => {
      const previousView = this.currentView;
      this.currentView = event.detail.view;
      
      // planId sadece event'te varsa ve PlanEditor view'ına geçiliyorsa güncelle
      if (event.detail.planId !== undefined && this.currentView === ViewState.PlanEditor) {
        this.currentPlanId = event.detail.planId;
      }
      // PlanEditor view'ından başka bir view'a geçildiğinde planId'yi temizle
      if (previousView === ViewState.PlanEditor && this.currentView !== ViewState.PlanEditor) {
        this.currentPlanId = undefined;
      }
      // PlanEditor view'ındayken ve planId yoksa, önceki planId'yi koru
      if (this.currentView === ViewState.PlanEditor && !this.currentPlanId && event.detail.planId === undefined) {
        // planId korunuyor, değişiklik yok
      }
      
      this.renderCurrentView();
    }) as EventListener);
  }

  private renderCurrentView(): void {
    console.log('ViewContainer: renderCurrentView called, view:', this.currentView);
    const container = document.getElementById('app-container');
    if (!container) {
      console.error('ViewContainer: app-container not found!');
      return;
    }
    console.log('ViewContainer: Container found, rendering view');

    try {
      switch (this.currentView) {
        case ViewState.Home:
          this.renderHome();
          break;
        case ViewState.NewPlan:
          this.renderNewPlan();
          break;
        case ViewState.PlanEditor:
          this.renderPlanEditor();
          break;
        case ViewState.PlanManager:
          this.renderPlanManager();
          break;
        case ViewState.Settings:
          this.renderSettings();
          break;
        default:
          console.log('ViewContainer: Default case, rendering home');
          this.renderHome();
      }
    } catch (error) {
      console.error('ViewContainer: Error rendering view:', error);
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: white;">
          <h2>Render Hatası</h2>
          <p>${error instanceof Error ? error.message : 'Bilinmeyen hata'}</p>
        </div>
      `;
    }
  }

  private renderHome(): void {
    const container = document.getElementById('app-container');
    if (!container) {
      return;
    }

    // Container'ı temizle ve home view'ı oluştur
    container.innerHTML = '<div id="home-view"></div>';
    // Hemen render et
    this.homeComponent.render('home-view');
  }

  private renderNewPlan(): void {
    const container = document.getElementById('app-container');
    if (!container) {
      return;
    }

    container.innerHTML = '<div id="new-plan-view"></div>';
    this.newPlanComponent.render('new-plan-view');
  }

  private renderPlanEditor(): void {
    const container = document.getElementById('app-container');
    if (!container) {
      return;
    }

    container.innerHTML = '<div id="plan-editor-view"></div>';
    // planId varsa kullan, yoksa undefined geç (component kendi planId'sini koruyacak)
    this.planEditorComponent.render('plan-editor-view', this.currentPlanId);
  }

  private renderPlanManager(): void {
    const container = document.getElementById('app-container');
    if (!container) {
      return;
    }

    container.innerHTML = '<div id="plan-manager-view"></div>';
    this.planManagerComponent.render('plan-manager-view');
  }

  private renderSettings(): void {
    const container = document.getElementById('app-container');
    if (!container) {
      return;
    }

    container.innerHTML = '<div id="settings-view"></div>';
    this.settingsComponent.render('settings-view');
  }
}

