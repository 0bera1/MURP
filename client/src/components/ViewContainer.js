import { ViewState } from '../models/ViewState';
import { HomeComponent } from './HomeComponent';
import { NewPlanComponent } from './NewPlanComponent';
import { PlanManagerComponent } from './PlanManagerComponent';
import { useViewState } from '../hooks/useViewState';
export class ViewContainer {
    constructor() {
        this.currentView = ViewState.Home;
        this.homeComponent = new HomeComponent();
        this.newPlanComponent = new NewPlanComponent();
        this.planManagerComponent = new PlanManagerComponent();
        this.viewStateHook = useViewState();
    }
    initialize() {
        try {
            this.setupViewStateListener();
            this.renderCurrentView();
        }
        catch (error) {
            console.error('ViewContainer: Initialize error:', error);
            throw error;
        }
    }
    setupViewStateListener() {
        window.addEventListener('viewStateChanged', ((event) => {
            this.currentView = event.detail.view;
            this.renderCurrentView();
        }));
    }
    renderCurrentView() {
        const container = document.getElementById('app-container');
        if (!container) {
            console.error('ViewContainer: app-container not found!');
            return;
        }
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
                    this.renderHome();
            }
        }
        catch (error) {
            console.error('ViewContainer: Error rendering view:', error);
            container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: white;">
          <h2>Render Hatası</h2>
          <p>${error instanceof Error ? error.message : 'Bilinmeyen hata'}</p>
        </div>
      `;
        }
    }
    renderHome() {
        const container = document.getElementById('app-container');
        if (!container) {
            return;
        }
        container.innerHTML = '<div id="home-view"></div>';
        this.homeComponent.render('home-view');
    }
    renderNewPlan() {
        const container = document.getElementById('app-container');
        if (!container) {
            return;
        }
        container.innerHTML = '<div id="new-plan-view"></div>';
        this.newPlanComponent.render('new-plan-view');
    }
    renderPlanEditor() {
        const container = document.getElementById('app-container');
        if (!container) {
            return;
        }
        container.innerHTML = `
      <div class="view-container">
        <h2>Plan Editor</h2>
        <p>Plan düzenleme ekranı yakında...</p>
        <button class="back-button" data-action="back">← Geri</button>
      </div>
    `;
        this.attachBackButton();
    }
    renderPlanManager() {
        const container = document.getElementById('app-container');
        if (!container) {
            return;
        }
        container.innerHTML = '<div id="plan-manager-view"></div>';
        this.planManagerComponent.render('plan-manager-view');
    }
    renderSettings() {
        const container = document.getElementById('app-container');
        if (!container) {
            return;
        }
        container.innerHTML = `
      <div class="view-container">
        <h2>Settings</h2>
        <p>Ayarlar ekranı yakında...</p>
        <button class="back-button" data-action="back">← Geri</button>
      </div>
    `;
        this.attachBackButton();
    }
    attachBackButton() {
        const backButton = document.querySelector('.back-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.viewStateHook.navigateToHome();
            });
        }
    }
}
