export class HyperspeedBackground {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationId: number | null = null;
  private particles: Array<{
    x: number;
    y: number;
    z: number;
    speed: number;
  }> = [];
  private readonly particleCount: number = 200;
  private readonly maxDepth: number = 2000;

  public initialize(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} not found`);
      return;
    }

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'hyperspeed-canvas';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
    `;

    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    
    if (!this.ctx) {
      console.error('Failed to get canvas context');
      return;
    }

    this.resize();
    this.initParticles();
    this.animate();

    window.addEventListener('resize', () => {
      this.resize();
    });
  }

  private resize(): void {
    if (!this.canvas) return;
    
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * (this.canvas?.width || 1920) - (this.canvas?.width || 1920) / 2,
        y: Math.random() * (this.canvas?.height || 1080) - (this.canvas?.height || 1080) / 2,
        z: Math.random() * this.maxDepth,
        speed: 2 + Math.random() * 3
      });
    }
  }

  private animate(): void {
    if (!this.ctx || !this.canvas) return;

    this.ctx.fillStyle = 'rgba(30, 60, 114, 0.1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      
      // Move particle forward
      particle.z -= particle.speed;

      // Reset if too close
      if (particle.z <= 0) {
        particle.z = this.maxDepth;
        particle.x = Math.random() * this.canvas.width - this.canvas.width / 2;
        particle.y = Math.random() * this.canvas.height - this.canvas.height / 2;
      }

      // Calculate perspective
      const perspective = 200 / (particle.z + 200);
      const x = particle.x * perspective + centerX;
      const y = particle.y * perspective + centerY;
      const size = perspective * 2;

      // Draw particle
      const alpha = 1 - particle.z / this.maxDepth;
      this.ctx.fillStyle = `rgba(102, 126, 234, ${alpha * 0.8})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw trail
      if (particle.z < this.maxDepth * 0.8) {
        const prevZ = particle.z + particle.speed * 10;
        const prevPerspective = 200 / (prevZ + 200);
        const prevX = particle.x * prevPerspective + centerX;
        const prevY = particle.y * prevPerspective + centerY;

        const gradient = this.ctx.createLinearGradient(prevX, prevY, x, y);
        gradient.addColorStop(0, `rgba(102, 126, 234, ${alpha * 0.3})`);
        gradient.addColorStop(1, `rgba(102, 126, 234, ${alpha * 0.8})`);

        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = size;
        this.ctx.beginPath();
        this.ctx.moveTo(prevX, prevY);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
      }
    }

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  public destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

