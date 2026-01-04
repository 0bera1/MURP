// React Bits Plasma Background
// Source: https://reactbits.dev/backgrounds/plasma
// Converted from React component to vanilla TypeScript

import { Renderer, Program, Mesh, Triangle } from 'ogl';

// Inject CSS dynamically
const injectPlasmaCSS = (): void => {
  if (document.getElementById('plasma-css')) return;
  
  const style = document.createElement('style');
  style.id = 'plasma-css';
  style.textContent = `
    .plasma-container {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
  `;
  document.head.appendChild(style);
};

interface PlasmaOptions {
  color?: string;
  speed?: number;
  direction?: 'forward' | 'reverse' | 'pingpong';
  scale?: number;
  opacity?: number;
  mouseInteractive?: boolean;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 0.5, 0.2];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ];
};

const vertex = `#version 300 es
precision highp float;
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uCustomColor;
uniform float uUseCustomColor;
uniform float uSpeed;
uniform float uDirection;
uniform float uScale;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseInteractive;
out vec4 fragColor;

void mainImage(out vec4 o, vec2 C) {
  vec2 center = iResolution.xy * 0.5;
  C = (C - center) / uScale + center;
  
  vec2 mouseOffset = (uMouse - center) * 0.0002;
  C += mouseOffset * length(C - center) * step(0.5, uMouseInteractive);
  
  float i, d, z, T = iTime * uSpeed * uDirection;
  vec3 O, p, S;

  for (vec2 r = iResolution.xy, Q; ++i < 60.; O += o.w/d*o.xyz) {
    p = z*normalize(vec3(C-.5*r,r.y)); 
    p.z -= 4.; 
    S = p;
    d = p.y-T;
    
    p.x += .4*(1.+p.y)*sin(d + p.x*0.1)*cos(.34*d + p.x*0.05); 
    Q = p.xz *= mat2(cos(p.y+vec4(0,11,33,0)-T)); 
    z+= d = abs(sqrt(length(Q*Q)) - .25*(5.+S.y))/3.+8e-4; 
    o = 1.+sin(S.y+p.z*.5+S.z-length(S-p)+vec4(2,1,0,8));
  }
  
  o.xyz = tanh(O/1e4);
}

bool finite1(float x){ return !(isnan(x) || isinf(x)); }
vec3 sanitize(vec3 c){
  return vec3(
    finite1(c.r) ? c.r : 0.0,
    finite1(c.g) ? c.g : 0.0,
    finite1(c.b) ? c.b : 0.0
  );
}

void main() {
  vec4 o = vec4(0.0);
  mainImage(o, gl_FragCoord.xy);
  vec3 rgb = sanitize(o.rgb);
  
  float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
  vec3 customColor = intensity * uCustomColor;
  vec3 finalColor = mix(rgb, customColor, step(0.5, uUseCustomColor));
  
  float alpha = length(rgb) * uOpacity;
  fragColor = vec4(finalColor, alpha);
}`;

export class PlasmaBackground {
  private container: HTMLElement | null = null;
  private renderer: Renderer | null = null;
  private program: Program | null = null;
  private mesh: Mesh | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private animationFrame: number | null = null;
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private options: Required<PlasmaOptions>;
  private mousePos: { x: number; y: number } = { x: 0, y: 0 };
  private startTime: number = 0;

  constructor(options: PlasmaOptions = {}) {
    this.options = {
      color: options.color || '#ff6b35',
      speed: options.speed ?? 0.6,
      direction: options.direction || 'forward',
      scale: options.scale ?? 1.1,
      opacity: options.opacity ?? 0.8,
      mouseInteractive: options.mouseInteractive ?? true
    };
  }

  public initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with id "${containerId}" not found`);
      return;
    }

    // Inject CSS
    injectPlasmaCSS();

    // Create plasma container
    const plasmaContainer = document.createElement('div');
    plasmaContainer.className = 'plasma-container';
    plasmaContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: ${this.options.mouseInteractive ? 'auto' : 'none'};
    `;
    document.body.appendChild(plasmaContainer);

