// React Bits Hyperspeed Implementation - Converted from React to vanilla TypeScript
// Source: https://reactbits.dev/backgrounds/hyperspeed

import * as THREE from 'three';
import { BloomEffect, EffectComposer, EffectPass, RenderPass, SMAAEffect, SMAAPreset } from 'postprocessing';

// Type definitions
export interface HyperspeedOptions {
  onSpeedUp?: (ev: Event) => void;
  onSlowDown?: (ev: Event) => void;
  distortion: string;
  length: number;
  roadWidth: number;
  islandWidth: number;
  lanesPerRoad: number;
  fov: number;
  fovSpeedUp: number;
  speedUp: number;
  carLightsFade: number;
  totalSideLightSticks: number;
  lightPairsPerRoadWay: number;
  shoulderLinesWidthPercentage: number;
  brokenLinesWidthPercentage: number;
  brokenLinesLengthPercentage: number;
  lightStickWidth: [number, number];
  lightStickHeight: [number, number];
  movingAwaySpeed: [number, number];
  movingCloserSpeed: [number, number];
  carLightsLength: [number, number];
  carLightsRadius: [number, number];
  carWidthPercentage: [number, number];
  carShiftX: [number, number];
  carFloorSeparation: [number, number];
  colors: {
    roadColor: number;
    islandColor: number;
    background: number;
    shoulderLines: number;
    brokenLines: number;
    leftCars: number[] | number;
    rightCars: number[] | number;
    sticks: number;
  };
}

interface DistortionConfig {
  uniforms: Record<string, { value: THREE.Vector2 | THREE.Vector3 | THREE.Vector4 }>;
  getDistortion: string;
  getJS?: (progress: number, time: number) => THREE.Vector3;
}

// Helper functions
// nsin is used in shader code but not in JS

const random = (base: number | [number, number]): number => {
  if (Array.isArray(base)) return Math.random() * (base[1] - base[0]) + base[0];
  return Math.random() * base;
};

const pickRandom = <T,>(arr: T | T[]): T => {
  if (Array.isArray(arr)) return arr[Math.floor(Math.random() * arr.length)];
  return arr;
};

function lerp(current: number, target: number, speed: number = 0.1, limit: number = 0.001): number {
  let change = (target - current) * speed;
  if (Math.abs(change) < limit) {
    change = target - current;
  }
  return change;
}

function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer, setSize: (w: number, h: number, u: boolean) => void): boolean {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    setSize(width, height, false);
  }
  return needResize;
}

// Distortion configurations
const LongRaceUniforms = {
  uFreq: { value: new THREE.Vector2(2, 3) },
  uAmp: { value: new THREE.Vector2(35, 10) }
};

const distortions: Record<string, DistortionConfig> = {
  LongRaceDistortion: {
    uniforms: LongRaceUniforms,
    getDistortion: `
      uniform vec2 uFreq;
      uniform vec2 uAmp;
      #define PI 3.14159265358979
      vec3 getDistortion(float progress){
        float camProgress = 0.0125;
        return vec3( 
          sin(progress * PI * uFreq.x + uTime) * uAmp.x - sin(camProgress * PI * uFreq.x + uTime) * uAmp.x,
          sin(progress * PI * uFreq.y + uTime) * uAmp.y - sin(camProgress * PI * uFreq.y + uTime) * uAmp.y,
          0.
        );
      }
    `,
    getJS: (progress: number, time: number): THREE.Vector3 => {
      const camProgress = 0.0125;
      const uFreq = LongRaceUniforms.uFreq.value;
      const uAmp = LongRaceUniforms.uAmp.value;
      const distortion = new THREE.Vector3(
        Math.sin(progress * Math.PI * uFreq.x + time) * uAmp.x -
          Math.sin(camProgress * Math.PI * uFreq.x + time) * uAmp.x,
        Math.sin(progress * Math.PI * uFreq.y + time) * uAmp.y -
          Math.sin(camProgress * Math.PI * uFreq.y + time) * uAmp.y,
        0
      );
      const lookAtAmp = new THREE.Vector3(1, 1, 0);
      const lookAtOffset = new THREE.Vector3(0, 0, -5);
      return distortion.multiply(lookAtAmp).add(lookAtOffset);
    }
  }
  // Add other distortions as needed
};

