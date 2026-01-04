import { ViewState } from '../models/ViewState.js';
import { IViewStateManager } from './IViewStateManager.js';

export class ViewStateManager implements IViewStateManager {
  private currentView: ViewState = ViewState.Home;
  private viewChangeCallbacks: Array<(view: ViewState) => void> = [];

  public getCurrentView(): ViewState {
    return this.currentView;
  }

  public setView(view: ViewState): void {
    if (this.currentView !== view) {
      this.currentView = view;
      this.notifyViewChange(view);
    }
  }

  public onViewChange(callback: (view: ViewState) => void): void {
    this.viewChangeCallbacks.push(callback);
  }

  private notifyViewChange(view: ViewState): void {
    this.viewChangeCallbacks.forEach((callback) => {
      callback(view);
    });
  }
}

