// Live radar scope: two trackers (GNN, JPDA) on one detection stream, from tracker.js.
// Pointer reticle locks onto the nearest track and reads out its Kalman state.
(function scope() {
  const canvas = document.getElementById('scopeCanvas');
  if (!canvas || !window.Tracker) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sim = Tracker.createSim({ seed: 20260923, width: 100, height: 66, clutter: 20, targets: 6, maxTargets: 10 });
  let method = 'jpda', w = 0, h = 0, running = !reduceMotion, visible = false, sweep = 0, hover = null;
  const fade = [];   // recent detection batches for the phosphor afterglow
  const lostMarks = [];
  const PALETTE = {
    dark: { grid: 'rgba(255,255,255,.045)', det: 'rgba(214,222,232,.55)', truth: 'rgba(255,255,255,.22)', acc: '#ffb23f', bad: '#ff5a4e',
            sweep: 'rgba(255,178,63,.08)', sweep0: 'rgba(255,178,63,0)', sweepLine: 'rgba(255,178,63,.28)', trail: 'rgba(255,178,63,.45)', ell: 'rgba(255,178,63,.55)', box: 'rgba(8,10,14,.9)', boxText: '#c9d2de' },
    light: { grid: 'rgba(14,19,27,.06)', det: 'rgba(40,52,70,.55)', truth: 'rgba(14,19,27,.25)', acc: '#c2650a', bad: '#d92d20',
            sweep: 'rgba(217,119,6,.08)', sweep0: 'rgba(217,119,6,0)', sweepLine: 'rgba(180,83,9,.3)', trail: 'rgba(180,83,9,.5)', ell: 'rgba(180,83,9,.55)', box: 'rgba(255,255,255,.94)', boxText: '#2b3443' },
  };
  let C = PALETTE[document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'];
  document.addEventListener('themechange', e => { C = PALETTE[e.detail]; draw(); });

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect();
    w = r.width; h = r.height; canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const X = v => v / sim.W * w, Y = v => v / sim.H * h;

  function ellipse(P, cx, cy) {
    const a = P[0][0], b = P[0][1], c = P[1][1];
    const m = (a + c) / 2, d = Math.sqrt(((a - c) / 2) ** 2 + b * b);
    const ang = 0.5 * Math.atan2(2 * b, a - c);
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(2, 2 * Math.sqrt(m + d) * w / sim.W), Math.max(2, 2 * Math.sqrt(Math.max(m - d, 0)) * h / sim.H), ang, 0, Math.PI * 2);
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 10; i < sim.W; i += 10) { ctx.moveTo(X(i), 0); ctx.lineTo(X(i), h); }
    for (let i = 10; i < sim.H; i += 10) { ctx.moveTo(0, Y(i)); ctx.lineTo(w, Y(i)); }
    ctx.stroke();
    if (running) {
      const cx = w / 2, cy = h / 2, R = Math.hypot(w, h);
      const g = ctx.createConicGradient ? ctx.createConicGradient(sweep - 0.6, cx, cy) : null;
      if (g) { g.addColorStop(0, C.sweep0); g.addColorStop(0.095, C.sweep); g.addColorStop(0.1, C.sweep0); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
      ctx.strokeStyle = C.sweepLine; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R); ctx.stroke();
    }
    // real returns and clutter look identical, as they do to the tracker
    fade.forEach((batch, k) => {
      ctx.fillStyle = C.det; ctx.globalAlpha = (k + 1) / fade.length * 0.9;
      for (const d of batch) { ctx.beginPath(); ctx.arc(X(d.x), Y(d.y), 1.8, 0, Math.PI * 2); ctx.fill(); }
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.truth;
    for (const tg of sim.targets) { ctx.beginPath(); ctx.arc(X(tg.x), Y(tg.y), 6, 0, Math.PI * 2); ctx.stroke(); }
    for (const tg of sim.targets) {
      const t = tg.tracks[method];
      if (t.lost) continue;
      if (t.dx === undefined) { t.dx = t.x[0]; t.dy = t.x[1]; }
      t.dx += (t.x[0] - t.dx) * 0.25; t.dy += (t.x[1] - t.dy) * 0.25;
      const px = X(t.dx), py = Y(t.dy);
      if (t.trail.length > 1) {
        ctx.strokeStyle = C.trail; ctx.lineWidth = 1.5; ctx.beginPath();
        t.trail.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)));
        ctx.lineTo(px, py); ctx.stroke();
      }
      ctx.strokeStyle = C.ell; ctx.lineWidth = 1; ellipse(t.P, px, py); ctx.stroke();
      ctx.fillStyle = C.acc; ctx.beginPath(); ctx.moveTo(px, py - 5); ctx.lineTo(px + 5, py); ctx.lineTo(px, py + 5); ctx.lineTo(px - 5, py); ctx.closePath(); ctx.fill();
      ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.fillText('T' + tg.id, px + 8, py - 7);
    }
    for (let i = lostMarks.length - 1; i >= 0; i--) {
      const m = lostMarks[i]; m.life -= 1;
      if (m.life <= 0) { lostMarks.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, m.life / 30); ctx.strokeStyle = C.bad; ctx.fillStyle = C.bad; ctx.lineWidth = 1.5;
      const x = X(m.x), y = Y(m.y);
      ctx.beginPath(); ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6); ctx.stroke();
      ctx.font = '700 10px "JetBrains Mono", monospace'; ctx.fillText('LOST', x + 9, y + 4);
      ctx.globalAlpha = 1;
    }
    if (hover) reticle();
  }

  function reticle() {
    let best = null, bd = 48;
    for (const tg of sim.targets) {
      const t = tg.tracks[method];
      if (t.lost || t.dx === undefined) continue;
      const d = Math.hypot(X(t.dx) - hover.x, Y(t.dy) - hover.y);
      if (d < bd) { bd = d; best = { tg, t }; }
    }
    ctx.strokeStyle = C.acc; ctx.fillStyle = C.acc; ctx.lineWidth = 1.2;
    if (!best) {
      const { x, y } = hover;
      ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.moveTo(x - 16, y); ctx.lineTo(x - 5, y); ctx.moveTo(x + 5, y); ctx.lineTo(x + 16, y);
      ctx.moveTo(x, y - 16); ctx.lineTo(x, y - 5); ctx.moveTo(x, y + 5); ctx.lineTo(x, y + 16); ctx.stroke();
      ctx.globalAlpha = 1; return;
    }
    const { tg, t } = best, x = X(t.dx), y = Y(t.dy), r = 13, k = 5;
    ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.moveTo(x + sx * r, y + sy * (r - k)); ctx.lineTo(x + sx * r, y + sy * r); ctx.lineTo(x + sx * (r - k), y + sy * r);
    }
    ctx.stroke();
    const lines = ['LOCKED ON OBJECT ' + tg.id,
      'position   ' + t.x[0].toFixed(1) + ', ' + t.x[1].toFixed(1),
      'speed      ' + Math.hypot(t.x[2], t.x[3]).toFixed(2),
      'unsure by  \u00b1' + Math.sqrt((t.P[0][0] + t.P[1][1]) / 2).toFixed(2),
      'off truth  ' + Math.hypot(t.x[0] - tg.x, t.x[1] - tg.y).toFixed(2)];
    ctx.font = '500 10.5px "JetBrains Mono", monospace';
    const bw = 190, bh = lines.length * 15 + 12;
    let bx = x + 22, by = y - bh / 2;
    if (bx + bw > w - 6) bx = x - 22 - bw;
    by = Math.max(6, Math.min(h - bh - 6, by));
    ctx.fillStyle = C.box; ctx.fillRect(bx, by, bw, bh);
    ctx.strokeRect(bx + .5, by + .5, bw - 1, bh - 1);
    lines.forEach((l, i) => { ctx.fillStyle = i ? C.boxText : C.acc; ctx.fillText(l, bx + 10, by + 18 + i * 15); });
  }

  const el = id => document.getElementById(id);
  function readouts() {
    for (const m of ['gnn', 'jpda']) {
      const r = sim.readout(m);
      el(m + 'Held').textContent = r.held + '/' + r.total;
      el(m + 'Lost').textContent = r.losses;
      el(m + 'Lost').parentElement.classList.toggle('bad', r.losses >= 3);
    }
    el('scanNo').textContent = 'SCAN ' + String(sim.scan).padStart(4, '0');
  }
  function step() {
    const before = sim.targets.map(tg => tg.tracks[method].lost);
    sim.step();
    sim.targets.forEach((tg, i) => { if (!before[i] && tg.tracks[method].lost) lostMarks.push({ x: tg.x, y: tg.y, life: 90 }); });
    fade.push(sim.detections); if (fade.length > 4) fade.shift();
    readouts();
  }

  let last = 0, acc = 0;
  function loop(now) {
    if (!running || !visible) return;
    const dt = Math.min(now - last, 100); last = now; acc += dt;
    sweep = (sweep + dt * 0.0035) % (Math.PI * 2);
    if (acc > 230) { acc = 0; step(); }
    draw();
    requestAnimationFrame(loop);
  }
  const start = () => { if (running && visible) { last = performance.now(); requestAnimationFrame(loop); } };

  resize();
  for (let i = 0; i < 30; i++) step();
  draw();
  new ResizeObserver(() => { resize(); draw(); }).observe(canvas);
  new IntersectionObserver(([e]) => { const was = visible; visible = e.isIntersecting; if (visible && !was) start(); }).observe(canvas);

  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    hover = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (!running) draw();
  });
  canvas.addEventListener('pointerleave', () => { hover = null; if (!running) draw(); });
  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect();
    sim.addTarget((e.clientX - r.left) / r.width * sim.W, (e.clientY - r.top) / r.height * sim.H);
    readouts(); if (!running) draw();
  });
  document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
    method = b.dataset.m;
    document.querySelectorAll('.seg button').forEach(x => x.setAttribute('aria-pressed', x === b));
    document.querySelectorAll('.readout > div').forEach(d => d.classList.toggle('sel', d.dataset.r === method));
    lostMarks.length = 0; draw();
  }));
  el('clutter').addEventListener('input', e => { sim.clutter = +e.target.value; el('clutterOut').textContent = e.target.value; });
  const playBtn = el('playBtn');
  const syncPlay = () => { playBtn.innerHTML = `<i class="ph ph-${running ? 'pause' : 'play'}"></i>`; playBtn.setAttribute('aria-label', running ? 'Pause' : 'Play'); };
  playBtn.addEventListener('click', () => { running = !running; syncPlay(); start(); if (!running) draw(); });
  syncPlay();
})();