// Shader code
const carLightsFragment = `
  #define USE_FOG;
  ${THREE.ShaderChunk['fog_pars_fragment']}
  varying vec3 vColor;
  varying vec2 vUv; 
  uniform vec2 uFade;
  void main() {
    vec3 color = vec3(vColor);
    float alpha = smoothstep(uFade.x, uFade.y, vUv.x);
    gl_FragColor = vec4(color, alpha);
    if (gl_FragColor.a < 0.0001) discard;
    ${THREE.ShaderChunk['fog_fragment']}
  }
`;

const carLightsVertex = `
  #define USE_FOG;
  ${THREE.ShaderChunk['fog_pars_vertex']}
  attribute vec3 aOffset;
  attribute vec3 aMetrics;
  attribute vec3 aColor;
  uniform float uTravelLength;
  uniform float uTime;
  varying vec2 vUv; 
  varying vec3 vColor; 
  #include <getDistortion_vertex>
  void main() {
    vec3 transformed = position.xyz;
    float radius = aMetrics.r;
    float myLength = aMetrics.g;
    float speed = aMetrics.b;

    transformed.xy *= radius;
    transformed.z *= myLength;

    transformed.z += myLength - mod(uTime * speed + aOffset.z, uTravelLength);
    transformed.xy += aOffset.xy;

    float progress = abs(transformed.z / uTravelLength);
    transformed.xyz += getDistortion(progress);

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
    gl_Position = projectionMatrix * mvPosition;
    vUv = uv;
    vColor = aColor;
    ${THREE.ShaderChunk['fog_vertex']}
  }
`;

const sideSticksVertex = `
  #define USE_FOG;
  ${THREE.ShaderChunk['fog_pars_vertex']}
  attribute float aOffset;
  attribute vec3 aColor;
  attribute vec2 aMetrics;
  uniform float uTravelLength;
  uniform float uTime;
  varying vec3 vColor;
  mat4 rotationY( in float angle ) {
    return mat4(	cos(angle),		0,		sin(angle),	0,
                 0,		1.0,			 0,	0,
            -sin(angle),	0,		cos(angle),	0,
            0, 		0,				0,	1);
  }
  #include <getDistortion_vertex>
  void main(){
    vec3 transformed = position.xyz;
    float width = aMetrics.x;
    float height = aMetrics.y;

    transformed.xy *= vec2(width, height);
    float time = mod(uTime * 60. * 2. + aOffset, uTravelLength);

    transformed = (rotationY(3.14/2.) * vec4(transformed,1.)).xyz;

    transformed.z += - uTravelLength + time;

    float progress = abs(transformed.z / uTravelLength);
    transformed.xyz += getDistortion(progress);

    transformed.y += height / 2.;
    transformed.x += -width / 2.;
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
    gl_Position = projectionMatrix * mvPosition;
    vColor = aColor;
    ${THREE.ShaderChunk['fog_vertex']}
  }
`;

const sideSticksFragment = `
  #define USE_FOG;
  ${THREE.ShaderChunk['fog_pars_fragment']}
  varying vec3 vColor;
  void main(){
    vec3 color = vec3(vColor);
    gl_FragColor = vec4(color,1.);
    ${THREE.ShaderChunk['fog_fragment']}
  }
`;

const roadBaseFragment = `
  #define USE_FOG;
  varying vec2 vUv; 
  uniform vec3 uColor;
  uniform float uTime;
  #include <roadMarkings_vars>
  ${THREE.ShaderChunk['fog_pars_fragment']}
  void main() {
    vec2 uv = vUv;
    vec3 color = vec3(uColor);
    #include <roadMarkings_fragment>
    gl_FragColor = vec4(color, 1.);
    ${THREE.ShaderChunk['fog_fragment']}
  }
`;

