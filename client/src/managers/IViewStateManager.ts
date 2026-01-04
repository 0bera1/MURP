import { ViewState } from '../models/ViewState.js';

export interface IViewStateManager {
  getCurrentView(): ViewState;
  setView(view: ViewState): void;
  onViewChange(callback: (view: ViewState) => void): void;
}