    this.container = plasmaContainer;
    this.startTime = performance.now();

    try {
      this.initPlasma();
    } catch (error) {
      console.error('Failed to initialize Plasma:', error);
    }
  }

  private initPlasma(): void {
    if (!this.container) return;

    const useCustomColor = this.options.color ? 1.0 : 0.0;
    const customColorRgb = this.options.color ? hexToRgb(this.options.color) : [1, 1, 1];
    const directionMultiplier = this.options.direction === 'reverse' ? -1.0 : 1.0;

    this.renderer = new Renderer({
      webgl: 2,
      alpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });

    const gl = this.renderer.gl;
    const canvas = gl.canvas;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    this.container.appendChild(canvas);

    const geometry = new Triangle(gl);

    this.program = new Program(gl, {
      vertex: vertex,
      fragment: fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uCustomColor: { value: new Float32Array(customColorRgb) },
        uUseCustomColor: { value: useCustomColor },
        uSpeed: { value: this.options.speed * 0.4 },
        uDirection: { value: directionMultiplier },
        uScale: { value: this.options.scale },
        uOpacity: { value: this.options.opacity },
        uMouse: { value: new Float32Array([0, 0]) },
        uMouseInteractive: { value: this.options.mouseInteractive ? 1.0 : 0.0 }
      }
    });

    this.mesh = new Mesh(gl, { geometry, program: this.program });

    if (this.options.mouseInteractive) {
      this.mouseMoveHandler = (e: MouseEvent) => {
        if (!this.container || !this.program) return;
        const rect = this.container.getBoundingClientRect();
        this.mousePos.x = e.clientX - rect.left;
        this.mousePos.y = e.clientY - rect.top;
        const mouseUniform = this.program.uniforms.uMouse.value as Float32Array;
        mouseUniform[0] = this.mousePos.x;
        mouseUniform[1] = this.mousePos.y;
      };
      this.container.addEventListener('mousemove', this.mouseMoveHandler);
    }

    const setSize = (): void => {
      if (!this.container || !this.renderer || !this.program) return;
      const rect = this.container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      this.renderer.setSize(width, height);
      const res = this.program.uniforms.iResolution.value as Float32Array;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
    };

    this.resizeObserver = new ResizeObserver(setSize);
    this.resizeObserver.observe(this.container);
    setSize();

    const loop = (t: number): void => {
      if (!this.program || !this.renderer || !this.mesh) return;

      let timeValue = (t - this.startTime) * 0.001;
      if (this.options.direction === 'pingpong') {
        const pingpongDuration = 10;
        const segmentTime = timeValue % pingpongDuration;
        const isForward = Math.floor(timeValue / pingpongDuration) % 2 === 0;
        const u = segmentTime / pingpongDuration;
        const smooth = u * u * (3 - 2 * u);
        const pingpongTime = isForward ? smooth * pingpongDuration : (1 - smooth) * pingpongDuration;
        (this.program.uniforms.uDirection as { value: number }).value = 1.0;
        (this.program.uniforms.iTime as { value: number }).value = pingpongTime;
      } else {
        (this.program.uniforms.iTime as { value: number }).value = timeValue;
      }
      this.renderer.render({ scene: this.mesh });
      this.animationFrame = requestAnimationFrame(loop);
    };
    this.animationFrame = requestAnimationFrame(loop);
  }

  public destroy(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.mouseMoveHandler && this.container) {
      this.container.removeEventListener('mousemove', this.mouseMoveHandler);
      this.mouseMoveHandler = null;
    }

    if (this.container) {
      try {
        if (this.renderer && this.renderer.gl.canvas.parentNode) {
          this.renderer.gl.canvas.parentNode.removeChild(this.renderer.gl.canvas);
        }
      } catch {
        console.warn('Canvas already removed from container');
      }
      if (this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }

    this.renderer = null;
    this.program = null;
    this.mesh = null;
    this.container = null;
  }
}