const roadMarkings_vars = `
  uniform float uLanes;
  uniform vec3 uBrokenLinesColor;
  uniform vec3 uShoulderLinesColor;
  uniform float uShoulderLinesWidthPercentage;
  uniform float uBrokenLinesWidthPercentage;
  uniform float uBrokenLinesLengthPercentage;
  highp float random(vec2 co) {
    highp float a = 12.9898;
    highp float b = 78.233;
    highp float c = 43758.5453;
    highp float dt = dot(co.xy, vec2(a, b));
    highp float sn = mod(dt, 3.14);
    return fract(sin(sn) * c);
  }
`;

const roadMarkings_fragment = `
  uv.y = mod(uv.y + uTime * 0.05, 1.);
  float laneWidth = 1.0 / uLanes;
  float brokenLineWidth = laneWidth * uBrokenLinesWidthPercentage;
  float laneEmptySpace = 1. - uBrokenLinesLengthPercentage;

  float brokenLines = step(1.0 - brokenLineWidth, fract(uv.x * 2.0)) * step(laneEmptySpace, fract(uv.y * 10.0));
  float sideLines = step(1.0 - brokenLineWidth, fract((uv.x - laneWidth * (uLanes - 1.0)) * 2.0)) + step(brokenLineWidth, uv.x);

  brokenLines = mix(brokenLines, sideLines, uv.x);
`;

const roadFragment = roadBaseFragment
  .replace('#include <roadMarkings_fragment>', roadMarkings_fragment)
  .replace('#include <roadMarkings_vars>', roadMarkings_vars);

const islandFragment = roadBaseFragment
  .replace('#include <roadMarkings_fragment>', '')
  .replace('#include <roadMarkings_vars>', '');

const roadVertex = `
  #define USE_FOG;
  uniform float uTime;
  ${THREE.ShaderChunk['fog_pars_vertex']}
  uniform float uTravelLength;
  varying vec2 vUv; 
  #include <getDistortion_vertex>
  void main() {
    vec3 transformed = position.xyz;
    vec3 distortion = getDistortion((transformed.y + uTravelLength / 2.) / uTravelLength);
    transformed.x += distortion.x;
    transformed.z += distortion.y;
    transformed.y += -1. * distortion.z;  
    
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.);
    gl_Position = projectionMatrix * mvPosition;
    vUv = uv;
    ${THREE.ShaderChunk['fog_vertex']}
  }
`;

// Classes
class CarLights {
  public mesh!: THREE.Mesh;
  private webgl: App;
  private options: HyperspeedOptions;
  private colors: THREE.Color | THREE.Color[];
  private speed: [number, number];
  private fade: THREE.Vector2;

  constructor(webgl: App, options: HyperspeedOptions, colors: number[] | number, speed: [number, number], fade: THREE.Vector2) {
    this.webgl = webgl;
    this.options = options;
    this.speed = speed;
    this.fade = fade;
    
    if (Array.isArray(colors)) {
      this.colors = colors.map(c => new THREE.Color(c));
    } else {
      this.colors = new THREE.Color(colors);
    }
  }

