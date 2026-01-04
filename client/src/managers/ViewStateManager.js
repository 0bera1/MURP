import { ViewState } from '../models/ViewState';
export class ViewStateManager {
    constructor() {
        this.currentView = ViewState.Home;
        this.viewChangeCallbacks = [];
    }
    getCurrentView() {
        return this.currentView;
    }
    setView(view) {
        if (this.currentView !== view) {
            this.currentView = view;
            this.notifyViewChange(view);
        }
    }
    onViewChange(callback) {
        this.viewChangeCallbacks.push(callback);
    }
    notifyViewChange(view) {
        this.viewChangeCallbacks.forEach((callback) => {
            callback(view);
        });
    }
}
