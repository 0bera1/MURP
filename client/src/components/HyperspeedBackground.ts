// React Bits Hyperspeed Background - Preset Four
// Source: https://reactbits.dev/backgrounds/hyperspeed?activePreset=four
// Converted from React component to vanilla TypeScript

import { hyperspeedPresets } from './HyperSpeedPresets.js';
import type { HyperspeedOptions } from './HyperspeedImplementation.js';
import { initHyperspeed } from './HyperspeedImplementation.js';

// Inject CSS dynamically
const injectHyperspeedCSS = (): void => {
  if (document.getElementById('hyperspeed-css')) return;
  
  const style = document.createElement('style');
  style.id = 'hyperspeed-css';
  style.textContent = `
    #lights {
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: absolute;
    }

    canvas {
      width: 100%;
      height: 100%;
    }
  `;
  document.head.appendChild(style);
};

export class HyperspeedBackground {
  private container: HTMLElement | null = null;
  private app: { dispose: () => void } | null = null;
  private preset: typeof hyperspeedPresets.four;

  constructor() {
    this.preset = hyperspeedPresets.four;
  }

  public async initialize(containerId: string): Promise<void> {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with id "${containerId}" not found`);
      return;
    }

    // Inject CSS
    injectHyperspeedCSS();

    // Create lights container
    const lightsContainer = document.createElement('div');
    lightsContainer.id = 'lights';
    lightsContainer.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: fixed;
      top: 0;
      left: 0;
      z-index: -1;
      pointer-events: none;
    `;
    document.body.appendChild(lightsContainer);

    this.container = lightsContainer;

    // Initialize Hyperspeed
    try {
      const options: HyperspeedOptions = {
        ...this.preset,
        lightStickWidth: this.preset.lightStickWidth as [number, number],
        lightStickHeight: this.preset.lightStickHeight as [number, number],
        movingAwaySpeed: this.preset.movingAwaySpeed as [number, number],
        movingCloserSpeed: this.preset.movingCloserSpeed as [number, number],
        carLightsLength: this.preset.carLightsLength as [number, number],
        carLightsRadius: this.preset.carLightsRadius as [number, number],
        carWidthPercentage: this.preset.carWidthPercentage as [number, number],
        carShiftX: this.preset.carShiftX as [number, number],
        carFloorSeparation: this.preset.carFloorSeparation as [number, number]
      };
      this.app = await initHyperspeed(lightsContainer, options);
    } catch (error) {
      console.error('Failed to initialize Hyperspeed:', error);
    }
  }

  public destroy(): void {
    if (this.app) {
      this.app.dispose();
      this.app = null;
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }
}
