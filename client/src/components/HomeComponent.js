import { useViewState } from '../hooks/useViewState';
import { usePlan } from '../hooks/usePlan';
import { ViewState } from '../models/ViewState';
export class HomeComponent {
    constructor() {
        this.containerElement = null;
        console.log('HomeComponent: Constructor called');
        try {
            this.viewStateHook = useViewState();
            console.log('HomeComponent: useViewState hook initialized');
            this.planHook = usePlan();
            console.log('HomeComponent: usePlan hook initialized');
        }
        catch (error) {
            console.error('HomeComponent: Constructor error:', error);
            throw error;
        }
    }
    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }
        this.containerElement = container;
        this.updateView();
        this.setupViewStateListener();
    }
    setupViewStateListener() {
        window.addEventListener('viewStateChanged', () => {
            this.updateView();
        });
        window.addEventListener('planDataChanged', () => {
            this.updateView();
        });
    }
    async updateView() {
        if (!this.containerElement) {
            console.error('HomeComponent: containerElement is null');
            return;
        }
        const currentView = this.viewStateHook.currentView;
        console.log('HomeComponent: updateView called, currentView:', currentView);
        if (currentView !== ViewState.Home) {
            this.containerElement.style.display = 'none';
            return;
        }
        this.containerElement.style.display = 'block';
        try {
            // Önce loading göster
            this.containerElement.innerHTML = '<div style="padding: 40px; text-align: center; color: white;"><h2>Yükleniyor...</h2></div>';
            const html = await this.generateHTML();
            this.containerElement.innerHTML = html;
            this.attachEventListeners();
            console.log('HomeComponent: View updated successfully');
        }
        catch (error) {
            console.error('HomeComponent: Error updating view:', error);
            this.containerElement.innerHTML = `
        <div style="padding: 40px; text-align: center; color: white;">
          <h2>Hata Oluştu</h2>
          <p>${error instanceof Error ? error.message : 'Bilinmeyen hata'}</p>
          <button class="menu-button" onclick="location.reload()">Yeniden Yükle</button>
        </div>
      `;
        }
    }
    async generateHTML() {
        try {
            console.log('HomeComponent: generateHTML called');
            await this.planHook.refresh();
            console.log('HomeComponent: Plan data refreshed');
            const { hasActivePlan, activePlan } = this.planHook;
            console.log('HomeComponent: hasActivePlan:', hasActivePlan, 'activePlan:', activePlan);
            const continueButtonHTML = hasActivePlan && activePlan
                ? `<button class="menu-button continue-button" data-action="continue">
            Continue to ${activePlan.weekName}
          </button>`
                : '';
            const html = `
        <div class="home-container">
          <h1 class="home-title">Ne yapmak istiyorsun?</h1>
          <div class="menu-buttons">
            ${continueButtonHTML}
            <button class="menu-button" data-action="newPlan">
              New Plan
            </button>
            <button class="menu-button" data-action="managePlan">
              Manage / Select / Change Plan
            </button>
            <button class="menu-button" data-action="settings">
              Settings
            </button>
            <button class="menu-button exit-button" data-action="exit">
              Exit
            </button>
          </div>
        </div>
      `;
            console.log('HomeComponent: HTML generated, length:', html.length);
            return html;
        }
        catch (error) {
            console.error('HomeComponent: Error generating HTML:', error);
            return `
        <div class="home-container">
          <h1 class="home-title">Hata</h1>
          <p style="color: red;">${error instanceof Error ? error.message : 'Bilinmeyen hata'}</p>
          <button class="menu-button" onclick="location.reload()">Yeniden Yükle</button>
        </div>
      `;
        }
    }
    attachEventListeners() {
        if (!this.containerElement) {
            return;
        }
        const buttons = this.containerElement.querySelectorAll('.menu-button');
        buttons.forEach((button) => {
            button.addEventListener('click', (event) => {
                const target = event.target;
                const action = target.getAttribute('data-action');
                this.handleButtonClick(action || '');
            });
        });
    }
    handleButtonClick(action) {
        switch (action) {
            case 'continue':
                this.viewStateHook.navigateToPlanEditor();
                break;
            case 'newPlan':
                this.viewStateHook.navigateToNewPlan();
                break;
            case 'managePlan':
                this.viewStateHook.navigateToPlanManager();
                break;
            case 'settings':
                this.viewStateHook.navigateToSettings();
                break;
            case 'exit':
                this.handleExit();
                break;
            default:
                console.warn(`Unknown action: ${action}`);
        }
    }
    handleExit() {
        if (window.electronAPI && window.electronAPI.exit) {
            window.electronAPI.exit();
        }
        else {
            window.close();
        }
    }
}