  public init(): void {
    const options = this.options;
    const curve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1));
    const geometry = new THREE.TubeGeometry(curve, 40, 1, 8, false);

    const instanced = new THREE.InstancedBufferGeometry();
    (instanced as unknown as THREE.BufferGeometry).copy(geometry);
    instanced.instanceCount = options.lightPairsPerRoadWay * 2;

    const laneWidth = options.roadWidth / options.lanesPerRoad;

    const aOffset: number[] = [];
    const aMetrics: number[] = [];
    const aColor: number[] = [];

    for (let i = 0; i < options.lightPairsPerRoadWay; i++) {
      const radius = random(options.carLightsRadius);
      const length = random(options.carLightsLength);
      const speed = random(this.speed);

      const carLane = i % options.lanesPerRoad;
      let laneX = carLane * laneWidth - options.roadWidth / 2 + laneWidth / 2;

      const carWidth = random(options.carWidthPercentage) * laneWidth;
      const carShiftX = random(options.carShiftX) * laneWidth;
      laneX += carShiftX;

      const offsetY = random(options.carFloorSeparation) + radius * 1.3;
      const offsetZ = -random(options.length);

      aOffset.push(laneX - carWidth / 2, offsetY, offsetZ);
      aOffset.push(laneX + carWidth / 2, offsetY, offsetZ);

      aMetrics.push(radius, length, speed);
      aMetrics.push(radius, length, speed);

      const color = pickRandom(this.colors);
      aColor.push(color.r, color.g, color.b);
      aColor.push(color.r, color.g, color.b);
    }

    instanced.setAttribute('aOffset', new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 3, false));
    instanced.setAttribute('aMetrics', new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 3, false));
    instanced.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3, false));

    const material = new THREE.ShaderMaterial({
      fragmentShader: carLightsFragment,
      vertexShader: carLightsVertex,
      transparent: true,
      uniforms: Object.assign(
        {
          uTime: { value: 0 },
          uTravelLength: { value: options.length },
          uFade: { value: this.fade }
        },
        this.webgl.fogUniforms,
        this.webgl.options.distortion.uniforms
      )
    });

    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <getDistortion_vertex>',
        this.webgl.options.distortion.getDistortion
      );
    };

    const mesh = new THREE.Mesh(instanced, material);
    mesh.frustumCulled = false;
    this.webgl.scene.add(mesh);
    this.mesh = mesh;
  }

  public update(time: number): void {
    const material = this.mesh.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = time;
  }
}

class LightsSticks {
  public mesh!: THREE.Mesh;
  private webgl: App;
  private options: HyperspeedOptions;

  constructor(webgl: App, options: HyperspeedOptions) {
    this.webgl = webgl;
    this.options = options;
  }

  public init(): void {
    const options = this.options;
    const geometry = new THREE.PlaneGeometry(1, 1);
    const instanced = new THREE.InstancedBufferGeometry();
    (instanced as unknown as THREE.BufferGeometry).copy(geometry);
    const totalSticks = options.totalSideLightSticks;
    instanced.instanceCount = totalSticks;

    const stickoffset = options.length / (totalSticks - 1);
    const aOffset: number[] = [];
    const aColor: number[] = [];
    const aMetrics: number[] = [];

    let processedColors: THREE.Color | THREE.Color[];
    const colors = options.colors.sticks;
    if (Array.isArray(colors)) {
      processedColors = colors.map(c => new THREE.Color(c));
    } else {
      processedColors = new THREE.Color(colors);
    }

    for (let i = 0; i < totalSticks; i++) {
      const width = random(options.lightStickWidth);
      const height = random(options.lightStickHeight);
      aOffset.push((i - 1) * stickoffset * 2 + stickoffset * Math.random());

      const color = pickRandom(processedColors);
      aColor.push(color.r, color.g, color.b);

      aMetrics.push(width, height);
    }

    instanced.setAttribute('aOffset', new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 1, false));
    instanced.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3, false));
    instanced.setAttribute('aMetrics', new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 2, false));

    const material = new THREE.ShaderMaterial({
      fragmentShader: sideSticksFragment,
      vertexShader: sideSticksVertex,
      side: THREE.DoubleSide,
      uniforms: Object.assign(
        {
          uTravelLength: { value: options.length },
          uTime: { value: 0 }
        },
        this.webgl.fogUniforms,
        this.webgl.options.distortion.uniforms
      )
    });

    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <getDistortion_vertex>',
        this.webgl.options.distortion.getDistortion
      );
    };

    const mesh = new THREE.Mesh(instanced, material);
    mesh.frustumCulled = false;
    this.webgl.scene.add(mesh);
    this.mesh = mesh;
  }

  public update(time: number): void {
    const material = this.mesh.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = time;
  }
}

