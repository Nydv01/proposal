/**
 * ActiveTheory-style mouse drip tubes from top & bottom screen edges.
 */
export class MouseTubes {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.drips = [];
    this.mouseX = window.innerWidth / 2;
    this.maxDrips = 450;
    this.colors = ['#3ec1b0', '#ff4a76', '#ff8ca3', '#ffd25a', '#a78bfa'];
  }

  bind() {
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      if (Math.random() > 0.25) this.spawn('top');
      if (Math.random() > 0.25) this.spawn('bottom');
      if (Math.random() > 0.7) this.spawn('top');
    });
    window.addEventListener('touchmove', (e) => {
      if (!e.touches.length) return;
      this.mouseX = e.touches[0].clientX;
      this.spawn('top');
      this.spawn('bottom');
    }, { passive: true });
    this.animate();
  }

  spawn(edge) {
    if (this.drips.length >= this.maxDrips) this.drips.shift();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const x = this.mouseX + (Math.random() - 0.5) * 80;
    const y = edge === 'top' ? -8 : h + 8;
    this.drips.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.4,
      vy: edge === 'top' ? 1.2 + Math.random() * 2.5 : -(1.2 + Math.random() * 2.5),
      life: 0,
      maxLife: 55 + Math.random() * 45,
      width: 1.5 + Math.random() * 2.5,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      edge
    });
  }

  animate() {
    const ctx = this.ctx;
    const w = this.canvas.width = window.innerWidth * devicePixelRatio;
    const h = this.canvas.height = window.innerHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (let i = this.drips.length - 1; i >= 0; i--) {
      const d = this.drips[i];
      d.life++;
      d.x += d.vx;
      d.y += d.vy;
      d.vy += d.edge === 'top' ? 0.06 : -0.06;

      const alpha = 1 - d.life / d.maxLife;
      if (alpha <= 0) {
        this.drips.splice(i, 1);
        continue;
      }

      const grad = ctx.createLinearGradient(d.x, d.y - 20, d.x, d.y + 40);
      grad.addColorStop(0, `${d.color}00`);
      grad.addColorStop(0.3, `${d.color}${Math.floor(alpha * 180).toString(16).padStart(2, '0')}`);
      grad.addColorStop(1, `${d.color}00`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = d.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.vx * 8, d.y - d.vy * 8);
      ctx.stroke();

      ctx.fillStyle = d.color;
      ctx.globalAlpha = alpha * 0.85;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.width * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(this.animate.bind(this));
  }
}
