// Cinematic world: one Three.js scene the whole page flies through.
// main.js maps scroll ranges to camera shots (World.shots); this file interpolates the shot for the
// current scroll position, smooths the camera toward it and renders with bloom.
// Classic script on three r128 + its examples/js post-processing, so the page also runs from disk.
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 900px)').matches;
  const listeners = [];
  const World = window.World = {
    ok: false, shots: [], name: { form: 0 },
    stats: { debris: 0, approaches: 0, alt: 0 },
    on: fn => listeners.push(fn),
  };
  if (!window.THREE || !window.LAND) return;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const canvas = document.getElementById('world');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, powerPreference: 'high-performance' }); } catch (e) { return; }
  World.ok = true;
  document.documentElement.classList.add('webgl');

  const DPR = Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x05070b, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 4000);
  const U = { uTime: { value: 0 }, uPR: { value: DPR } };
  const R = World.R = 10;
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

  /* ---------- Earth: Bangalore faces +z, so every shot can be written in plain world coordinates ---------- */
  const earth = new THREE.Group();
  scene.add(earth);
  earth.rotation.y = -Math.PI / 2 - 77.59 * Math.PI / 180;
  earth.updateMatrixWorld();
  const local = (lat, lng, r) => { const a = lat * Math.PI / 180, o = lng * Math.PI / 180; return V(Math.cos(a) * Math.cos(o) * r, Math.sin(a) * r, -Math.cos(a) * Math.sin(o) * r); };
  const geo = World.geo = (lat, lng, r) => local(lat, lng, r).applyMatrix4(earth.matrixWorld);
  const B = World.B = geo(12.97, 77.59, R), N = World.N = B.clone().normalize();

  earth.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.994, 96, 96), new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV;
      void main(){ float f = 1.0 - max(dot(vN, vV), 0.0);
        gl_FragColor = vec4(vec3(0.018,0.024,0.04) + vec3(0.16,0.24,0.55)*pow(f,3.5)*0.5, 1.0); }`,
  })));
  // fresnel rim on the surface + soft halo outside the limb
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 96, 96), new THREE.ShaderMaterial(Object.assign({
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), 4.0);
      gl_FragColor = vec4(mix(vec3(0.35,0.5,1.0), vec3(1.0,0.66,0.3), 0.25) * f * 0.9, 1.0); }`,
  }, additive))));
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.16, 96, 96), new THREE.ShaderMaterial(Object.assign({
    side: THREE.BackSide,
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; void main(){ float i = pow(clamp(-dot(vN, vV), 0.0, 1.0), 1.7);
      gl_FragColor = vec4(mix(vec3(0.3,0.44,1.0), vec3(1.0,0.6,0.25), 0.3) * i * 0.75, 1.0); }`,
  }, additive))));

  // graticule every 30 degrees
  (function graticule() {
    const pts = [];
    for (let la = -60; la <= 60; la += 30) for (let lo = 0; lo < 360; lo += 3) pts.push(local(la, lo, R * 1.002), local(la, lo + 3, R * 1.002));
    for (let lo = 0; lo < 360; lo += 30) for (let la = -84; la < 84; la += 3) pts.push(local(la, lo, R * 1.002), local(la + 3, lo, R * 1.002));
    earth.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x9fb2d6, transparent: true, opacity: 0.06, depthWrite: false })));
  })();

  // land as dots, from the Fibonacci-sphere bitmask in js/land.js
  (function land() {
    const { n, bits } = window.LAND, raw = atob(bits), GA = Math.PI * (3 - Math.sqrt(5)), pos = [], rnd = [];
    for (let i = 0; i < n; i++) {
      if (!(raw.charCodeAt(i >> 3) & (1 << (i & 7)))) continue;
      const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), phi = i * GA;
      pos.push(Math.cos(phi) * r * R, y * R, Math.sin(phi) * r * R); rnd.push(Math.random());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aRnd', new THREE.Float32BufferAttribute(rnd, 1));
    earth.add(new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false,
      vertexShader: `attribute float aRnd; uniform float uTime, uPR; varying float vA; varying float vAmber;
        void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0);
          float facing = dot(normalize(normalMatrix*position), normalize(-mv.xyz));
          vAmber = step(0.966, aRnd);
          float tw = 0.65 + 0.35*sin(uTime*(0.5+aRnd*1.8) + aRnd*40.0);
          vA = smoothstep(-0.05, 0.45, facing) * tw;
          gl_PointSize = clamp(64.0*uPR / -mv.z, 1.0, 10.0*uPR) * (vAmber > 0.5 ? 1.5 : 1.0);
          gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying float vA; varying float vAmber;
        void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
          vec3 c = mix(vec3(0.66,0.73,0.86), vec3(1.0,0.72,0.3)*1.6, vAmber);
          gl_FragColor = vec4(c, vA * smoothstep(0.5, 0.1, d) * (vAmber > 0.5 ? 1.0 : 0.72)); }`,
    })));
  })();

  /* ---------- Deep space: stars and a faint nebula ---------- */
  (function sky() {
    const n = small ? 1800 : 3600, pos = new Float32Array(n * 3), size = new Float32Array(n), tint = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const v = V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(900 + Math.random() * 600);
      pos.set([v.x, v.y, v.z], i * 3); size[i] = 0.6 + Math.pow(Math.random(), 7) * 3; tint[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));
    scene.add(new THREE.Points(g, new THREE.ShaderMaterial(Object.assign({
      uniforms: U,
      vertexShader: `attribute float aSize, aTint; uniform float uTime, uPR; varying float vA; varying float vT;
        void main(){ vT = aTint; vA = 0.45 + 0.55*sin(uTime*(0.3+aTint) + aTint*60.0)*0.5 + 0.25;
          gl_PointSize = aSize*uPR; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying float vA; varying float vT;
        void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
          vec3 c = vT > 0.85 ? vec3(1.0,0.78,0.5) : (vT < 0.2 ? vec3(0.7,0.8,1.0) : vec3(0.9));
          gl_FragColor = vec4(c, vA*smoothstep(0.5,0.0,d)); }`,
    }, additive))));
    const neb = new THREE.Mesh(new THREE.SphereGeometry(2000, 48, 48), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vD;
        float h(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        float n(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
        float fbm(vec3 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*n(p); p *= 2.03; a *= 0.5; } return v; }
        void main(){ float a = fbm(vD*2.2), b = fbm(vD*3.6 + 7.0);
          vec3 c = vec3(0.02,0.027,0.043) + vec3(0.05,0.08,0.2)*pow(a,3.0)*1.5 + vec3(0.3,0.14,0.04)*pow(b,4.5)*0.9;
          gl_FragColor = vec4(c, 1.0); }`,
    }));
    neb.renderOrder = -1;
    scene.add(neb);
  })();

  /* ---------- Debris field: orbital elements as attributes, propagated on the GPU ---------- */
  const D = World.stats.debris = small ? 1500 : 3200;
  (function debris() {
    const orb = new Float32Array(D * 4), spd = new Float32Array(D), rnd = new Float32Array(D);
    for (let i = 0; i < D; i++) {
      const k = Math.random();
      const r = (k < 0.72 ? 1.07 + Math.random() * 0.2 : k < 0.92 ? 1.45 + Math.random() * 0.45 : 2.2 + Math.random() * 0.08) * R; // LEO / MEO / GEO
      const inc = k >= 0.92 ? (Math.random() - 0.5) * 0.08 : Math.acos(1 - 2 * Math.random()) * (Math.random() < 0.5 ? 1 : -1) * 0.9;
      orb.set([r, inc, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2], i * 4);
      spd[i] = 0.2 / Math.pow(r / R, 1.5) * (Math.random() < 0.08 ? -1 : 1);   // Kepler: omega ~ r^-1.5
      rnd[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(D * 3), 3));
    g.setAttribute('aOrbit', new THREE.Float32BufferAttribute(orb, 4));
    g.setAttribute('aSpeed', new THREE.Float32BufferAttribute(spd, 1));
    g.setAttribute('aRnd', new THREE.Float32BufferAttribute(rnd, 1));
    const pts = new THREE.Points(g, new THREE.ShaderMaterial(Object.assign({
      uniforms: U,
      vertexShader: `attribute vec4 aOrbit; attribute float aSpeed; attribute float aRnd; uniform float uTime, uPR; varying float vA; varying float vAmber;
        void main(){ float r = aOrbit.x, inc = aOrbit.y, raan = aOrbit.z, u = aOrbit.w + uTime*aSpeed;
          vec3 p = vec3(r*cos(u), 0.0, r*sin(u));
          p = vec3(p.x, -p.z*sin(inc), p.z*cos(inc));
          float c = cos(raan), s = sin(raan); p = vec3(p.x*c + p.z*s, p.y, -p.x*s + p.z*c);
          vec4 mv = modelViewMatrix*vec4(p,1.0);
          vAmber = step(0.94, aRnd); vA = 0.3 + 0.6*aRnd;
          gl_PointSize = clamp((vAmber > 0.5 ? 60.0 : 40.0)*uPR / -mv.z, 0.8*uPR, 4.0*uPR);
          gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying float vA; varying float vAmber;
        void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
          gl_FragColor = vec4(mix(vec3(0.8,0.85,0.95), vec3(1.0,0.66,0.25)*1.5, vAmber), vA*smoothstep(0.5,0.0,d)); }`,
    }, additive)));
    pts.frustumCulled = false;
    scene.add(pts);
  })();

  /* ---------- Tracked objects: pairs share a node crossing, so close approaches are real ---------- */
  const O = (r, inc, raan, ph, sp) => ({ r: r * R, inc, raan, ph, sp });
  const tracked = [
    O(1.34, 0.95, 0.0, 0.00, 0.26), O(1.34, 0.28, 0.0, 0.07, 0.26),
    O(1.58, 1.25, 1.9, 0.00, 0.19), O(1.58, 0.52, 1.9, 0.09, 0.19),
    O(1.22, 1.45, 3.7, 1.20, 0.31), O(1.9, 0.18, 5.1, 2.40, 0.15),
  ];
  const orbitPos = (o, u, out) => {
    let x = o.r * Math.cos(u), z = o.r * Math.sin(u), y = -z * Math.sin(o.inc); z = z * Math.cos(o.inc);
    const c = Math.cos(o.raan), s = Math.sin(o.raan);
    return out.set(x * c + z * s, y, -x * s + z * c);
  };
  const trackGeo = new THREE.BufferGeometry();
  trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(tracked.length * 3), 3));
  const trackPts = new THREE.Points(trackGeo, new THREE.ShaderMaterial(Object.assign({
    uniforms: U,
    vertexShader: `uniform float uPR, uTime; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0);
      gl_PointSize = clamp(170.0*uPR / -mv.z, 5.0*uPR, 18.0*uPR) * (0.85 + 0.15*sin(uTime*3.0)); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
      float core = smoothstep(0.2, 0.0, d), halo = smoothstep(0.5, 0.1, d)*0.5;
      gl_FragColor = vec4(vec3(1.0,0.72,0.3)*(core*2.0+halo), core + halo); }`,
  }, additive)));
  trackPts.frustumCulled = false;
  scene.add(trackPts);
  const orbitMat = new THREE.LineBasicMaterial({ color: 0xffb23f, transparent: true, opacity: 0.15, depthWrite: false });
  tracked.forEach(o => {
    const pts = [];
    for (let k = 0; k <= 200; k++) pts.push(orbitPos(o, k / 200 * Math.PI * 2, V()));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), orbitMat));
  });
  const conjGeo = new THREE.BufferGeometry().setFromPoints([V(), V()]);
  const conjLine = new THREE.Line(conjGeo, new THREE.LineBasicMaterial({ color: 0xff5a4e, transparent: true, opacity: 0, depthWrite: false }));
  const conjRing = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.3, 48), new THREE.MeshBasicMaterial({ color: 0xff5a4e, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  scene.add(conjLine, conjRing);

  /* ---------- Sprites: soft glow texture + text labels ---------- */
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const glow = (color, scale, opacity) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({ map: glowTex, color, opacity }, additive)));
    s.scale.setScalar(scale); return s;
  };

  /* ---------- Stations: one satellite per flagship project ---------- */
  const stations = World.stations = [[40, 0.22], [130, -0.28], [215, 0.34], [300, -0.12]]
    .map(([deg, y]) => V(Math.sin(deg * Math.PI / 180), y, Math.cos(deg * Math.PI / 180)).normalize().multiplyScalar(R * 1.7));
  const amber = 0xffb23f;
  const lineMat = o => new THREE.LineBasicMaterial({ color: amber, transparent: true, opacity: o, depthWrite: false });
  const st = stations.map((p, i) => {
    const g = new THREE.Group(); g.position.copy(p); g.lookAt(0, 0, 0); scene.add(g);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffb860 }));
    const shell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.95, 0)), lineMat(0.6));
    const body = new THREE.Group(); body.add(core, shell);
    [-1, 1].forEach(sd => {   // solar wings
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.62), new THREE.MeshBasicMaterial({ color: 0x0f1626, transparent: true, opacity: 0.92, side: THREE.DoubleSide }));
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.1, 0.62, 4, 1)), lineMat(0.7));
      const strut = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(sd * 0.9, 0, 0), V(sd * 1.25, 0, 0)]), lineMat(0.6));
      wing.position.x = edge.position.x = sd * 2.3;
      body.add(wing, edge, strut);
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.016, 8, 160), new THREE.MeshBasicMaterial({ color: amber, transparent: true, opacity: 0.55 }));
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.009, 8, 180), new THREE.MeshBasicMaterial({ color: amber, transparent: true, opacity: 0.25 }));
    ring.rotation.x = 1.2; ring2.rotation.y = 1.1;
    const halo = glow(amber, 5, 0.35);
    g.add(body, ring, ring2, halo);
    return { g, body, core, ring, ring2, halo, w: 0 };
  });
  // text labels need the page fonts, so main.js calls this once fonts are ready
  World.buildLabels = names => names.forEach((txt, i) => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 128;
    const x = c.getContext('2d');
    x.font = '600 58px "JetBrains Mono", monospace'; x.fillStyle = '#ffb23f'; x.textBaseline = 'middle';
    x.fillText(`0${i + 1}  ${txt.toUpperCase()}`, 8, 64);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.9 }));
    s.scale.set(8, 1, 1); s.center.set(0, 0.5); s.position.set(1.2, 2.6, 0);
    st[i].g.add(s); st[i].label = s;
  });

  /* ---------- Bangalore ground station + uplink beam ---------- */
  const faceOut = m => { m.position.copy(B).addScaledVector(N, 0.02); m.lookAt(B.clone().addScaledVector(N, 2)); return m; };
  const gsRing = faceOut(new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 48), new THREE.MeshBasicMaterial({ color: amber, transparent: true, side: THREE.DoubleSide, depthWrite: false })));
  const gsDot = faceOut(new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshBasicMaterial({ color: 0xffe0a8 })));
  const gsGlow = glow(amber, 2.4, 0.8); gsGlow.position.copy(B).addScaledVector(N, 0.15);
  scene.add(gsRing, gsDot, gsGlow);
  const beamMat = () => new THREE.ShaderMaterial(Object.assign({
    uniforms: { uTime: U.uTime, uBeam: { value: 0 } },
    vertexShader: `varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime, uBeam; varying float vY;
      void main(){ float fade = pow(1.0 - vY, 0.7); float pulse = 0.55 + 0.45*sin(vY*60.0 - uTime*14.0);
        gl_FragColor = vec4(vec3(1.0,0.72,0.35)*2.2, uBeam*fade*pulse); }`,
  }, additive));
  const beam = new THREE.Group();
  [0.05, 0.22].forEach(r => { const geom = new THREE.CylinderGeometry(r, r, 1, 16, 1, true); geom.translate(0, 0.5, 0); beam.add(new THREE.Mesh(geom, beamMat())); });
  beam.position.copy(B); beam.quaternion.setFromUnitVectors(V(0, 1, 0), N);
  const beamRing = faceOut(new THREE.Mesh(new THREE.RingGeometry(0.6, 0.7, 64), new THREE.MeshBasicMaterial({ color: amber, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })));
  scene.add(beam, beamRing);

  /* ---------- Name made of debris: forms on load, bursts apart as the camera flies through it ---------- */
  const NC = World.NC = V(0, 23.2, 69), NAME_W = 26;
  const nameGroup = new THREE.Group(); nameGroup.position.copy(NC); scene.add(nameGroup);
  const nameU = { uTime: U.uTime, uPR: U.uPR, uForm: { value: 0 }, uBurst: { value: 0 } };
  World.buildName = (lines, target = small ? 5200 : 10000) => {
    const W = 2400, H = 900, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const setFont = px => { x.font = `800 ${px}px Archivo, "Arial Black", sans-serif`; try { x.fontStretch = 'expanded'; } catch (e) {} };
    let fs = 330; setFont(fs);
    const k = Math.min(1, (W - 160) / Math.max(...lines.map(l => x.measureText(l).width)));
    fs *= k; setFont(fs);
    const textW = Math.max(...lines.map(l => x.measureText(l).width));
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    lines.forEach((l, i) => x.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * fs * 0.98));
    const d = x.getImageData(0, 0, W, H).data;
    let filled = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 128) filled++;
    const step = Math.max(2, Math.round(Math.sqrt(filled * 4 / target)));
    const scale = NAME_W / textW, tgt = [], sc = [], seed = [];
    for (let py = 0; py < H; py += step) for (let px = 0; px < W; px += step) {
      if (d[(py * W + px) * 4 + 3] < 128) continue;
      const jx = (Math.random() - 0.5) * step, jy = (Math.random() - 0.5) * step;
      tgt.push((px + jx - W / 2) * scale, -(py + jy - H / 2) * scale, (Math.random() - 0.5) * 0.25);
      // most particles stream in from the debris field around Earth, the rest from open space
      const s = Math.random() < 0.65
        ? V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(R * (1.1 + Math.random() * 0.9)).sub(NC)
        : V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(25 + Math.random() * 45);
      sc.push(s.x, s.y, s.z); seed.push(Math.random());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(tgt, 3));
    g.setAttribute('aScatter', new THREE.Float32BufferAttribute(sc, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    const pts = new THREE.Points(g, new THREE.ShaderMaterial(Object.assign({
      uniforms: nameU,
      vertexShader: `attribute vec3 aScatter; attribute float aSeed; uniform float uTime, uPR, uForm, uBurst; varying float vA; varying float vAmber;
        void main(){
          float t = clamp((uForm*1.55 - aSeed*0.55), 0.0, 1.0); t = t*t*(3.0 - 2.0*t);
          vec3 p = mix(aScatter, position, t);
          p += vec3(sin(uTime*1.3 + aSeed*50.0), cos(uTime*1.1 + aSeed*70.0), sin(uTime*0.9 + aSeed*30.0)) * 0.035 * t;
          vec2 dir = normalize(position.xy + vec2(0.001));
          float b = uBurst*uBurst;
          p.xy += dir * b * (3.0 + aSeed*14.0);
          p.z += b * (aSeed - 0.35) * 40.0;
          vec4 mv = modelViewMatrix*vec4(p,1.0);
          vAmber = step(0.9, aSeed);
          vA = (0.35 + 0.65*t) * (1.0 - b*0.85);
          gl_PointSize = clamp(95.0*uPR / -mv.z, 1.0, 7.0*uPR) * (0.7 + 0.3*t);
          gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying float vA; varying float vAmber;
        void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
          vec3 c = mix(vec3(0.92,0.95,1.0), vec3(1.0,0.7,0.3)*1.4, vAmber);
          gl_FragColor = vec4(c, vA*smoothstep(0.5,0.05,d)); }`,
    }, additive)));
    pts.frustumCulled = false;
    nameGroup.add(pts);
  };

  /* ---------- Shots: camera poses main.js assigns to page sections ---------- */
  const P = (pos, tgt, o) => Object.assign({ pos, tgt, fov: 40, burst: 1, beam: 0, focus: -1, lines: 0.15, labels: 0 }, o);
  World.poses = aspect => {
    const tall = aspect < 0.9, up = V(0, 1, 0);
    const stationShot = (i, side) => {
      const S = stations[i], out = S.clone().normalize(), tang = up.clone().cross(out).normalize();
      const pos = S.clone().addScaledVector(out, tall ? 19 : 14).addScaledVector(tang, -side * 3).add(V(0, 3, 0));
      const dir = S.clone().sub(pos).normalize(), right = dir.clone().cross(up).normalize();
      const tgt = tall ? S.clone().add(V(0, -5, 0)) : S.clone().addScaledVector(right, side * 5.5);
      return P(pos, tgt, { focus: i, fov: tall ? 52 : 40 });
    };
    const surf = (lat, lng, alt, lat2, lng2) => P(geo(lat, lng, R + alt), geo(lat2, lng2, R), { fov: tall ? 58 : 44, lines: 0.08 });
    const orbit = (() => {   // skimming the top of the debris shell, horizon in the lower third
      const d = V(0.42, 0.72, 0.55).normalize(), pos = d.clone().multiplyScalar(R * 1.34);
      const t = V(-d.z, 0, d.x).normalize(), look = t.multiplyScalar(Math.cos(0.5)).addScaledVector(d, -Math.sin(0.5));
      return P(pos, pos.clone().addScaledVector(look, 20), { fov: tall ? 62 : 48, lines: 0.45 });
    })();
    const s1 = stations[0], o1 = s1.clone().normalize();
    return {
      intro: P(V(0, 20.6, 97), V(0, 20.6, 60), { fov: tall ? 56 : 40, burst: 0 }),
      through: P(V(0, 23.2, 62), V(0, 20, 20), { fov: 58, burst: 1 }),
      approach: tall ? P(V(4, 13, 30), V(0, 1, 0), { burst: 1, fov: 52 }) : P(V(9, 7, 26), V(-9, 3, 0), { burst: 1 }),
      approachEnd: tall ? P(V(3, 10, 24), V(0, -1, 0), { burst: 1, fov: 52 }) : P(V(6.5, 5.5, 20.5), V(-8.5, 2, 0), { burst: 1 }),
      orbit,
      gate: P(s1.clone().addScaledVector(o1, 12).add(V(0, 4, 0)), s1.clone().multiplyScalar(0.55), { focus: 0, lines: 0.2 }),
      gateEnd: P(s1.clone().addScaledVector(o1, 8.5).add(V(0, 2.5, 0)), s1.clone().multiplyScalar(0.62), { focus: 0, lines: 0.2 }),
      stations: [stationShot(0, 1), stationShot(1, -1), stationShot(2, 1), stationShot(3, -1)],
      wide: P(tall ? V(0, 42, 100) : V(0, 30, 64), V(0, -3, 0), { lines: 0.4, labels: 1 }),
      ground: surf(2, 77.6, 3.2, 19, 77.6),
      groundEnd: surf(17, 81, 3.2, 33, 86),
      uplink: tall ? P(V(-44, 2, 26), V(0, 14, 34), { beam: 1, fov: 58 }) : P(V(-36, -2, 22), V(0, 10, 32), { beam: 1, fov: 50 }),
    };
  };

  /* ---------- Director: scroll position -> interpolated shot ---------- */
  const tmpA = V(), tmpB = V();
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const orbitLerp = (a, b, t, out) => {   // swing around the planet instead of cutting through it
    const ra = a.length(), rb = b.length();
    tmpA.copy(a).normalize(); tmpB.copy(b).normalize();
    const om = Math.acos(Math.min(1, Math.max(-1, tmpA.dot(tmpB))));
    if (om > 1e-4) { const s = Math.sin(om); tmpA.multiplyScalar(Math.sin((1 - t) * om) / s).addScaledVector(tmpB, Math.sin(t * om) / s); }
    return out.copy(tmpA.normalize()).multiplyScalar(ra + (rb - ra) * t);
  };
  const goal = P(V(), V()), cur = P(V(), V());
  const mix = (a, b, t, swing) => {
    swing ? orbitLerp(a.pos, b.pos, t, goal.pos) : goal.pos.copy(a.pos).lerp(b.pos, t);
    goal.tgt.copy(a.tgt).lerp(b.tgt, t);
    for (const k of ['fov', 'burst', 'beam', 'lines', 'labels']) goal[k] = a[k] + (b[k] - a[k]) * t;
    goal.focus = t < 0.5 ? a.focus : b.focus;
  };
  function direct(y) {
    const S = World.shots; if (!S.length) return false;
    if (y <= S[0].y0) { mix(S[0].a, S[0].a, 0); return true; }
    for (let i = 0; i < S.length; i++) {
      const s = S[i], n = S[i + 1];
      if (y <= s.y1) { mix(s.a, s.b || s.a, s.y1 > s.y0 ? Math.max(0, (y - s.y0) / (s.y1 - s.y0)) : 1); return true; }
      if (!n) { mix(s.b || s.a, s.b || s.a, 0); return true; }
      if (y < n.y0) { mix(s.b || s.a, n.a, ease((y - s.y1) / (n.y0 - s.y1)), true); return true; }
    }
    return true;
  }

  /* ---------- Post-processing ---------- */
  let composer = null, bloom = null;
  if (THREE.EffectComposer && THREE.UnrealBloomPass) {
    composer = new THREE.EffectComposer(renderer);
    composer.setPixelRatio(DPR);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), small ? 0.8 : 1.05, 0.62, 0.32);
    composer.addPass(bloom);
  }
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); composer && composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const tall = camera.aspect < 0.9, halfFov = (tall ? 28 : 20) * Math.PI / 180;
    const visW = 2 * Math.tan(halfFov) * 28 * camera.aspect;   // width at the name's distance in the intro shot
    nameGroup.scale.setScalar(Math.min(1, visW * (tall ? 0.94 : 0.86) / NAME_W));
    nameGroup.position.copy(NC).add(V(0, tall ? 4.5 : 0, 0));
  };
  new ResizeObserver(resize).observe(canvas); resize();

  let px = 0, py = 0, mx = 0, my = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });

  /* ---------- Loop ---------- */
  const cur3 = tracked.map(() => V()), posArr = trackGeo.attributes.position.array, cooldown = new Map();
  const wA = V(), wB = V(), right = V(), upV = V();
  let t = 0, last = performance.now(), first = true, conjLife = 0, conjPair = [0, 1];
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduce) t += dt;
    U.uTime.value = t;

    if (direct(window.scrollY)) {
      if (first) { for (const k in goal) cur[k] = goal[k] && goal[k].clone ? goal[k].clone() : goal[k]; first = false; }
      const k = 1 - Math.exp(-dt * 5.5);
      cur.pos.lerp(goal.pos, k); cur.tgt.lerp(goal.tgt, k);
      for (const key of ['fov', 'burst', 'beam', 'lines', 'labels']) cur[key] += (goal[key] - cur[key]) * k;
      cur.focus = goal.focus;
    }
    // subtle pointer parallax, scaled to how far away the subject is
    px += (mx - px) * 0.05; py += (my - py) * 0.05;
    const dist = cur.pos.distanceTo(cur.tgt);
    camera.position.copy(cur.pos);
    camera.lookAt(cur.tgt);
    right.setFromMatrixColumn(camera.matrix, 0); upV.setFromMatrixColumn(camera.matrix, 1);
    if (!reduce) camera.position.addScaledVector(right, px * dist * 0.035).addScaledVector(upV, -py * dist * 0.025);
    camera.lookAt(cur.tgt);
    if (Math.abs(camera.fov - cur.fov) > 0.01) { camera.fov = cur.fov; camera.updateProjectionMatrix(); }
    World.stats.alt = Math.max(0, (camera.position.length() - R) / R * 6371);

    nameU.uForm.value = World.name.form;
    nameU.uBurst.value = cur.burst;
    nameGroup.visible = cur.burst < 0.995 || camera.position.z > 40;
    orbitMat.opacity = cur.lines;
    beam.children[0].material.uniforms.uBeam.value = cur.beam;
    beam.children[1].material.uniforms.uBeam.value = cur.beam * 0.35;
    beam.scale.set(1, 1 + cur.beam * 85, 1);
    beamRing.material.opacity = cur.beam * (1 - ((t * 0.9) % 1));
    beamRing.scale.setScalar(1 + ((t * 0.9) % 1) * 5);
    gsRing.scale.setScalar(1 + ((t * 0.8) % 1) * 3);
    gsRing.material.opacity = 1 - ((t * 0.8) % 1);

    st.forEach((s, i) => {
      s.w += ((cur.focus === i ? 1 : 0) - s.w) * 0.05;
      s.body.rotation.y = t * 0.25 + i;
      s.ring.rotation.z = t * (0.3 + s.w * 0.6);
      s.ring2.rotation.x = -t * (0.2 + s.w * 0.4);
      s.halo.material.opacity = 0.16 + s.w * 0.3;
      s.halo.scale.setScalar(4 + s.w * 1.5 + Math.sin(t * 2 + i) * 0.25);
      s.core.scale.setScalar(1 + s.w * 0.25);
      if (s.label) s.label.material.opacity = cur.labels * 0.9;
    });

    tracked.forEach((o, i) => { orbitPos(o, o.ph + t * o.sp, cur3[i]); posArr.set([cur3[i].x, cur3[i].y, cur3[i].z], i * 3); });
    trackGeo.attributes.position.needsUpdate = true;
    for (let i = 0; i < cur3.length; i++) for (let j = i + 1; j < cur3.length; j++) {
      const d = cur3[i].distanceTo(cur3[j]), key = i * 10 + j;
      if (d < 0.14 * R && t - (cooldown.get(key) || -99) > 4) {
        cooldown.set(key, t); conjLife = 1.6; conjPair = [i, j]; World.stats.approaches++;
        listeners.forEach(fn => fn({ a: i + 1, b: j + 1, d: d / R }));
      }
    }
    if (conjLife > 0) {
      conjLife -= dt; const k = Math.max(0, conjLife / 1.6);
      wA.copy(cur3[conjPair[0]]); wB.copy(cur3[conjPair[1]]);
      conjGeo.attributes.position.setXYZ(0, wA.x, wA.y, wA.z); conjGeo.attributes.position.setXYZ(1, wB.x, wB.y, wB.z);
      conjGeo.attributes.position.needsUpdate = true;
      conjRing.position.copy(wA).add(wB).multiplyScalar(0.5);
      conjLine.material.opacity = k; conjRing.material.opacity = k;
      conjRing.scale.setScalar(1 + (1 - k) * 2); conjRing.lookAt(camera.position);
    }

    composer ? composer.render(dt) : renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
})();
