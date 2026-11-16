// A lightweight foreground effect. It never transforms the galaxy or UI.
export class IdeaSpark {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.enabled = false;
    this.active = false;
    this.points = [];
    this.connections = [];
    this.position = { x: 0, y: 0 };
    this.lastMove = 0;
    this.speed = 0;
    this.dirty = false;
    this.resize();
  }

  resize() {
    // The canvas is display:none under reduced motion; measure its scene instead.
    this.width = this.canvas.parentElement.clientWidth;
    this.height = this.canvas.parentElement.clientHeight;
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.clear();
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled && this.ctx);
    if (!this.enabled) this.clear();
  }

  move(x, y, now) {
    if (!this.enabled) return;
    const elapsed = now - this.lastMove;
    const distance = Math.hypot(x - this.position.x, y - this.position.y);
    if (this.active && elapsed > 0 && elapsed < .12) {
      this.speed = Math.min(2, this.speed * .5 + distance / (elapsed * 1000) * .5);
      const samples = Math.min(28, Math.max(1, Math.ceil(distance / 5)));
      for (let i = 1; i <= samples; i++) {
        const t = i / samples;
        this.points.push({ x: this.position.x + (x - this.position.x) * t, y: this.position.y + (y - this.position.y) * t, born: now });
      }
      this.points = this.points.slice(-96);
    } else {
      this.points = [];
      this.speed = 0;
    }
    this.position = { x, y };
    this.lastMove = now;
    this.active = true;
    this.dirty = true;
  }

  leave() {
    this.active = false;
    this.points = [];
    this.speed = 0;
    this.dirty = true;
  }

  connect(from, to, color, now) {
    if (!this.ctx) return;
    const dx = to.x - from.x, dy = to.y - from.y;
    this.connections.push({ from, to, color, born: now, control: { x: (from.x + to.x) / 2 - dy * .14, y: (from.y + to.y) / 2 + dx * .14 } });
    this.connections = this.connections.slice(-3);
    this.dirty = true;
  }

  clear() {
    this.active = false;
    this.points = [];
    this.connections = [];
    this.speed = 0;
    this.lastMove = 0;
    this.ctx?.clearRect(0, 0, this.width, this.height);
    this.dirty = false;
  }

  render(now) {
    const ctx = this.ctx;
    if (!ctx || !this.dirty && !this.active && !this.connections.length) return;
    ctx.clearRect(0, 0, this.width, this.height);
    this.dirty = false;
    this.connections = this.connections.filter(connection => now - connection.born < .8);
    for (const connection of this.connections) {
      const { from, to, control, color, born } = connection;
      const progress = Math.min(1, (now - born) / .65);
      const fade = Math.max(0, 1 - Math.max(0, now - born - .45) / .35);
      const pointAt = t => ({ x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * control.x + t * t * to.x, y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * control.y + t * t * to.y });
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = .18 * fade;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
      ctx.stroke();
      ctx.shadowColor = color;
      ctx.shadowBlur = 9;
      for (let i = 0; i < 12; i++) {
        const t = progress - i * .012;
        if (t < 0) continue;
        const point = pointAt(t);
        ctx.globalAlpha = (1 - i / 12) * fade;
        ctx.fillStyle = i === 0 ? '#fff6e8' : color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, i === 0 ? 2.5 : 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    this.points = this.points.filter(point => now - point.born < .55);
    if (!this.active) return;
    const idle = Math.max(0, now - this.lastMove);
    const energy = this.speed * Math.exp(-idle * 9);
    const maxLength = 28 + Math.min(1, energy) * 115;
    let length = 0;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = this.points.length - 1; i > 0; i--) {
      const a = this.points[i], b = this.points[i - 1];
      length += Math.hypot(a.x - b.x, a.y - b.y);
      if (length > maxLength) break;
      const fade = Math.max(0, 1 - (now - a.born) / .55) * (1 - length / maxLength);
      ctx.globalAlpha = fade * .65;
      ctx.strokeStyle = length < maxLength * .3 ? '#ffe8ca' : '#b5b0ff';
      ctx.lineWidth = 1.5 + fade;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(a.x, a.y); ctx.stroke();
      if (i % 3 === 0) {
        const drift = (now - a.born) * 13;
        ctx.globalAlpha = fade * .5;
        ctx.fillStyle = '#e6d5ff';
        ctx.beginPath(); ctx.arc(a.x + Math.sin(i * 2.4) * drift, a.y + Math.cos(i * 1.8) * drift, .75, 0, Math.PI * 2); ctx.fill();
      }
    }
    const { x, y } = this.position;
    ctx.globalAlpha = 1;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, 17);
    halo.addColorStop(0, '#fff2dcaa');
    halo.addColorStop(.25, '#ffcf8b40');
    halo.addColorStop(1, '#b19cff00');
    ctx.fillStyle = halo; ctx.fillRect(x - 17, y - 17, 34, 34);
    ctx.fillStyle = '#fff6e4';
    ctx.beginPath();
    ctx.moveTo(x, y - 6); ctx.lineTo(x + 1.5, y - 1.5); ctx.lineTo(x + 6, y);
    ctx.lineTo(x + 1.5, y + 1.5); ctx.lineTo(x, y + 6); ctx.lineTo(x - 1.5, y + 1.5);
    ctx.lineTo(x - 6, y); ctx.lineTo(x - 1.5, y - 1.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
