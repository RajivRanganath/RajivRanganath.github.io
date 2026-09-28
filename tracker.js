// Multi-target tracking core for the hero demo.
// Constant-velocity Kalman filters, fed by one noisy + cluttered detection stream,
// associated two ways at once: GNN (Hungarian assignment) and JPDA (Fitzgerald's
// "cheap JPDA" approximation of the joint association probabilities).
// Pure logic, no DOM: runs in the browser and in node (see tracker.check.js).
(function () {
  const GATE = 9.21;      // chi-square 99%, 2 dof
  const LOST_ERR = 7;     // track declared lost when estimate is this far from truth
  const REACQUIRE = 8;    // scans before a lost track is re-initialised
  const WINDOW = 300;     // rolling window for association accuracy
  const BIG = 1e6;

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const gauss = r => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r());
  function poisson(r, l) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }

  // Hungarian algorithm (potentials form), n rows <= m cols. Returns row -> col.
  function hungarian(a) {
    const n = a.length, m = a[0].length, INF = Infinity;
    const u = new Array(n + 1).fill(0), v = new Array(m + 1).fill(0), p = new Array(m + 1).fill(0), way = new Array(m + 1).fill(0);
    for (let i = 1; i <= n; i++) {
      p[0] = i; let j0 = 0;
      const minv = new Array(m + 1).fill(INF), used = new Array(m + 1).fill(false);
      do {
        used[j0] = true; const i0 = p[j0]; let delta = INF, j1 = 0;
        for (let j = 1; j <= m; j++) if (!used[j]) {
          const cur = a[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
        for (let j = 0; j <= m; j++) if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
        j0 = j1;
      } while (p[j0] !== 0);
      do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
    }
    const ans = new Array(n).fill(-1);
    for (let j = 1; j <= m; j++) if (p[j]) ans[p[j] - 1] = j - 1;
    return ans;
  }

  // --- Kalman filter, state [x, y, vx, vy], position-only measurements ---
  const Q_ACC = 0.03;
  function predict(t) {
    const [x, y, vx, vy] = t.x, P = t.P;
    t.x = [x + vx, y + vy, vx, vy];
    // P = F P F^T + Q, F = [[1,0,1,0],[0,1,0,1],[0,0,1,0],[0,0,0,1]]
    const FP = [0, 1, 2, 3].map(i => i < 2 ? P[i].map((_, j) => P[i][j] + P[i + 2][j]) : P[i].slice());
    const n = FP.map(row => [row[0] + row[2], row[1] + row[3], row[2], row[3]]);
    const q = Q_ACC, q4 = q / 4, q2 = q / 2;
    n[0][0] += q4; n[1][1] += q4; n[2][2] += q; n[3][3] += q;
    n[0][2] += q2; n[2][0] += q2; n[1][3] += q2; n[3][1] += q2;
    t.P = n;
  }
  function innovationSpace(t, R) {
    const P = t.P;
    const S = [[P[0][0] + R, P[0][1]], [P[1][0], P[1][1] + R]];
    const det = S[0][0] * S[1][1] - S[0][1] * S[1][0];
    const Si = [[S[1][1] / det, -S[0][1] / det], [-S[1][0] / det, S[0][0] / det]];
    const K = P.map(row => [row[0] * Si[0][0] + row[1] * Si[1][0], row[0] * Si[0][1] + row[1] * Si[1][1]]);
    return { S, Si, det, K };
  }
  const mahal = (nu, Si) => nu[0] * (Si[0][0] * nu[0] + Si[0][1] * nu[1]) + nu[1] * (Si[1][0] * nu[0] + Si[1][1] * nu[1]);
  // PDA-style update; a plain KF update is the special case beta0 = 0 with one innovation.
  function update(t, K, S, betas, nus) {
    const b = betas.reduce((s, x) => s + x, 0), b0 = 1 - b;
    const nc = [0, 0], spread = [[0, 0], [0, 0]];
    betas.forEach((w, k) => {
      const n = nus[k]; nc[0] += w * n[0]; nc[1] += w * n[1];
      spread[0][0] += w * n[0] * n[0]; spread[0][1] += w * n[0] * n[1]; spread[1][0] += w * n[1] * n[0]; spread[1][1] += w * n[1] * n[1];
    });
    spread[0][0] -= nc[0] * nc[0]; spread[0][1] -= nc[0] * nc[1]; spread[1][0] -= nc[1] * nc[0]; spread[1][1] -= nc[1] * nc[1];
    t.x = t.x.map((v, i) => v + K[i][0] * nc[0] + K[i][1] * nc[1]);
    // P = P - b * K S K^T + K spread K^T
    const M = [[b * S[0][0] - spread[0][0], b * S[0][1] - spread[0][1]], [b * S[1][0] - spread[1][0], b * S[1][1] - spread[1][1]]];
    const KM = K.map(r => [r[0] * M[0][0] + r[1] * M[1][0], r[0] * M[0][1] + r[1] * M[1][1]]);
    t.P = t.P.map((row, i) => row.map((v, j) => v - (KM[i][0] * K[j][0] + KM[i][1] * K[j][1])));
    return b0;
  }

  function createSim(opts = {}) {
    const W = opts.width || 100, H = opts.height || 100;
    const rand = mulberry32(opts.seed || 7);
    const sim = {
      W, H, clutter: opts.clutter ?? 12, pd: opts.pd ?? 0.92, sigma: opts.sigma ?? 1.3,
      targets: [], detections: [], scan: 0, nextId: 1,
      methods: { gnn: { hits: [], losses: [] }, jpda: { hits: [], losses: [] } },
    };
    const newTrack = tg => ({
      x: [tg.x + gauss(rand), tg.y + gauss(rand), tg.vx, tg.vy],
      P: [[4, 0, 0, 0], [0, 4, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]], trail: [], lost: 0,
    });
    sim.addTarget = (x, y) => {
      const a = rand() * Math.PI * 2, s = 0.7 + rand() * 0.7;
      const tg = { id: sim.nextId++, x: x ?? 10 + rand() * (W - 20), y: y ?? 10 + rand() * (H - 20), vx: Math.cos(a) * s, vy: Math.sin(a) * s };
      tg.tracks = { gnn: newTrack(tg), jpda: newTrack(tg) };
      sim.targets.push(tg);
      if (sim.targets.length > (opts.maxTargets || 10)) sim.targets.shift();
      return tg;
    };
    for (let i = 0; i < (opts.targets ?? 6); i++) sim.addTarget();

    const push = (arr, v, n) => { arr.push(v); if (arr.length > n) arr.shift(); };

    function associateGNN(active, dets, R) {
      const n = active.length, m = dets.length;
      if (!n) return [];
      const geo = active.map(({ t }) => innovationSpace(t, R));
      const cost = active.map(({ t }, i) => {
        const row = dets.map(d => { const nu = [d.x - t.x[0], d.y - t.x[1]]; const d2 = mahal(nu, geo[i].Si); return d2 < GATE ? d2 : BIG; });
        for (let k = 0; k < n; k++) row.push(k === i ? GATE : BIG); // "no detection" option per track
        return row;
      });
      const pick = hungarian(cost);
      return active.map(({ t, tg }, i) => {
        const j = pick[i] < m ? pick[i] : -1;
        const { S, K } = geo[i];
        if (j >= 0) update(t, K, S, [1], [[dets[j].x - t.x[0], dets[j].y - t.x[1]]]);
        return j >= 0 ? dets[j].src === tg.id : !dets.some(d => d.src === tg.id);
      });
    }

    function associateJPDA(active, dets, R) {
      const density = sim.clutter / (W * H);
      const B = Math.max(density, 1e-4) * (1 - sim.pd * 0.99) / sim.pd;
      const geo = active.map(({ t }) => innovationSpace(t, R));
      const G = active.map(({ t }, i) => dets.map(d => {
        const nu = [d.x - t.x[0], d.y - t.x[1]], d2 = mahal(nu, geo[i].Si);
        return d2 < GATE ? Math.exp(-d2 / 2) / (2 * Math.PI * Math.sqrt(geo[i].det)) : 0;
      }));
      const St = G.map(r => r.reduce((s, x) => s + x, 0));
      const Sr = dets.map((_, j) => G.reduce((s, r) => s + r[j], 0));
      return active.map(({ t, tg }, i) => {
        const idx = [], betas = [], nus = [];
        G[i].forEach((g, j) => { if (g > 0) { idx.push(j); betas.push(g / (St[i] + Sr[j] - g + B)); nus.push([dets[j].x - t.x[0], dets[j].y - t.x[1]]); } });
        const sum = betas.reduce((s, x) => s + x, 0);
        if (sum > 1) betas.forEach((_, k) => betas[k] /= sum); // keep beta0 >= 0
        const { S, K } = geo[i];
        const b0 = update(t, K, S, betas, nus);
        let best = -1, bw = b0;
        betas.forEach((w, k) => { if (w > bw) { bw = w; best = idx[k]; } });
        t.beta = 1 - b0;
        return best >= 0 ? dets[best].src === tg.id : !dets.some(d => d.src === tg.id);
      });
    }

    sim.step = () => {
      sim.scan++;
      for (const tg of sim.targets) {
        tg.vx += gauss(rand) * 0.04; tg.vy += gauss(rand) * 0.04;
        const s = Math.hypot(tg.vx, tg.vy); if (s > 1.6) { tg.vx *= 1.6 / s; tg.vy *= 1.6 / s; }
        // steer smoothly away from the edges (a hard bounce is a maneuver no CV filter can follow)
        const m = 14, push = 0.06;
        if (tg.x < m) tg.vx += push; if (tg.x > W - m) tg.vx -= push;
        if (tg.y < m) tg.vy += push; if (tg.y > H - m) tg.vy -= push;
        tg.x = Math.min(W - 1, Math.max(1, tg.x + tg.vx)); tg.y = Math.min(H - 1, Math.max(1, tg.y + tg.vy));
      }
      const dets = [];
      for (const tg of sim.targets) if (rand() < sim.pd) dets.push({ x: tg.x + gauss(rand) * sim.sigma, y: tg.y + gauss(rand) * sim.sigma, src: tg.id });
      const nc = poisson(rand, sim.clutter);
      for (let k = 0; k < nc; k++) dets.push({ x: rand() * W, y: rand() * H, src: 0 });
      sim.detections = dets;

      const R = sim.sigma * sim.sigma;
      for (const name of ['gnn', 'jpda']) {
        const M = sim.methods[name];
        const active = [];
        let lostNow = 0;
        for (const tg of sim.targets) {
          const t = tg.tracks[name];
          if (t.lost > 0) { if (--t.lost === 0) tg.tracks[name] = newTrack(tg); continue; }
          predict(t); active.push({ t, tg });
        }
        const hits = name === 'gnn' ? associateGNN(active, dets, R) : associateJPDA(active, dets, R);
        hits.forEach(h => push(M.hits, h, WINDOW));
        for (const { t, tg } of active) {
          push(t.trail, [t.x[0], t.x[1]], 24);
          if (Math.hypot(t.x[0] - tg.x, t.x[1] - tg.y) > LOST_ERR || t.P[0][0] + t.P[1][1] > 150) { t.lost = REACQUIRE; t.trail = []; lostNow++; }
        }
        push(M.losses, lostNow, 100);
      }
    };

    sim.readout = name => {
      const M = sim.methods[name];
      const held = sim.targets.filter(tg => !tg.tracks[name].lost).length;
      return {
        accuracy: M.hits.length ? M.hits.filter(Boolean).length / M.hits.length : 1,
        held, total: sim.targets.length,
        losses: M.losses.reduce((s, x) => s + x, 0),
      };
    };
    return sim;
  }

  const api = { createSim, hungarian };
  if (typeof module === 'object' && module.exports) module.exports = api; else window.Tracker = api;
})();
