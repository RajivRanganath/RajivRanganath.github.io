// Page choreography: boot, name formation, smooth scroll, camera shots for the 3D world,
// scroll-driven scenes, station panels, case files, mission HUD, cursor.
// Everything degrades: no WebGL -> DOM-only page; no GSAP -> static page; reduced motion -> final states.
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const World = window.World || { ok: false, stats: {}, name: {}, on() {} };
  const EMAIL = 'rajivranganath3@gmail.com', GH = 'https://github.com/RajivRanganath/';
  const FORMSPREE_ID = '';   // Formspree form ID; empty = the form opens the visitor's email app
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const done = () => document.documentElement.classList.remove('booting');
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ================= Work data ================= */
  const FILES = [
    { id: 'ledger', nm: 'LedgerGuard', repo: 'ledgerguard', tag: 'Razorpay AI Buildathon', one: 'A self-verifying AI finance controller. The model proposes; the ledger has to prove it.', big: '97.7%', bigLabel: 'disposition accuracy, up from 89.4%', stack: ['Python', 'FastAPI', 'LLMs', 'pytest'], vis: 'gate',
      problem: 'An LLM can explain a financial discrepancy in two seconds. Nothing tells you whether that explanation is financially true.',
      built: ['Shadow Ledger that reconstructs expected money movement from first principles, in integer paise, with six named invariants.', 'Deterministic engine that resolves 54 of 85 holdout cases with no AI involved.', 'Evidence Gate that re-proves every model hypothesis with 7 checks. The model can only downgrade a close, never create one.', 'Abstention as a designed outcome: unresolved cases export with rupee exposure and the missing evidence.'],
      result: 'Disposition accuracy 89.4% to 97.7%. Across 5 investigators and 30 adversarial attempts: 0 false closures, INR 0.00. Without the gate: 25 of 30.',
      links: [['GitHub', GH + 'ledgerguard'], ['No-gate ablation', GH + 'ledgerguard/blob/master/ledgerguard/evaluation/outputs/no_gate_ablation.md']] },
    { id: 'orbit', nm: 'Orbit Guard AI', repo: 'Short-Arc-Space-Object-Tracking', tag: 'Space situational awareness', one: 'Real-time space debris tracking and collision warning from sparse, noisy observations.', big: '+11 to 14', bigLabel: 'points of association accuracy, JPDA over GNN', stack: ['NumPy', 'EnKF', 'FastAPI', 'Three.js'], vis: 'tracker',
      problem: 'Tracking debris from sparse, noisy ground-station observations, and warning of collisions before they happen.',
      built: ['200-particle Ensemble Kalman Filter with J2 oblateness, drag and solar radiation pressure.', 'Integrator verified against two-body physics: about 1e-12 energy and momentum drift over 24 hours.', 'GNN (Hungarian) for clean data and JPDA for clutter; B-plane collision alerts.', 'FastAPI WebSocket backend streaming to a React + Three.js 3D mission view.'],
      result: 'JPDA beat GNN by 11 to 14 points of association accuracy in synthetic 8-object clutter, at 100% track stability.',
      links: [['GitHub', GH + 'Short-Arc-Space-Object-Tracking']] },
    { id: 'kgp', nm: 'LLM extraction, audited', repo: null, tag: 'IIT Kharagpur internship', one: 'ESG figures from sustainability reports, checked against official XBRL filings, with a failover chain that never invents a value.', big: '81.4%', bigLabel: 'verified accuracy against XBRL filings', stack: ['RAG', 'Camelot', 'XBRL', 'PPO', 'CI'], vis: 'chain',
      problem: 'Company sustainability reports are long PDFs. Extracting their figures with an LLM is easy; knowing which ones are right is not.',
      built: ['LLM/RAG extraction checked against official structured XBRL filings, with Camelot table verification.', 'Evaluation rebuilt after finding leakage: every answer must cite its source; 6-type hallucination taxonomy.', 'Capacity failover across five providers; the chain never emits a made-up value.', 'Five-agent PPO carbon-market simulation calibrated on 75 MoEFCC baselines.'],
      result: '62.7% to 81.4% verified accuracy across four locked test sets. 284 tests in CI.', links: [] },
    { id: 'marl', nm: 'Cooperative MARL', repo: 'FinalYearProject-MARL', tag: 'Final-year project', one: 'IQL, VDN and QMIX against seven heuristics on solar-powered sensors, with preregistered splits and an honest verdict.', big: '15 / 17', bigLabel: 'microcontrollers fit the ONNX policy', stack: ['PyTorch', 'EPyMARL', 'ONNX', 'pytest'], vis: 'mcu',
      problem: 'When does cooperative multi-agent RL actually beat simple heuristics for scheduling solar-powered sensors? The experiment was set up so QMIX was not forced to win.',
      built: ['25,474-parameter GRU policies trained with EPyMARL on four energy-harvesting nodes.', 'Eight sanity checks gate training; single-use 30-seed test splits and preregistered win criteria.', 'ONNX export and analytical sizing against 17 microcontrollers.'],
      result: 'Unanimous-vote ensemble: +3.70 reward (95% CI [2.10, 5.30]). Still lost to a threshold rule by 4.95, with fresher data. Fits 15 of 17 MCUs at 0.25 to 6.8 ms per decision.',
      links: [['GitHub', GH + 'FinalYearProject-MARL']] },
    { id: 'agent', nm: 'Agent Console', icon: 'ph-broadcast', tag: 'Real-time UI', one: 'Streaming agent UI that never loses or doubles output through drops and reordering.', met: 'chaos-tested',
      problem: 'A streaming agent server that drops, reorders and duplicates frames. The UI must never lose or double any output.',
      built: ['Protocol engine outside React: sequence buffer orders and deduplicates frames.', 'Connection manager with heartbeats, backoff and resume from the last rendered sequence number.', 'React consumes ordered events once per animation frame; tool cards are immutable stream parts.'],
      result: 'Tests cover ordering, gaps, duplicates, reversed delivery and resumed baselines. Verified against the server\'s chaos mode.', links: [['GitHub', GH + 'Agent_assignment']] },
    { id: 'agency', nm: 'agencydesk', icon: 'ph-buildings', tag: 'Full stack', one: 'Multi-tenant agency and client platform where tenants provably can\'t see each other.', met: 'isolation tested',
      problem: 'Agencies and clients share one system, and one tenant must never see another\'s data.',
      built: ['FastAPI, SQLAlchemy and Alembic backend with JWT auth.', 'Tenant isolation and client-visibility rules, including a client shared across two agencies.'],
      result: 'A dedicated test suite proves tenant isolation holds.', links: [['GitHub', GH + 'agencydesk'], ['Isolation tests', GH + 'agencydesk/blob/master/backend/tests/test_isolation.py']] },
    { id: 'composio', nm: '100-app toolkit study', icon: 'ph-magnifying-glass', tag: 'Research', one: 'Auth, access and MCP readiness of 100 SaaS apps, with evidence for every claim.', met: '100 apps',
      problem: 'Which SaaS apps can an agent toolkit actually integrate today, and what blocks the rest?',
      built: ['Concurrent evidence-retrieval agent with provenance for every claim.', 'Independent human audit across all ten categories.'],
      result: '73 apps ready now. Published the agent\'s raw 22% sample accuracy alongside the corrected data.',
      links: [['Live case study', 'https://rajivranganath.github.io/composio-100-app-toolkit-research/'], ['GitHub', GH + 'composio-100-app-toolkit-research']], img: ['assets/composio.jpg', 'Screenshot of the live Composio 100-app toolkit case study'] },
    { id: 'resume', nm: 'resume_extractor', icon: 'ph-file-text', tag: 'Privacy-first', one: 'Local, rule-based resume parser to JSON. No LLM calls, no network.', met: '29 tests',
      problem: 'Resumes are personal data. Parsing them shouldn\'t require sending them anywhere.',
      built: ['PDF and DOCX parsing, including two-column and sidebar layouts.', 'Section-aware field extractors and a curated skill taxonomy.'],
      result: '29 tests pass, and an offline test runs with network sockets blocked to prove nothing leaves the machine.', links: [['GitHub', GH + 'resume_extractor']] },
    { id: 'rpa', nm: 'Incident automation', icon: 'ph-factory', tag: 'Team capstone', one: 'Telemetry to work order to approval to verification, built contract-first by three people.', met: 'contract-first',
      problem: 'Sensor telemetry to work orders to supervisor approval to closed-loop verification, built by three people in parallel.',
      built: ['UiPath workflows with Node-RED and MQTT telemetry.', 'JSON-schema contracts between subsystems so each person could build independently.'],
      result: 'End-to-end pipeline with human-in-the-loop governance and an audit log per incident.', links: [['GitHub', GH + 'RPA-project']] },
    { id: 'plag', nm: 'Plagiarism detector', icon: 'ph-copy', tag: 'NLP', one: 'Lexical and semantic engines with sentence-level attribution to sources.', met: 'live demo',
      problem: 'Catch both copied and paraphrased text, and show exactly which sentence came from where.',
      built: ['TF-IDF and Jaccard for exact matches against local documents.', 'all-MiniLM-L6-v2 embeddings against live web sources.', 'Paraphrase-rewriting module.'],
      result: 'Deployed on Streamlit.', links: [['Live demo (wakes in ~30s)', 'https://nlp-project-dkpqfn4ivbr3mfjjkb9h6m.streamlit.app/'], ['GitHub', GH + 'NLP-Project']] },
    { id: 'gdpr', nm: 'GDPR compliance checker', icon: 'ph-scales', tag: 'LLM app', one: 'Legal document summaries, risk flags and Q&A over the document.', met: 'live demo',
      problem: 'Legal documents are long; the risky clauses are what matter.',
      built: ['Chunked LLM summaries and risk and clause detection.', 'Q&A over the document, FAISS-backed RAG helper, GDPR recital tracker.'],
      result: 'Live on Hugging Face Spaces.', links: [['Live demo (wakes in ~30s)', 'https://huggingface.co/spaces/cs116/legal_document_summarization_final'], ['GitHub', GH + 'GDPR-Compliance-Checker']] },
    { id: 'dr', nm: 'Retinopathy classifier', icon: 'ph-eye', tag: 'Medical imaging', one: 'Five-class DR grading on APTOS 2019 with a ResNet-152 backbone.', met: 'ResNet-152',
      problem: 'Early screening prevents most severe vision loss from diabetic retinopathy.',
      built: ['ResNet-152 backbone with a custom 512-d classification head.', 'Five grades from No DR to Proliferative.'],
      result: 'Capstone of the E2E Management Services internship.', links: [['GitHub', GH + 'Diabetic-Retinopathy-Project']] },
  ];

  const VIS = {
    gate: () => `<div class="v-gate"><ul>${['E1 records exist', 'E2 processed', 'E3 not linked', 'E4 customer match', 'E5 amount', 'E6 timing', 'E7 invariant']
      .map((c, i) => `<li class="${i === 3 || i === 5 ? 'x' : ''}"><i class="ph-fill ${i === 3 || i === 5 ? 'ph-x-circle' : 'ph-check-circle'}"></i>${c}</li>`).join('')}</ul>
      <div class="res"><s>25 / 30</s><b>0 / 30</b><span>false closures, <br>without vs with gate</span></div></div>`,
    tracker: () => `<canvas class="mini-scope" aria-hidden="true"></canvas><span class="vis-tag">live, same engine as the demo</span>`,
    chain: () => `<div class="v-chain"><div class="chain">${['Groq', 'Gemini', 'NVIDIA NIM', 'OmniRoute', 'Ollama'].map((n, i) => `<span class="node" style="--n:${i}">${n}</span>`).join('')}<span class="pulse"></span></div>
      <p>rate-limited or failing? next provider. out of providers? mark it unresolved, never invent a value.</p></div>`,
    mcu: () => `<div class="v-mcu"><div class="chips17">${Array.from({ length: 17 }, (_, i) => `<span class="chip17 ${i < 15 ? 'fit' : 'no'}" style="--n:${i}"></span>`).join('')}</div>
      <p>ONNX policy fits <b>15 of 17</b> microcontrollers, 0.25 to 6.8 ms per decision</p></div>`,
  };

  FILES.slice(0, 4).forEach((f, i) => {
    $(`#st${i + 1} .spanel`).innerHTML = `
      <div class="sp-top"><span class="sp-idx">STATION 0${i + 1}</span><span class="badge ${f.repo ? '' : 'amber'}">${f.repo ? '<i class="ph ph-github-logo"></i>Public' : '<i class="ph ph-lock-simple"></i>Private'}</span></div>
      <span class="badge amber">${esc(f.tag)}</span>
      <h3>${esc(f.nm)}</h3>
      <p class="sp-one">${esc(f.one)}</p>
      <div class="sp-vis">${VIS[f.vis]()}</div>
      <div class="sp-metric"><b>${esc(f.big)}</b><span>${esc(f.bigLabel)}</span></div>
      <div class="tags">${f.stack.map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>
      <button class="btn btn-ghost" data-open="${f.id}" data-cursor="Open">Open case file<i class="ph ph-arrow-up-right"></i></button>`;
  });
  $('#moreGrid').innerHTML = FILES.slice(4).map(f => `
    <button class="card mini rv" data-open="${f.id}" data-cursor="Open">
      <span class="top"><i class="ph ${f.icon} icon-orb"></i><i class="ph ph-arrow-up-right"></i></span>
      <span class="badge">${esc(f.tag)}</span>
      <h4>${esc(f.nm)}</h4>
      <p>${esc(f.one)}</p>
      <span class="metric">${esc(f.met)}</span>
    </button>`).join('');

  /* case-file dialog */
  const dlg = $('#dlg');
  const list = items => '<ul>' + items.map(i => `<li>${esc(i)}</li>`).join('') + '</ul>';
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-open]');
    if (!trigger) return;
    const f = FILES.find(x => x.id === trigger.dataset.open);
    $('#dlgTag').textContent = f.tag;
    $('#dlgTitle').textContent = f.nm;
    $('#dlgBody').innerHTML = `<p>${esc(f.problem)}</p><h4>WHAT I BUILT</h4>${list(f.built)}<h4>RESULT</h4><p>${esc(f.result)}</p>` +
      (f.img ? `<img src="${f.img[0]}" alt="${esc(f.img[1])}" loading="lazy">` : '') +
      `<div class="dlg-links">${f.links.length ? f.links.map(([l, u], i) => `<a class="btn ${i ? 'btn-ghost' : 'btn-primary'}" href="${u}" target="_blank" rel="noopener">${l === 'GitHub' ? '<i class="ph ph-github-logo"></i>' : '<i class="ph ph-arrow-up-right"></i>'}${esc(l)}</a>`).join('')
        : '<span class="badge"><i class="ph ph-lock-simple"></i>Internship work, code private</span>'}</div>`;
    dlg.showModal(); lenis && lenis.stop();
  });
  $('#dlgClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => lenis && lenis.start());

  /* mini tracker in the Orbit Guard panel: same engine as the demo, heavy clutter, JPDA */
  (function miniScope() {
    const c = $('.mini-scope');
    if (!c || !window.Tracker) return;
    const ctx = c.getContext('2d');
    const sim = Tracker.createSim({ seed: 42, width: 100, height: 45, clutter: 26, targets: 5 });
    let w = 0, h = 0, visible = false, last = 0;
    const resize = () => { const d = Math.min(devicePixelRatio || 1, 2), r = c.getBoundingClientRect(); w = r.width; h = r.height; c.width = w * d; c.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const X = v => v / sim.W * w, Y = v => v / sim.H * h;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(214,222,232,.45)';
      for (const d of sim.detections) { ctx.beginPath(); ctx.arc(X(d.x), Y(d.y), 1.5, 0, 7); ctx.fill(); }
      for (const tg of sim.targets) {
        const t = tg.tracks.jpda; if (t.lost) continue;
        ctx.strokeStyle = 'rgba(255,178,63,.5)'; ctx.lineWidth = 1.4; ctx.beginPath();
        t.trail.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.stroke();
        const px = X(t.x[0]), py = Y(t.x[1]);
        ctx.fillStyle = '#ffb23f'; ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.lineTo(px + 4, py); ctx.lineTo(px, py + 4); ctx.lineTo(px - 4, py); ctx.fill();
      }
    };
    const loop = now => { if (!visible) return; if (now - last > 240) { last = now; sim.step(); draw(); } requestAnimationFrame(loop); };
    resize(); for (let i = 0; i < 25; i++) sim.step(); draw();
    new ResizeObserver(() => { resize(); draw(); }).observe(c);
    if (reduce) return;
    new IntersectionObserver(([e]) => { const was = visible; visible = e.isIntersecting; if (visible && !was) requestAnimationFrame(loop); }).observe(c);
  })();

  /* ================= Forest plot (MARL final confirmation data) ================= */
  (function forest() {
    // [metric, raw advantage, raw CI low, raw CI high, d_z, d_z CI low, d_z CI high, Holm p]; positive = QMIX better
    const ROWS = [
      ['Energy use', -0.7533, -0.826, -0.6806, -3.869, -4.242, -3.495, 4.1e-18],
      ['Redundant samples', -4.2667, -5.1379, -3.3954, -1.829, -2.202, -1.455, 6.4e-10],
      ['Reward', -4.9506, -8.4413, -1.46, -0.53, -0.903, -0.156, 0.035],
      ['Event recall', -0.0027, -0.0067, 0.0013, -0.249, -0.623, 0.124, 0.37],
      ['Coverage', 0.0009, -0.0014, 0.0032, 0.139, -0.234, 0.512, 0.45],
      ['Data freshness (AoI)', 0.3225, 0.1805, 0.4645, 0.848, 0.475, 1.221, 0.00048],
    ];
    const LO = -4.5, HI = 1.5, pct = v => (v - LO) / (HI - LO) * 100;
    const verdict = r => r[7] >= 0.05 ? ['none', 'ph-minus-circle', 'too close to call'] : r[4] > 0 ? ['win', 'ph-check-circle', 'QMIX wins'] : ['loss', 'ph-x-circle', 'threshold wins'];
    const fmt = v => (v > 0 ? '+' : '') + (Math.abs(v) < 0.01 ? v.toFixed(4) : v.toFixed(2));
    const pfmt = p => p < 0.001 ? p.toExponential(1) : p.toFixed(3);
    $('#forestRows').innerHTML = ROWS.map((r, i) => {
      const [cls, icon, word] = verdict(r);
      return `<div class="f-row ${cls}" tabindex="0" data-i="${i}" aria-label="${r[0]}: ${word}, d_z ${r[4]}, 95% CI ${r[5]} to ${r[6]}">
        <span class="f-lab">${r[0]}</span>
        <div class="f-track"><span class="f-zero" style="left:${pct(0)}%"></span><span class="f-ci" style="left:${pct(r[5])}%;width:${pct(r[6]) - pct(r[5])}%"></span><span class="f-dot" style="left:${pct(r[4])}%"></span></div>
        <span class="f-verdict"><i class="ph ${icon}"></i><span>${word}</span></span></div>`;
    }).join('');
    $('#forestTicks').innerHTML = [-4, -3, -2, -1, 0, 1].map(t => `<span style="left:${pct(t)}%">${t > 0 ? '+' + t : t}</span>`).join('') +
      `<em style="left:0">&larr; threshold<span class="f-long"> rule better</span></em><em style="right:0">QMIX<span class="f-long"> better</span> &rarr;</em>`;
    $('#forestTable').innerHTML = '<tr><th>Metric</th><th>QMIX minus threshold</th><th>95% CI</th><th>d_z</th><th>Holm p</th></tr>' +
      ROWS.map(r => `<tr><td>${r[0]}</td><td>${fmt(r[1])}</td><td>${fmt(r[2])} to ${fmt(r[3])}</td><td>${r[4]}</td><td>${pfmt(r[7])}</td></tr>`).join('');
    const fig = $('#forest'), tip = $('#forestTip');
    const show = row => {
      const r = ROWS[row.dataset.i], [, , word] = verdict(r);
      tip.innerHTML = `<b>${r[0]}</b>: ${word}<br>difference ${fmt(r[1])} (95% CI ${fmt(r[2])} to ${fmt(r[3])})<br>d<sub>z</sub> ${r[4]}, Holm p ${pfmt(r[7])}`;
      const fr = fig.getBoundingClientRect(), rr = row.getBoundingClientRect();
      tip.style.left = Math.max(0, Math.min(rr.left - fr.left + rr.width / 2, fr.width - 290)) + 'px';
      tip.style.top = rr.bottom - fr.top + 6 + 'px';
      tip.classList.add('on');
    };
    $$('.f-row', fig).forEach(row => {
      row.addEventListener('pointerenter', () => show(row)); row.addEventListener('focus', () => show(row));
      row.addEventListener('pointerleave', () => tip.classList.remove('on')); row.addEventListener('blur', () => tip.classList.remove('on'));
    });
  })();

  /* ================= Text splitting ================= */
  // chars inside nowrap word wrappers, so words never break mid-line
  function splitChars(el) {
    const out = [];
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(' ');
          const word = document.createElement('span'); word.className = 'wd';
          [...part].forEach(ch => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; word.append(s); out.push(s); });
          frag.append(word);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
    walk(el); el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    return out;
  }
  function splitWords(el, cls = 'w') {
    const out = [];
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(' ');
          const m = document.createElement('span'); m.className = cls + '-m';
          const s = document.createElement('span'); s.className = cls; s.textContent = part;
          m.append(s); frag.append(m); out.push(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
    walk(el); return out;
  }
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/<>*';
  function scramble(el, dur = 700) {
    const orig = el.dataset.text || (el.dataset.text = el.textContent), t0 = performance.now();
    cancelAnimationFrame(el._raf);
    const tick = now => {
      const p = Math.min(1, (now - t0) / dur), keep = Math.floor(p * orig.length);
      el.textContent = [...orig].map((c, i) => i < keep || c === ' ' ? c : GLYPHS[Math.random() * GLYPHS.length | 0]).join('');
      if (p < 1) el._raf = requestAnimationFrame(tick); else el.textContent = orig;
    };
    el._raf = requestAnimationFrame(tick);
  }

  /* ================= Smooth scroll ================= */
  let lenis = null;
  if (hasGSAP && !reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'), target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    $('#navLinks').classList.remove('open');
    if (lenis) lenis.scrollTo(target, { duration: 2.2 });
    else if (target === 0) scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ================= Nav ================= */
  const nav = $('#nav'), navLinks = $('#navLinks'), menuBtn = $('#menuBtn');
  menuBtn.addEventListener('click', () => menuBtn.setAttribute('aria-expanded', navLinks.classList.toggle('open')));
  const links = $$('a', navLinks);
  links.forEach(a => a.addEventListener('pointerenter', () => scramble(a, 420)));
  new IntersectionObserver(([e]) => nav.classList.toggle('scrolled', !e.isIntersecting), { rootMargin: '-140px 0px 0px 0px' }).observe($('#top'));
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', (a.dataset.sec || a.getAttribute('href').slice(1)).split(' ').includes(e.target.id)));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach(s => spy.observe(s));

  /* ================= Mission HUD: chapter + altitude read from the live camera ================= */
  const CH = [['top', 'Launch'], ['approach', 'Approach'], ['demo', 'Orbit'], ['caught', 'Evidence'], ['st1', 'Stations'], ['more', 'Fleet'], ['calls', 'Ground'], ['contact', 'Uplink']];
  const rail = $('#rail'), railName = $('#railName'), railAlt = $('#railAlt'), toast = $('#toast');
  $('ol', rail).innerHTML = CH.map(([id, n], i) => `<li><a href="#${id}" aria-label="Chapter ${i}: ${n}"><span>0${i}</span></a></li>`).join('');
  $$('a', rail).forEach(a => a.addEventListener('click', e => { e.preventDefault(); const t = $(a.getAttribute('href')); lenis ? lenis.scrollTo(t, { duration: 2.2 }) : t.scrollIntoView(); }));
  let chapter = 0;
  const setChapter = i => {
    chapter = i; railName.textContent = CH[i][1];
    $$('li', rail).forEach((li, k) => li.classList.toggle('on', k === i));
  };
  setChapter(0);
  setInterval(() => { railAlt.textContent = Math.round(World.stats.alt || 0).toLocaleString('en-US'); }, 120);
  World.on(ev => {
    if (CH[chapter][0] !== 'demo') return;   // only while the tracked objects are on screen
    toast.textContent = `CLOSE APPROACH  T${ev.a} x T${ev.b}  ${(ev.d * 6371).toFixed(0)} km`;
    toast.classList.remove('on'); void toast.offsetWidth; toast.classList.add('on');
  });

  /* ================= Evidence Gate (real case pay_0048CBEF) ================= */
  const GATE_REASON = 'The settlement shows a large refund adjustment of 1,272,670 paise, exactly matching the amount of an unlinked refund record. The shadow ledger expected no refunds, so the discrepancy can be explained by a refund that has not been linked to this payment.';
  const CHECKS = [
    ['E1', 'Evidence records exist', true, 'rfnd_003431D5 found in record store'],
    ['E2', 'Refund is processed', true, 'status: processed'],
    ['E3', 'Refund not linked elsewhere', true, 'payment_id is None'],
    ['E4', 'Reference identifies this customer', false, "'CUST-0081/refund posted' vs order customer 'CUST-0011': NO MATCH"],
    ['E5', 'Amount equals shortfall', true, '1,272,670 vs 1,272,670 paise'],
    ['E6', 'Timing is plausible', false, 'refund dated 2026-06-28, before capture on 2026-06-30'],
    ['E7', 'Ledger invariant restored', true, 'net with refund applied = observed net'],
  ];
  $('#bubble').innerHTML = GATE_REASON.split(' ').map(w => `<span class="gw">${esc(w)}</span>`).join(' ');
  $('#checks').innerHTML = CHECKS.map(([id, name, ok, d]) =>
    `<li class="${ok ? 'pass' : 'fail'}"><span class="ic"><i class="ph ph-circle-dashed i-wait"></i><i class="ph-fill ${ok ? 'ph-check-circle' : 'ph-x-circle'} i-res"></i></span><span>${id} ${esc(name)}<span class="d">${esc(d)}</span></span></li>`).join('');

  /* ================= Contact ================= */
  $('#copyMail').addEventListener('click', async e => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText(EMAIL); b.textContent = 'Copied'; }
    catch { getSelection().selectAllChildren($('#mail')); b.textContent = 'Press Ctrl+C'; }
    setTimeout(() => b.textContent = 'Copy', 2000);
  });
  const form = $('#contactForm'), status = $('#formStatus');
  const setStatus = (m, c) => { status.textContent = m; status.className = 'form-status ' + (c || ''); };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = new FormData(form);
    const name = data.get('name').trim(), email = data.get('email').trim(), message = data.get('message').trim();
    if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setStatus('Please add your name, a valid email and a message.', 'err');
    if (!FORMSPREE_ID) {
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent('Portfolio message from ' + name)}&body=${encodeURIComponent(message + '\n\n' + name + ' (' + email + ')')}`;
      return setStatus('Opening your email app. If nothing happens, write to ' + EMAIL + '.', 'ok');
    }
    const btn = form.querySelector('button'); btn.disabled = true; setStatus('Sending...');
    try {
      const res = await fetch('https://formspree.io/f/' + FORMSPREE_ID, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(res.status);
      form.reset(); setStatus('Sent. I\'ll reply by email soon.', 'ok');
    } catch { setStatus('Could not send right now. Please email ' + EMAIL + ' directly.', 'err'); }
    finally { btn.disabled = false; }
  });

  /* ================= Pointer layer: spotlight, tilt, magnetic, cursor ================= */
  $$('.card').forEach(card => {
    const tilt = fine && !reduce && card.matches('.mini, .slot, .edu');
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty('--mx', x + 'px'); card.style.setProperty('--my', y + 'px');
      if (tilt) card.style.transform = `perspective(900px) rotateX(${(.5 - y / r.height) * 6}deg) rotateY(${(x / r.width - .5) * 6}deg) translateY(-4px)`;
    });
    if (tilt) card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
  if (fine && !reduce && hasGSAP) {
    $$('.magnetic').forEach(b => {
      const xTo = gsap.quickTo(b, 'x', { duration: .6, ease: 'elastic.out(1,0.4)' }), yTo = gsap.quickTo(b, 'y', { duration: .6, ease: 'elastic.out(1,0.4)' });
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .3); yTo((e.clientY - r.top - r.height / 2) * .4); });
      b.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
    const ring = $('.cursor'), label = $('.cursor span');
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; ring.classList.add('on'); }, { passive: true });
    document.addEventListener('pointerleave', () => ring.classList.remove('on'));
    gsap.ticker.add(() => { x += (tx - x) * .2; y += (ty - y) * .2; ring.style.transform = `translate3d(${x}px, ${y}px, 0)`; });
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('a, button, [data-cursor], input, textarea, summary, .f-row');
      const lab = t && t.dataset.cursor;
      ring.classList.toggle('hover', !!t && !lab); ring.classList.toggle('label', !!lab); label.textContent = lab || '';
      ring.classList.toggle('hide', !!e.target.closest('#scopeCanvas, dialog'));
    });
  }

  /* ================= Camera shots: the pose the world holds while each section is on screen ================= */
  function buildShots() {
    if (!World.ok) return;
    const vh = innerHeight, p = World.poses(innerWidth / innerHeight);
    if (reduce) { World.shots = [{ y0: 0, y1: 1e9, a: p.wide }]; return; }
    const top = el => el.getBoundingClientRect().top + scrollY;
    const sec = (sel, a, b, toSel) => {
      const y0 = top($(sel)), y1 = $(toSel || sel).getBoundingClientRect().bottom + scrollY - vh;
      return { y0, y1: Math.max(y0, y1), a, b };
    };
    const shots = [
      { y0: 0, y1: 0, a: p.intro },
      { y0: vh * 0.6, y1: vh * 0.6, a: p.through },
      sec('#approach', p.approach, p.approachEnd),
      sec('#demo', p.orbit),
      sec('#caught', p.gate, p.gateEnd),
      ...p.stations.map((pose, i) => sec('#st' + (i + 1), pose)),
      sec('#more', p.wide),
      sec('#calls', p.ground, p.groundEnd, '#log'),
      sec('#contact', p.uplink),
    ];
    for (let i = 1; i < shots.length; i++) { shots[i].y0 = Math.max(shots[i].y0, shots[i - 1].y1); shots[i].y1 = Math.max(shots[i].y1, shots[i].y0); }
    World.shots = shots;
  }

  /* 3D name + station labels, once the display fonts have loaded */
  const fontsReady = (document.fonts ? Promise.all([document.fonts.load('800 100px Archivo'), document.fonts.load('600 40px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve())
    .then(() => { if (World.ok) { World.buildName(innerWidth / innerHeight < 0.9 ? ['RAJIV', 'RANGA', 'NATH'] : ['RAJIV', 'RANGANATH']); World.buildLabels(FILES.slice(0, 4).map(f => f.nm)); } });

  /* ================= Without GSAP, or with reduced motion: final states ================= */
  if (!hasGSAP || reduce) {
    done(); const l = $('#loader'); l && l.remove();
    World.name.form = 1; buildShots();
    addEventListener('resize', buildShots);
    if (hasGSAP) CH.forEach(([id], i) => ScrollTrigger.create({ trigger: '#' + id, start: 'top 50%', end: 'bottom 50%', onToggle: s => s.isActive && setChapter(i) }));
    return;
  }

  /* ================= Scroll choreography ================= */
  const mm = gsap.matchMedia();
  const approachChars = splitChars($('#approach h2'));
  $$('h2.sw').forEach(h => splitWords(h));
  const mfWords = splitWords($('.mf'), 'mw');
  const bigChars = splitChars($('.contact .giant'));

  gsap.set('.intro-copy > *, .intro-stats', { opacity: 0, y: 26 });
  gsap.set(approachChars, { yPercent: 115, opacity: 0 });
  gsap.set($$('h2.sw .w'), { yPercent: 110 });
  gsap.set('.rv', { opacity: 0, y: 44, filter: 'blur(8px)' });

  function countUp(el) {
    const target = +el.dataset.count, dec = +(el.dataset.dec || 0), o = { v: +(el.dataset.from || 0) };
    gsap.to(o, { v: target, duration: 1.6, ease: 'power3.out', onUpdate: () => el.textContent = o.v.toFixed(dec) });
  }
  function intro() {
    fontsReady.then(() => gsap.to(World.name, { form: 1, duration: 3.6, ease: 'power2.inOut' }));
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to('.intro-copy > *', { opacity: 1, y: 0, duration: 1.1, stagger: 0.1 }, 1.4)
      .to('.intro-stats', { opacity: 1, y: 0, duration: 1.1 }, 1.7)
      .add(() => $$('.intro-stats [data-count]').forEach(countUp), 1.8)
      .from('#rail', { opacity: 0, x: 20, duration: 1 }, 1.9);
  }

  // ---- boot sequence (first visit per session only)
  function boot() {
    const loader = $('#loader');
    if (!document.documentElement.classList.contains('booting') || !loader) { loader && loader.remove(); done(); return Promise.resolve(); }
    try { sessionStorage.setItem('booted', '1'); } catch (e) {}
    lenis && lenis.stop();
    return new Promise(res => {
      const num = $('#ldNum'), tr = $('#ldTracks'), o = { p: 0 };
      const clock = setInterval(() => { $('#ldClock').textContent = 'BLR ' + new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' }); }, 250);
      gsap.timeline()
        .from('.ld-log li', { opacity: 0, x: -12, stagger: 0.26, duration: 0.3, ease: 'power2.out' }, 0)
        .to(o, { p: 100, duration: 1.55, ease: 'power2.inOut', onUpdate: () => {
          num.textContent = String(Math.round(o.p)).padStart(3, '0');
          $('#ldBar').style.transform = `scaleX(${o.p / 100})`;
          tr.textContent = Math.min(6, Math.floor(o.p / 16.6)) + '/6';
        } }, 0)
        .to('.ld-lock', { opacity: 1, duration: 0.12, repeat: 3, yoyo: true }, '>-0.05')
        .add(() => { res(); lenis && lenis.start(); })
        .to('#loader', { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.05, ease: 'expo.inOut' }, '<')
        .add(() => { clearInterval(clock); loader.remove(); done(); });
    });
  }
  boot().then(intro);

  // ---- intro copy leaves as the camera starts its dive
  gsap.to('.intro-copy, .intro-stats', { opacity: 0, y: -60, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: '45% top', scrub: true } });

  // ---- approach: headline rises, then the manifesto lights word by word while the stage is sticky
  ScrollTrigger.create({ trigger: '#approach', start: 'top 60%', once: true, onEnter: () => gsap.to(approachChars, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.022, ease: 'expo.out' }) });
  gsap.fromTo(mfWords, { opacity: 0.12 }, { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: '#approach', start: '28% top', end: '82% bottom', scrub: 0.6 } });

  // ---- section headings: word mask reveal
  $$('h2.sw').forEach(h => gsap.to($$('.w', h), { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: h, start: 'top 86%', once: true } }));
  $$('.eyebrow').forEach(e => ScrollTrigger.create({ trigger: e, start: 'top 90%', once: true, onEnter: () => scramble(e, 600) }));
  ScrollTrigger.batch('.rv', { start: 'top 88%', once: true, onEnter: b => gsap.to(b, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, ease: 'expo.out', stagger: 0.08 }) });

  // ---- Evidence Gate: pinned and scrubbed on desktop, auto-played on small screens
  const items = $$('#checks li');
  mm.add('(min-width: 1001px)', () => {
    gsap.set('#bubble .gw', { opacity: 0.07 }); gsap.set('#hyp, #verdictNote, #score', { opacity: 0 });
    gsap.set(items, { opacity: 0.18 }); gsap.set('.i-res', { opacity: 0, scale: 0.4 });
    gsap.set('#stamp', { opacity: 0, scale: 2.8, rotate: -16, filter: 'blur(10px)' });
    const tl = gsap.timeline({ scrollTrigger: { trigger: '#gatePin', start: 'top top+=88', end: '+=230%', pin: true, scrub: 0.7 } });
    tl.to('#bubble .gw', { opacity: 1, stagger: 0.04, duration: 0.2, ease: 'none' })
      .to('#hyp', { opacity: 1, duration: 0.3 });
    items.forEach(li => {
      const fail = li.classList.contains('fail');
      tl.to(li, { opacity: 1, duration: 0.25 })
        .to(li.querySelector('.i-wait'), { opacity: 0, duration: 0.1 }, '<0.1')
        .to(li.querySelector('.i-res'), { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(3)' }, '<');
      if (fail) tl.to(li, { backgroundColor: 'rgba(255,90,78,.12)', duration: 0.15 }, '<')
        .to('#gate', { keyframes: { x: [0, -8, 7, -5, 3, 0] }, duration: 0.3, ease: 'none' }, '<');
    });
    tl.to('#score', { opacity: 1, duration: 0.2 })
      .to('#stamp', { opacity: 1, scale: 1, rotate: -4, filter: 'blur(0px)', duration: 0.45, ease: 'back.out(2.2)' })
      .fromTo('.gate-flash', { opacity: 0 }, { opacity: 1, duration: 0.08, yoyo: true, repeat: 1 }, '<0.25')
      .to('#verdictNote', { opacity: 1, duration: 0.3 })
      .to({}, { duration: 0.5 });
  });
  mm.add('(max-width: 1000px)', () => {
    const ws = $$('#bubble .gw');
    gsap.set(ws, { opacity: 0.07 }); gsap.set(items, { opacity: 0.18 }); gsap.set('.i-res', { opacity: 0 });
    gsap.set('#hyp, #verdictNote, #score', { opacity: 0 }); gsap.set('#stamp', { opacity: 0, scale: 2.4 });
    const tl = gsap.timeline({ paused: true });
    tl.to(ws, { opacity: 1, stagger: 0.02, duration: 0.1 }).to('#hyp', { opacity: 1, duration: 0.3 });
    items.forEach(li => tl.to(li, { opacity: 1, duration: 0.2 }).to(li.querySelector('.i-res'), { opacity: 1, duration: 0.15 }, '<').to(li.querySelector('.i-wait'), { opacity: 0, duration: 0.1 }, '<'));
    tl.to('#score', { opacity: 1 }).to('#stamp', { opacity: 1, scale: 1, rotate: -4, duration: 0.4, ease: 'back.out(2)' }).to('#verdictNote', { opacity: 1 });
    ScrollTrigger.create({ trigger: '#gate', start: 'top 70%', once: true, onEnter: () => tl.play() });
  });
  $('#replay').addEventListener('click', () => {
    const st = ScrollTrigger.getAll().find(s => s.pin === $('#gatePin'));
    if (st) lenis ? lenis.scrollTo(st.start, { duration: 1.2 }) : scrollTo(0, st.start);
  });
  ScrollTrigger.create({ trigger: '.gate-result', start: 'top 80%', once: true, onEnter: () => $$('.gate-result [data-count]').forEach(countUp) });

  // ---- station panels glide in from their side while the camera swings to the satellite
  $$('.station').forEach(s => {
    const side = s.classList.contains('left') ? -1 : 1;
    gsap.fromTo($('.spanel', s), { x: side * 120, opacity: 0 }, { x: 0, opacity: 1, ease: 'power2.out', scrollTrigger: { trigger: s, start: 'top 85%', end: 'top 25%', scrub: 0.8 } });
  });

  // ---- velocity marquee: speed and skew follow how fast you scroll
  let vel = 0;
  lenis && lenis.on('scroll', e => { vel = e.velocity; });
  $$('.vrow').forEach((row, i) => {
    const track = $('.vtrack', row), dir = i % 2 ? 1 : -1; let x = dir > 0 ? -track.scrollWidth / 2 : 0;
    gsap.ticker.add(() => {
      const half = track.scrollWidth / 2; if (!half) return;
      x += dir * (0.6 + Math.min(Math.abs(vel), 60) * 0.3);
      if (x <= -half) x += half; if (x > 0) x -= half;
      track.style.transform = `translate3d(${x}px,0,0) skewX(${gsap.utils.clamp(-12, 12, vel * -0.35)}deg)`;
    });
  });
  gsap.ticker.add(() => { vel *= 0.92; });

  // ---- hard calls: sticky stack, earlier cards recede as the next one lands
  mm.add('(min-width: 901px)', () => {
    const cards = $$('.scard');
    cards.forEach((c, i) => {
      if (i === cards.length - 1) return;
      gsap.to(c, { scale: 0.92, filter: 'brightness(0.35)', ease: 'none', scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 20%', scrub: true } });
    });
  });
  $$('.scard .sc-verdict').forEach(v => ScrollTrigger.create({ trigger: v, start: 'top 80%', once: true, onEnter: () => scramble(v, 800) }));

  gsap.fromTo('.tl-fill', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.tl', start: 'top 70%', end: 'bottom 55%', scrub: true } });
  gsap.fromTo(bigChars, { yPercent: 120, rotate: 8, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, stagger: 0.03, ease: 'none',
    scrollTrigger: { trigger: '.contact', start: 'top 85%', end: 'top 25%', scrub: 0.8 } });

  // ---- chapters for the HUD rail
  CH.forEach(([id], i) => ScrollTrigger.create({ trigger: '#' + id, start: 'top 50%', end: 'bottom 50%', onToggle: s => s.isActive && setChapter(i) }));

  // camera shots depend on final layout (pins add spacing), so rebuild on every refresh
  ScrollTrigger.addEventListener('refresh', buildShots);
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
  buildShots();
})();