class Road {
  private webgl: App;
  private options: HyperspeedOptions;
  private uTime: { value: number };
  public leftRoadWay!: THREE.Mesh;
  public rightRoadWay!: THREE.Mesh;
  public island!: THREE.Mesh;

  constructor(webgl: App, options: HyperspeedOptions) {
    this.webgl = webgl;
    this.options = options;
    this.uTime = { value: 0 };
  }

  private createPlane(side: number, _width: number, isRoad: boolean): THREE.Mesh {
    const options = this.options;
    const segments = 100;
    const geometry = new THREE.PlaneGeometry(
      isRoad ? options.roadWidth : options.islandWidth,
      options.length,
      20,
      segments
    );
    
    let uniforms: Record<string, unknown> = {
      uTravelLength: { value: options.length },
      uColor: { value: new THREE.Color(isRoad ? options.colors.roadColor : options.colors.islandColor) },
      uTime: this.uTime
    };

    if (isRoad) {
      uniforms = Object.assign(uniforms, {
        uLanes: { value: options.lanesPerRoad },
        uBrokenLinesColor: { value: new THREE.Color(options.colors.brokenLines) },
        uShoulderLinesColor: { value: new THREE.Color(options.colors.shoulderLines) },
        uShoulderLinesWidthPercentage: { value: options.shoulderLinesWidthPercentage },
        uBrokenLinesLengthPercentage: { value: options.brokenLinesLengthPercentage },
        uBrokenLinesWidthPercentage: { value: options.brokenLinesWidthPercentage }
      });
    }

    const material = new THREE.ShaderMaterial({
      fragmentShader: isRoad ? roadFragment : islandFragment,
      vertexShader: roadVertex,
      side: THREE.DoubleSide,
      uniforms: Object.assign(uniforms, this.webgl.fogUniforms, (this.webgl.options.distortion as DistortionConfig).uniforms)
    });

    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <getDistortion_vertex>',
        (this.webgl.options.distortion as DistortionConfig).getDistortion
      );
    };

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.z = -options.length / 2;
    mesh.position.x += (this.options.islandWidth / 2 + options.roadWidth / 2) * side;
    this.webgl.scene.add(mesh);

    return mesh;
  }

  public init(): void {
    this.leftRoadWay = this.createPlane(-1, this.options.roadWidth, true);
    this.rightRoadWay = this.createPlane(1, this.options.roadWidth, true);
    this.island = this.createPlane(0, this.options.islandWidth, false);
  }

  public update(time: number): void {
    this.uTime.value = time;
  }
}

class App {
  public options: HyperspeedOptions & { distortion: DistortionConfig };
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public composer: EffectComposer;
  public camera: THREE.PerspectiveCamera;
  public scene: THREE.Scene;
  public fogUniforms: Record<string, { value: unknown }>;
  public clock: THREE.Clock;
  public assets: Record<string, unknown>;
  public disposed: boolean;
  public road: Road;
  public leftCarLights: CarLights;
  public rightCarLights: CarLights;
  public leftSticks: LightsSticks;
  public fovTarget: number;
  public speedUpTarget: number;
  public speedUp: number;
  public timeOffset: number;
  private renderPass!: RenderPass;
  private bloomPass!: EffectPass;
  private resizeHandler: () => void;
  private mouseDownHandler: (ev: MouseEvent) => void;
  private mouseUpHandler: (ev: MouseEvent) => void;
  private touchStartHandler: (ev: TouchEvent) => void;
  private touchEndHandler: (ev: TouchEvent) => void;
  private contextMenuHandler: (ev: MouseEvent) => void;

