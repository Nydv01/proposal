/**
 * ActiveTheory-style boot loader — slash ring + /NN/ counter.
 */
export class ATLoader {
  constructor(root) {
    this.root = root;
    this.canvas = root?.querySelector('#at-loader-canvas');
    this.pctEl = root?.querySelector('#at-loader-pct');
    this.ctx = this.canvas?.getContext('2d');
    this.progress = 0;
    this.target = 0;
    this.angle = 0;
    this.done = false;
    this._raf = null;
  }

  setProgress(value) {
    this.target = Math.min(100, Math.max(0, value));
    if (this.pctEl) this.pctEl.textContent = `/${Math.round(this.target)}/`;
  }

  bump(delta) {
    this.setProgress(this.target + delta);
  }

  async finish() {
    this.setProgress(100);
    await new Promise((r) => setTimeout(r, 400));
    this.root?.classList.add('at-loader-out');
    this.done = true;
    await new Promise((r) => setTimeout(r, 900));
    this.destroy();
  }

  start() {
    if (!this.ctx) return;
    const draw = () => {
      if (this.done) return;
      this.progress += (this.target - this.progress) * 0.12;
      this.angle += 0.018;
      this.render();
      this._raf = requestAnimationFrame(draw);
    };
    draw();
    this.setProgress(8);
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width = this.canvas.clientWidth * devicePixelRatio;
    const h = this.canvas.height = this.canvas.clientHeight * devicePixelRatio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.11;
    const slashCount = 48;
    const filled = Math.floor((this.progress / 100) * slashCount);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);

    for (let i = 0; i < slashCount; i++) {
      const a = (i / slashCount) * Math.PI * 2;
      const active = i < filled;
      ctx.strokeStyle = active ? 'rgba(245,242,235,0.92)' : 'rgba(245,242,235,0.12)';
      ctx.lineWidth = 2 * devicePixelRatio;
      ctx.beginPath();
      const x1 = Math.cos(a) * (r - 6);
      const y1 = Math.sin(a) * (r - 6);
      const x2 = Math.cos(a) * (r + 10);
      const y2 = Math.sin(a) * (r + 10);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this.root?.remove();
  }
}
