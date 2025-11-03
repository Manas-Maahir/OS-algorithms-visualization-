// animation.js
import { clamp } from './utils.js';

export class Animator {
  constructor(canvas, width=1000, height=480) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = canvas.width = width;
    this.h = canvas.height = height;
    this.history = []; // snapshots
    this.current = 0;
    this.playing = false;
    this.speed = 1; // multiplier; 1 means 1x
    this._raf = null;
    this.onFrameCallback = null;
  }

  loadHistory(history) {
    this.history = history;
    this.current = 0;
    this.draw();
  }

  setSpeed(v) {
    this.speed = v;
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    const baseInterval = 600; // ms per step at speed=1
    let lastTime = performance.now();
    const step = (now) => {
      const elapsed = now - lastTime;
      const interval = baseInterval / this.speed;
      if (elapsed >= interval) {
        lastTime = now;
        this.stepForward();
      }
      if (this.playing) this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }

  pause() {
    this.playing = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  stepForward() {
    this.current = clamp(this.current + 1, 0, Math.max(0, this.history.length - 1));
    this.draw();
    if (this.onFrameCallback) this.onFrameCallback(this.current);
  }

  stepBackward() {
    this.current = clamp(this.current - 1, 0, Math.max(0, this.history.length - 1));
    this.draw();
    if (this.onFrameCallback) this.onFrameCallback(this.current);
  }

  jumpTo(index) {
    this.current = clamp(index, 0, Math.max(0, this.history.length - 1));
    this.draw();
    if (this.onFrameCallback) this.onFrameCallback(this.current);
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0,0,this.w,this.h);

    if (!this.history || this.history.length === 0) {
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0,0,this.w,this.h);
      ctx.fillStyle = '#9fb7c9';
      ctx.font = '16px monospace';
      ctx.fillText('No simulation loaded. Configure processes and click Simulate.', 20, 30);
      return;
    }

    const snap = this.history[this.current];
    this._drawHeader(snap);
    this._drawCPU(snap);
    this._drawReadyQueue(snap);
    this._drawProcesses(snap);
  }

  _drawHeader(snap) {
    const ctx = this.ctx;
    ctx.fillStyle = '#031623';
    ctx.fillRect(0,0,this.w,56);
    ctx.fillStyle = '#dbeafe';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Time: ${snap.time}`, 20, 36);
    ctx.fillStyle = '#93c5fd';
    ctx.font = '12px monospace';
    ctx.fillText(`CPU: ${snap.cpu ?? 'Idle'}`, 150, 36);
  }

  _drawCPU(snap) {
    const ctx = this.ctx;
    const cx = 220, cy = 120, w = 260, h = 120;
    // CPU box
    ctx.fillStyle = '#01203a';
    ctx.fillRect(cx,cy,w,h);
    ctx.strokeStyle = '#ffb020';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx,cy,w,h);
    ctx.fillStyle = '#e6eef8';
    ctx.font = '14px sans-serif';
    ctx.fillText('CPU', cx+10, cy+20);
    ctx.font = '26px monospace';
    ctx.fillStyle = snap.cpu ? '#ffebb0' : '#9fb7c9';
    ctx.fillText(snap.cpu ? String(snap.cpu) : 'Idle', cx + 20, cy + 70);
  }

  _drawReadyQueue(snap) {
    const ctx = this.ctx;
    const x = 20, y = 120, w = 160, height = 300;
    ctx.fillStyle = '#021826';
    ctx.fillRect(x,y,w,height);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.strokeRect(x,y,w,height);
    ctx.fillStyle = '#cfeff6';
    ctx.font = '14px sans-serif';
    ctx.fillText('Ready Queue', x+10, y+20);

    // draw items vertically
    const list = snap.ready || [];
    const itemH = 28;
    for (let i=0;i<list.length;i++) {
      const pid = list[i];
      const yy = y + 36 + i * (itemH + 6);
      ctx.fillStyle = '#042f36';
      ctx.fillRect(x+8, yy, w-24, itemH);
      ctx.strokeStyle = '#06b6d4';
      ctx.strokeRect(x+8, yy, w-24, itemH);
      ctx.fillStyle = '#e6f9fb';
      ctx.font = '13px monospace';
      ctx.fillText(pid, x+16, yy + 19);
    }
  }

  _drawProcesses(snap) {
    const ctx = this.ctx;
    const x = 520, y = 120;
    ctx.fillStyle = '#021822';
    ctx.fillRect(x,y,440,300);
    ctx.strokeStyle = '#163a50';
    ctx.strokeRect(x,y,440,300);
    ctx.fillStyle = '#cfe7f6';
    ctx.font = '14px sans-serif';
    ctx.fillText('Processes (remaining time)', x+12, y+18);

    const procs = snap.procs || [];
    const cols = 3;
    const itemW = 420/cols;
    const itemH = 60;
    for (let i=0;i<procs.length;i++){
      const p = procs[i];
      const col = i % cols, row = Math.floor(i/cols);
      const xx = x + 12 + col * itemW;
      const yy = y + 28 + row * (itemH+12);
      // box
      ctx.fillStyle = p.pid === snap.cpu ? '#2b1608' : (p.remaining===0 ? '#0b2a18' : '#071922');
      ctx.fillRect(xx, yy, itemW-18, itemH);
      ctx.strokeStyle = p.pid === snap.cpu ? '#ffb020' : '#163a50';
      ctx.strokeRect(xx, yy, itemW-18, itemH);
      ctx.fillStyle = '#e9f6ff';
      ctx.font = '13px monospace';
      ctx.fillText(`${p.pid}`, xx+8, yy+20);
      ctx.fillText(`Rem: ${p.remaining}`, xx+8, yy+40);
    }
  }
}