  constructor(container: HTMLElement, options: HyperspeedOptions) {
    this.container = container;
    const distortionConfig = distortions[options.distortion] || distortions.LongRaceDistortion;
    this.options = { ...options, distortion: distortionConfig } as HyperspeedOptions & { distortion: DistortionConfig };
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true
    });
    this.renderer.setSize(container.offsetWidth, container.offsetHeight, false);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.composer = new EffectComposer(this.renderer);
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      options.fov,
      container.offsetWidth / container.offsetHeight,
      0.1,
      10000
    );
    this.camera.position.z = -5;
    this.camera.position.y = 8;
    this.camera.position.x = 0;
    this.scene = new THREE.Scene();
    this.scene.background = null;

    const fog = new THREE.Fog(options.colors.background, options.length * 0.2, options.length * 500);
    this.scene.fog = fog;
    this.fogUniforms = {
      fogColor: { value: fog.color },
      fogNear: { value: fog.near },
      fogFar: { value: fog.far }
    };
    this.clock = new THREE.Clock();
    this.assets = {};
    this.disposed = false;

    this.road = new Road(this, options);
    this.leftCarLights = new CarLights(
      this,
      options,
      options.colors.leftCars,
      options.movingAwaySpeed,
      new THREE.Vector2(0, 1 - options.carLightsFade)
    );
    this.rightCarLights = new CarLights(
      this,
      options,
      options.colors.rightCars,
      options.movingCloserSpeed,
      new THREE.Vector2(1, 0 + options.carLightsFade)
    );
    this.leftSticks = new LightsSticks(this, options);

    this.fovTarget = options.fov;
    this.speedUpTarget = 0;
    this.speedUp = 0;
    this.timeOffset = 0;

    // Bind handlers
    this.resizeHandler = this.onWindowResize.bind(this);
    this.mouseDownHandler = this.onMouseDown.bind(this);
    this.mouseUpHandler = this.onMouseUp.bind(this);
    this.touchStartHandler = this.onTouchStart.bind(this);
    this.touchEndHandler = this.onTouchEnd.bind(this);
    this.contextMenuHandler = this.onContextMenu.bind(this);

    window.addEventListener('resize', this.resizeHandler);
  }

  private onWindowResize(): void {
    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.composer.setSize(width, height);
  }

  private initPasses(): void {
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new EffectPass(
      this.camera,
      new BloomEffect({
        luminanceThreshold: 0.2,
        luminanceSmoothing: 0,
        resolutionScale: 1
      })
    );

    const smaaPass = new EffectPass(
      this.camera,
      new SMAAEffect({
        preset: SMAAPreset.MEDIUM
      })
    );
    this.renderPass.renderToScreen = false;
    this.bloomPass.renderToScreen = false;
    smaaPass.renderToScreen = true;
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(smaaPass);
  }

  public loadAssets(): Promise<void> {
    const assets = this.assets;
    return new Promise((resolve) => {
      const manager = new THREE.LoadingManager(resolve);

      const searchImage = new Image();
      const areaImage = new Image();
      assets.smaa = {};
      searchImage.addEventListener('load', function () {
        (assets.smaa as Record<string, HTMLImageElement>).search = this;
        manager.itemEnd('smaa-search');
      });

      areaImage.addEventListener('load', function () {
        (assets.smaa as Record<string, HTMLImageElement>).area = this;
        manager.itemEnd('smaa-area');
      });
      manager.itemStart('smaa-search');
      manager.itemStart('smaa-area');

      searchImage.src = SMAAEffect.searchImageDataURL;
      areaImage.src = SMAAEffect.areaImageDataURL;
    });
  }

  public init(): void {
    this.initPasses();
    const options = this.options;
    this.road.init();
    this.leftCarLights.init();

    this.leftCarLights.mesh.position.setX(-options.roadWidth / 2 - options.islandWidth / 2);
    this.rightCarLights.init();
    this.rightCarLights.mesh.position.setX(options.roadWidth / 2 + options.islandWidth / 2);
    this.leftSticks.init();
    this.leftSticks.mesh.position.setX(-(options.roadWidth + options.islandWidth / 2));

    this.container.addEventListener('mousedown', this.mouseDownHandler);
    this.container.addEventListener('mouseup', this.mouseUpHandler);
    this.container.addEventListener('mouseout', this.mouseUpHandler);

    this.container.addEventListener('touchstart', this.touchStartHandler, { passive: true });
    this.container.addEventListener('touchend', this.touchEndHandler, { passive: true });
    this.container.addEventListener('touchcancel', this.touchEndHandler, { passive: true });

    this.container.addEventListener('contextmenu', this.contextMenuHandler);

    this.tick();
  }

  private onMouseDown(ev: MouseEvent): void {
    if (this.options.onSpeedUp) this.options.onSpeedUp(ev);
    this.fovTarget = this.options.fovSpeedUp;
    this.speedUpTarget = this.options.speedUp;
  }

  private onMouseUp(ev: MouseEvent): void {
    if (this.options.onSlowDown) this.options.onSlowDown(ev);
    this.fovTarget = this.options.fov;
    this.speedUpTarget = 0;
  }

  private onTouchStart(ev: TouchEvent): void {
    if (this.options.onSpeedUp) this.options.onSpeedUp(ev);
    this.fovTarget = this.options.fovSpeedUp;
    this.speedUpTarget = this.options.speedUp;
  }

  private onTouchEnd(ev: TouchEvent): void {
    if (this.options.onSlowDown) this.options.onSlowDown(ev);
    this.fovTarget = this.options.fov;
    this.speedUpTarget = 0;
  }

  private onContextMenu(ev: MouseEvent): void {
    ev.preventDefault();
  }

  private update(delta: number): void {
    const lerpPercentage = Math.exp(-(-60 * Math.log2(1 - 0.1)) * delta);
    this.speedUp += lerp(this.speedUp, this.speedUpTarget, lerpPercentage, 0.00001);
    this.timeOffset += this.speedUp * delta;

    const time = this.clock.elapsedTime + this.timeOffset;

    this.rightCarLights.update(time);
    this.leftCarLights.update(time);
    this.leftSticks.update(time);
    this.road.update(time);

    let updateCamera = false;
    const fovChange = lerp(this.camera.fov, this.fovTarget, lerpPercentage);
    if (fovChange !== 0) {
      this.camera.fov += fovChange * delta * 6;
      updateCamera = true;
    }

    if (this.options.distortion.getJS) {
      const distortion = this.options.distortion.getJS(0.025, time);

      this.camera.lookAt(
        new THREE.Vector3(
          this.camera.position.x + distortion.x,
          this.camera.position.y + distortion.y,
          this.camera.position.z + distortion.z
        )
      );
      updateCamera = true;
    }
    if (updateCamera) {
      this.camera.updateProjectionMatrix();
    }
  }

  private render(delta: number): void {
    this.composer.render(delta);
  }

  public dispose(): void {
    this.disposed = true;

    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.composer) {
      this.composer.dispose();
    }
    if (this.scene) {
      this.scene.clear();
    }

    window.removeEventListener('resize', this.resizeHandler);
    if (this.container) {
      this.container.removeEventListener('mousedown', this.mouseDownHandler);
      this.container.removeEventListener('mouseup', this.mouseUpHandler);
      this.container.removeEventListener('mouseout', this.mouseUpHandler);

      this.container.removeEventListener('touchstart', this.touchStartHandler);
      this.container.removeEventListener('touchend', this.touchEndHandler);
      this.container.removeEventListener('touchcancel', this.touchEndHandler);
      this.container.removeEventListener('contextmenu', this.contextMenuHandler);
    }
  }

  private setSize(width: number, height: number, updateStyles: boolean): void {
    this.composer.setSize(width, height, updateStyles);
  }

  private tick(): void {
    if (this.disposed || !this) return;
    if (resizeRendererToDisplaySize(this.renderer, this.setSize.bind(this))) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }
    const delta = this.clock.getDelta();
    this.render(delta);
    this.update(delta);
    requestAnimationFrame(() => this.tick());
  }
}

// Export function
export async function initHyperspeed(container: HTMLElement, options: HyperspeedOptions): Promise<{ dispose: () => void }> {
  const app = new App(container, options);
  await app.loadAssets();
  app.init();
  
  return {
    dispose: () => app.dispose()
  };
}

