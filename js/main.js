// Page choreography: boot, name formation, smooth scroll, camera shots for the 3D world,
// scroll-driven scenes, theme switch, project dialogs, section rail, cursor.
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

  /* ================= Theme ================= */
  const root = document.documentElement, themeBtn = $('#themeBtn');
  function setTheme(t) {
    root.dataset.theme = t;
    themeBtn.innerHTML = `<i class="ph ph-${t === 'light' ? 'moon' : 'sun'}"></i>`;
    themeBtn.setAttribute('aria-label', t === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    $('meta[name="theme-color"]').content = t === 'light' ? '#efece4' : '#05070b';
    if (World.setTheme) World.setTheme(t === 'light');
    document.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  }
  setTheme(root.dataset.theme === 'light' ? 'light' : 'dark');
  themeBtn.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('theme', next); } catch (e) {}
    if (document.startViewTransition && !reduce) document.startViewTransition(() => setTheme(next));
    else setTheme(next);
  });

  /* ================= More projects (cards + detail dialogs) ================= */
  const MORE = [
    { id: 'agent', nm: 'Agent Console', tag: 'Real-time web app', one: 'A chat interface for an AI agent that never loses or repeats a message, even when the connection drops.', met: 'Survives dropped connections',
      problem: 'The AI server streams messages that can arrive out of order, twice, or not at all when the connection breaks. The screen must still show everything exactly once, in order.',
      built: ['A message engine (outside React) that puts messages back in order and removes duplicates.', 'Automatic reconnect that picks up from the last message shown, with heartbeats and back-off.', 'A smooth UI that updates once per frame, so fast streams never freeze the page.'],
      result: 'Tested against the server\'s "chaos mode": dropped connections, reordered and duplicated messages.', stack: 'TypeScript, Next.js, React, WebSockets, Docker', links: [['Code', GH + 'Agent_assignment']] },
    { id: 'agency', nm: 'agencydesk', tag: 'Full-stack app', one: 'Project management for agencies and their clients, where one client can never see another\'s data.', met: 'Tested for data leaks',
      problem: 'Many agencies and their clients share one system. A single mistake could show one company\'s projects to another.',
      built: ['Backend API with login, roles and database migrations.', 'Strict separation between agencies, including a client who works with two agencies at once.', 'A test suite whose job is to prove no data leaks across companies.'],
      result: 'Isolation tests pass for every role and edge case.', stack: 'Python, FastAPI, SQLAlchemy, PostgreSQL, JWT', links: [['Code', GH + 'agencydesk'], ['Isolation tests', GH + 'agencydesk/blob/master/backend/tests/test_isolation.py']] },
    { id: 'composio', nm: '100-app research study', tag: 'Research', one: 'Which of 100 popular software apps can AI agents actually connect to today, and what blocks the rest?', met: '100 apps, every claim sourced',
      problem: 'Companies building AI agents need to know which apps they can integrate, and how hard each one is.',
      built: ['A research agent that collects evidence for every app, with the source saved for each claim.', 'A human check of a sample across all ten categories.', 'A live, interactive case study.'],
      result: '73 of 100 apps are ready now. I published the agent\'s raw 22% sample accuracy next to the corrected data.', stack: 'Python, HTML, data pipelines', links: [['Live study', 'https://rajivranganath.github.io/composio-100-app-toolkit-research/'], ['Code', GH + 'composio-100-app-toolkit-research']], img: ['assets/composio.jpg', 'Screenshot of the live 100-app study'] },
    { id: 'resume', nm: 'Resume reader', tag: 'Privacy-first tool', one: 'Reads PDF and Word resumes into structured data, entirely on your computer. No AI service, no internet.', met: '29 tests, works offline',
      problem: 'Resumes are personal data. Parsing them shouldn\'t mean sending them to someone else\'s server.',
      built: ['Readers for PDF and Word files, including two-column layouts.', 'Rules that find name, contact details, skills, education and experience.', 'A test that blocks the network to prove nothing leaves the machine.'],
      result: 'All 29 tests pass, including the offline test.', stack: 'Python, pdfplumber, python-docx', links: [['Code', GH + 'resume_extractor']] },
    { id: 'rpa', nm: 'Incident automation', tag: 'Team project, automation', one: 'When a factory sensor reports a problem, this creates the work order, gets approval and checks the fix, automatically.', met: 'Built by 3 people in parallel',
      problem: 'Turning a sensor alert into a fixed machine involves several systems and people, and steps get lost.',
      built: ['Software robots (UiPath) that move each incident from alert to work order to approval.', 'Live sensor data through Node-RED and MQTT.', 'Clear data contracts between the three parts so each teammate could build independently.'],
      result: 'A full loop from alert to verified fix, with a person approving each step and a log of everything.', stack: 'UiPath, Node-RED, MQTT, Python', links: [['Code', GH + 'RPA-project']] },
    { id: 'plag', nm: 'Plagiarism detector', tag: 'Language AI', one: 'Catches both copied and reworded text, and shows exactly which sentence came from where.', met: 'Live demo',
      problem: 'Simple checkers catch copy-paste but miss text that has been reworded.',
      built: ['A word-matching check against local documents.', 'A meaning-based check (sentence embeddings) against the web, to catch rewording.', 'Sentence-by-sentence results with similarity scores.'],
      result: 'Deployed as a web app. The free host sleeps when idle, so the first load takes about 30 seconds.', stack: 'Python, scikit-learn, Sentence Transformers, Streamlit', links: [['Live demo', 'https://nlp-project-dkpqfn4ivbr3mfjjkb9h6m.streamlit.app/'], ['Code', GH + 'NLP-Project']] },
    { id: 'gdpr', nm: 'Legal document assistant', tag: 'AI app', one: 'Summarises legal documents, flags privacy (GDPR) risks and answers questions about them.', met: 'Live demo',
      problem: 'Legal documents are long, and the risky clauses are easy to miss.',
      built: ['AI summaries of long documents, section by section.', 'Risk and clause detection with charts.', 'Question answering over the document (RAG).'],
      result: 'Live on Hugging Face. It sleeps when idle, so the first load takes about 30 seconds.', stack: 'Python, LLMs, FAISS, Streamlit', links: [['Live demo', 'https://huggingface.co/spaces/cs116/legal_document_summarization_final'], ['Code', GH + 'GDPR-Compliance-Checker']] },
    { id: 'dr', nm: 'Eye disease classifier', tag: 'Medical imaging', one: 'Grades diabetic eye disease from retina photos into five levels, from none to severe.', met: 'Internship final project',
      problem: 'Early screening prevents most severe vision loss from diabetes, but there aren\'t enough specialists to check every scan.',
      built: ['A deep learning model (ResNet-152) adapted to retina photos.', 'Training and evaluation on the public APTOS 2019 dataset.'],
      result: 'Final project of my deep learning internship at E2E Management Services.', stack: 'Python, PyTorch', links: [['Code', GH + 'Diabetic-Retinopathy-Project']] },
  ];
  $('#moreGrid').innerHTML = MORE.map((f, i) => `
    <button class="mini rv" data-open="${f.id}" data-cursor="Open">
      <span class="idx">${String(i + 1).padStart(2, '0')}</span>
      <span class="m-main"><b>${esc(f.nm)}</b><span>${esc(f.one)}</span></span>
      <span class="badge">${esc(f.tag)}</span>
      <span class="metric">${esc(f.met)}</span>
      <i class="ph ph-arrow-up-right"></i>
    </button>`).join('');

  const dlg = $('#dlg');
  const list = items => '<ul>' + items.map(i => `<li>${esc(i)}</li>`).join('') + '</ul>';
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-open]');
    if (!trigger) return;
    const f = MORE.find(x => x.id === trigger.dataset.open);
    $('#dlgTag').textContent = f.tag;
    $('#dlgTitle').textContent = f.nm;
    $('#dlgBody').innerHTML = `<p>${esc(f.one)}</p><h4>THE PROBLEM</h4><p>${esc(f.problem)}</p><h4>WHAT I BUILT</h4>${list(f.built)}<h4>RESULT</h4><p>${esc(f.result)}</p><h4>TECH</h4><p>${esc(f.stack)}</p>` +
      (f.img ? `<img src="${f.img[0]}" alt="${esc(f.img[1])}" loading="lazy">` : '') +
      `<div class="dlg-links">${f.links.map(([l, u], i) => `<a class="btn btn-sm ${i ? 'btn-ghost' : 'btn-primary'}" href="${u}" target="_blank" rel="noopener">${l === 'Code' ? '<i class="ph ph-github-logo"></i>' : '<i class="ph ph-arrow-up-right"></i>'}${esc(l)}</a>`).join('')}</div>`;
    dlg.showModal(); lenis && lenis.stop();
  });
  $('#dlgClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => lenis && lenis.start());

  /* ================= Evidence Gate (real case pay_0048CBEF) ================= */
  const GATE_REASON = 'The settlement shows a large refund adjustment of 1,272,670 paise, exactly matching the amount of an unlinked refund record. The shadow ledger expected no refunds, so the discrepancy can be explained by a refund that has not been linked to this payment.';
  const CHECKS = [
    ['The refund record exists', true, 'Found refund rfnd_003431D5'],
    ['It was actually processed', true, 'Status: processed'],
    ['It isn\'t matched to another payment', true, 'Not linked anywhere yet'],
    ['It belongs to this customer', false, 'Refund says CUST-0081, this order is CUST-0011'],
    ['The amount matches', true, '₹12,726.70 vs ₹12,726.70'],
    ['The dates make sense', false, 'Refund dated 28 Jun, before the 30 Jun payment'],
    ['The books balance', true, 'Applying it would balance the account'],
  ];
  $('#bubble').innerHTML = GATE_REASON.split(' ').map(w => `<span class="gw">${esc(w)}</span>`).join(' ');
  $('#checks').innerHTML = CHECKS.map(([name, ok, d]) =>
    `<li class="${ok ? 'pass' : 'fail'}"><span class="ic"><i class="ph ph-circle-dashed i-wait"></i><i class="ph-fill ${ok ? 'ph-check-circle' : 'ph-x-circle'} i-res"></i></span><span>${esc(name)}<span class="d">${esc(d)}</span></span></li>`).join('');

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
  const nav = $('#nav'), navLinks = $('#navLinks'), menuBtn = $('#menuBtn');
  const goTo = target => {
    if (lenis) lenis.scrollTo(target, { duration: 2.2 });
    else if (target === 0) scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href'), target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault(); navLinks.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false);
    goTo(target);
  });

  /* ================= Nav ================= */
  menuBtn.addEventListener('click', () => menuBtn.setAttribute('aria-expanded', navLinks.classList.toggle('open')));
  const links = $$('a', navLinks);
  links.forEach(a => a.addEventListener('pointerenter', () => scramble(a, 420)));
  new IntersectionObserver(([e]) => nav.classList.toggle('scrolled', !e.isIntersecting), { rootMargin: '-140px 0px 0px 0px' }).observe($('#top'));
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', (a.dataset.sec || a.getAttribute('href').slice(1)).split(' ').includes(e.target.id)));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach(s => spy.observe(s));

  /* ================= Section rail + altitude (live from the 3D camera) ================= */
  const CH = [['top', 'Home'], ['about', 'About'], ['what', 'What I do'], ['experience', 'Experience'], ['p1', 'Projects'], ['more', 'More projects'], ['how', 'How I work'], ['skills', 'Skills'], ['contact', 'Contact']];
  const rail = $('#rail'), railAlt = $('#railAlt');
  $('ol', rail).innerHTML = CH.map(([id, n]) => `<li><a href="#${id}" aria-label="${n}"><span>${n}</span></a></li>`).join('');
  const setChapter = i => $$('li', rail).forEach((li, k) => li.classList.toggle('on', k === i));
  setChapter(0);
  setInterval(() => { railAlt.textContent = Math.round(World.stats.alt || 0).toLocaleString('en-US'); }, 120);

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
  const wm = $('.wordmark');
  wm.addEventListener('pointermove', e => wm.style.setProperty('--wx', e.clientX - wm.getBoundingClientRect().left + 'px'));
  wm.addEventListener('pointerleave', () => wm.style.removeProperty('--wx'));

  /* ================= Pointer layer: magnetic buttons, cursor ================= */
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
      const t = e.target.closest('a, button, [data-cursor], input, textarea, summary');
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
      sec('#about', p.approach, p.approachEnd),
      sec('#what', p.orbit),
      sec('#experience', p.gate, p.gateEnd),
      ...p.stations.map((pose, i) => sec('#p' + (i + 1), pose)),
      sec('#more', p.wide),
      sec('#how', p.ground, p.groundEnd, '#skills'),
      sec('#contact', p.uplink),
    ];
    for (let i = 1; i < shots.length; i++) { shots[i].y0 = Math.max(shots[i].y0, shots[i - 1].y1); shots[i].y1 = Math.max(shots[i].y1, shots[i].y0); }
    World.shots = shots;
  }

  /* 3D name + satellite labels, once the display fonts have loaded */
  const fontsReady = (document.fonts ? Promise.all([document.fonts.load('800 100px Archivo'), document.fonts.load('600 40px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve())
    .then(() => { if (World.ok) { World.buildName(innerWidth / innerHeight < 0.9 ? ['RAJIV', 'RANGA', 'NATH'] : ['RAJIV', 'RANGANATH']); World.buildLabels(['LedgerGuard', 'Orbit Guard', 'Report AI', 'Sensor AI']); } });

  /* ================= HUD: reticles locked on the 3D objects, leader lines to the copy about them ================= */
  if (World.ok && World.project && !reduce) {
    const svg = $('#hud'), wide = matchMedia('(min-width: 1001px)');
    const el = (tag, cls, g) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); cls && e.setAttribute('class', cls); g.append(e); return e; };
    const NAMES = ['LEDGERGUARD', 'ORBIT GUARD', 'REPORT AI', 'SENSOR AI'];
    const marks = [
      { sec: $('#about'), pt: World.B, rad: 0.45, label: 'HOME BASE', sub: 'BANGALORE, INDIA', to: $('#about .fact:last-child b') },
      ...World.stations.map((pt, i) => ({ sec: $('#p' + (i + 1)), pt, rad: 2.2, focus: i, label: `PROJECT 0${i + 1}`, sub: NAMES[i], to: $(`#p${i + 1} .pj-name`) })),
    ].map(m => {
      const g = el('g', '', svg), t1 = el('text', '', g), t2 = el('text', 'sb', g);
      t1.textContent = m.label; t2.textContent = m.sub;
      const dot = el('circle', '', g); dot.setAttribute('r', 3);
      return Object.assign(m, { g, t1, t2, dot, w: 0, br: el('path', 'br', g), ld: el('path', 'ld', g) });
    });
    const clamp01 = v => Math.max(0, Math.min(1, v));
    World.onFrame = () => {
      const vh = innerHeight;
      // read every rect first, then write, so the SVG updates never force extra layouts
      marks.forEach(m => { m.r = m.sec.getBoundingClientRect(); m.a = wide.matches && m.to ? m.to.getBoundingClientRect() : null; });
      for (const m of marks) {
        const on = m.r.top < vh * 0.6 && m.r.bottom > vh * 0.4 && root.dataset.veil !== 'c';   // demos take the whole screen
        m.w += ((on ? (m.focus === undefined ? 1 : World.focusW(m.focus)) : 0) - m.w) * 0.1;
        const p = m.w > 0.01 && World.project(m.pt, m.rad);
        m.g.style.opacity = p && p.on ? Math.min(1, m.w * 1.4) : 0;
        if (!p || !p.on) continue;
        // brackets close in on the target as the camera settles
        const h = Math.max(16, p.r) * (1 + (1 - m.w) * 0.9), k = Math.min(14, h * 0.45);
        const x0 = p.x - h, x1 = p.x + h, y0 = p.y - h, y1 = p.y + h;
        m.br.setAttribute('d', `M${x0} ${y0 + k}V${y0}H${x0 + k}M${x1 - k} ${y0}H${x1}V${y0 + k}M${x1} ${y1 - k}V${y1}H${x1 - k}M${x0 + k} ${y1}H${x0}V${y1 - k}`);
        m.t1.setAttribute('x', x0); m.t1.setAttribute('y', y0 - 24);
        m.t2.setAttribute('x', x0); m.t2.setAttribute('y', y0 - 9);
        // leader: from the reticle to the nearest visible point on the panel edge, 45 degrees then level
        const a = m.a, lv = a ? clamp01((Math.min(a.bottom, vh - 40) - Math.max(a.top, 100)) / Math.min(120, a.height)) : 0;
        if (!lv) { m.ld.style.opacity = m.dot.style.opacity = 0; continue; }
        const pad = Math.min(36, a.height / 2), side = a.left > p.x ? 1 : -1, ax = side > 0 ? a.left : a.right;
        const ay = Math.max(100, Math.min(vh - 40, Math.max(a.top + pad, Math.min(a.bottom - pad, p.y))));
        const sx = p.x + side * h, sy = p.y, dy = ay - sy;
        const bend = Math.abs(ax - sx) > Math.abs(dy) + 24, bx = sx + side * Math.abs(dy);
        const len = bend ? Math.hypot(bx - sx, dy) + Math.abs(ax - bx) : Math.hypot(ax - sx, dy);
        m.ld.setAttribute('d', bend ? `M${sx} ${sy}L${bx} ${ay}H${ax}` : `M${sx} ${sy}L${ax} ${ay}`);
        m.ld.style.strokeDasharray = len; m.ld.style.strokeDashoffset = len * (1 - m.w);
        m.ld.style.opacity = lv; m.dot.style.opacity = lv * m.w;
        m.dot.setAttribute('cx', ax); m.dot.setAttribute('cy', ay);
      }
    };
  }

  /* ================= Veil: darkens the side of the screen the copy is on, so text needs no cards ================= */
  const veiled = $$('[data-veil]');
  const setVeil = () => {
    const mid = innerHeight / 2; let v = '';
    for (const el of veiled) { const r = el.getBoundingClientRect(); if (r.top < mid && r.bottom > mid) v = el.dataset.veil; }   // innermost wins
    if ((root.dataset.veil || '') !== v) v ? root.dataset.veil = v : delete root.dataset.veil;
  };
  addEventListener('scroll', setVeil, { passive: true }); setVeil();

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
  const aboutChars = splitChars($('#about h2'));
  $$('h2.sw').forEach(h => splitWords(h));
  const mfWords = splitWords($('.mf'), 'mw');
  const bigChars = splitChars($('.contact .giant'));

  gsap.set('.intro-copy > *, .intro-stats', { opacity: 0, y: 26 });
  gsap.set(aboutChars, { yPercent: 115, opacity: 0 });
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
    if (!root.classList.contains('booting') || !loader) { loader && loader.remove(); done(); return Promise.resolve(); }
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

  // ---- home copy leaves as the camera starts its dive
  gsap.to('.intro-copy, .intro-stats', { opacity: 0, y: -60, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: '45% top', scrub: true } });

  // ---- about: headline rises, then the paragraph lights word by word while the stage is pinned
  ScrollTrigger.create({ trigger: '#about', start: 'top 60%', once: true, onEnter: () => gsap.to(aboutChars, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.022, ease: 'expo.out' }) });
  gsap.fromTo(mfWords, { opacity: 0.18 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '#about', start: '20% top', end: '55% bottom', scrub: 0.6 } });

  // ---- section headings: word mask reveal; labels scramble in
  $$('h2.sw').forEach(h => gsap.to($$('.w', h), { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: h, start: 'top 86%', once: true } }));
  $$('.eyebrow').forEach(e => ScrollTrigger.create({ trigger: e, start: 'top 90%', once: true, onEnter: () => scramble(e.lastElementChild || e, 600) }));
  ScrollTrigger.batch('.rv', { start: 'top 88%', once: true, onEnter: b => gsap.to(b, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, ease: 'expo.out', stagger: 0.08 }) });

  // ---- intro lines slide up through masks; project names rise letter by letter as the camera arrives (SplitText re-splits on resize)
  if (window.SplitText) {
    gsap.registerPlugin(SplitText);
    $$('.lines').forEach(el => SplitText.create(el, { type: 'lines', mask: 'lines', autoSplit: true,
      onSplit: s => gsap.from(s.lines, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: el, start: 'top 88%', once: true } }) }));
    $$('.pj-name').forEach(el => SplitText.create(el, { type: 'words,chars,lines', mask: 'lines', autoSplit: true,
      onSplit: s => gsap.from(s.chars, { yPercent: 110, rotate: 8, duration: 1.2, ease: 'expo.out', stagger: 0.035, scrollTrigger: { trigger: el, start: 'top 85%', once: true } }) }));
  }
  ScrollTrigger.batch('.pj-stat', { start: 'top 85%', once: true, onEnter: b => b.forEach(el => $$('[data-count]', el).forEach(countUp)) });

  // ---- big type leans a little with scroll speed, then settles
  let vel = 0, skew = 0;
  lenis && lenis.on('scroll', e => { vel = e.velocity; });
  gsap.ticker.add(() => {
    vel *= 0.9;
    const goal = gsap.utils.clamp(-3, 3, vel * -0.15);
    if (Math.abs(goal - skew) > 0.01) { skew += (goal - skew) * 0.15; root.style.setProperty('--skew', skew.toFixed(3)); }
  });

  // ---- project copy glides in from its side while the camera swings to the satellite
  $$('.project').forEach(s => {
    const side = s.classList.contains('left') ? -1 : 1, panel = $('.proj', s);
    gsap.fromTo(panel, { x: side * 100, opacity: 0 }, { x: 0, opacity: 1, ease: 'power2.out', scrollTrigger: { trigger: panel, start: 'top 95%', end: 'top 45%', scrub: 0.8 } });
  });

  // ---- Evidence Gate: pinned and scrubbed on desktop, auto-played on small screens
  const items = $$('#checks li');
  mm.add('(min-width: 1001px)', () => {
    gsap.set('#bubble .gw', { opacity: 0.08 }); gsap.set('#hyp, #verdictNote, #score', { opacity: 0 });
    gsap.set(items, { opacity: 0.2 }); gsap.set('.i-res', { opacity: 0, scale: 0.4 });
    gsap.set('#stamp', { opacity: 0, scale: 2.8, rotate: -16, filter: 'blur(10px)' });
    const tl = gsap.timeline({ scrollTrigger: { trigger: '#gatePin', start: 'top top+=88', end: '+=230%', pin: true, scrub: 0.7 } });
    tl.to('#bubble .gw', { opacity: 1, stagger: 0.04, duration: 0.2, ease: 'none' })
      .to('#hyp', { opacity: 1, duration: 0.3 });
    items.forEach(li => {
      const fail = li.classList.contains('fail');
      tl.to(li, { opacity: 1, duration: 0.25 })
        .to(li.querySelector('.i-wait'), { opacity: 0, duration: 0.1 }, '<0.1')
        .to(li.querySelector('.i-res'), { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(3)' }, '<');
      if (fail) tl.to('#gate', { keyframes: { x: [0, -8, 7, -5, 3, 0] }, duration: 0.3, ease: 'none' }, '<');
    });
    tl.to('#score', { opacity: 1, duration: 0.2 })
      .to('#stamp', { opacity: 1, scale: 1, rotate: -4, filter: 'blur(0px)', duration: 0.45, ease: 'back.out(2.2)' })
      .fromTo('.gate-flash', { opacity: 0 }, { opacity: 1, duration: 0.08, yoyo: true, repeat: 1 }, '<0.25')
      .to('#verdictNote', { opacity: 1, duration: 0.3 })
      .to({}, { duration: 0.5 });
  });
  mm.add('(max-width: 1000px)', () => {
    const ws = $$('#bubble .gw');
    gsap.set(ws, { opacity: 0.08 }); gsap.set(items, { opacity: 0.2 }); gsap.set('.i-res', { opacity: 0 });
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

  // ---- the world spells a word beside the row you're reading (wide screens); that row stays lit, the rest recede
  const glyphGroups = $$('[data-glyphs]'), how = $('#how');
  glyphGroups.forEach(g => { g._items = $$('[data-glyph]', g); });
  how.dataset.glyph = '01';
  let glyphOn = null;
  function setGlyph() {
    const wide = innerWidth > 900 && innerWidth / innerHeight >= 0.9;
    if (wide !== glyphOn) { glyphOn = wide; glyphGroups.forEach(g => g.classList.toggle('glyphs-on', wide)); }
    if (!World.glyph) return;
    const mid = innerHeight / 2; let word = '';
    for (const g of glyphGroups) {
      const r = g.getBoundingClientRect();
      if (!wide || r.top > mid || r.bottom < mid) continue;
      if (!g._items.length) { word = g.dataset.glyph; continue; }
      let best = null, bd = Infinity;
      for (const el of g._items) { const q = el.getBoundingClientRect(), d = Math.abs((q.top + q.bottom) / 2 - mid); if (d < bd) { bd = d; best = el; } }
      g._items.forEach(el => el.classList.toggle('is-on', el === best));
      word = best.dataset.glyph;
    }
    World.glyph(word);
  }
  fontsReady.then(() => { addEventListener('scroll', setGlyph, { passive: true }); addEventListener('resize', setGlyph); setGlyph(); });

  // ---- skills: each row's tools land one after another
  $$('.slot').forEach(row => gsap.from($$('.tools span', row), { opacity: 0, y: 14, duration: 0.7, ease: 'power3.out', stagger: 0.035, scrollTrigger: { trigger: row, start: 'top 88%', once: true } }));

  // ---- how I work: the stage pins and the five stories crossfade in place while the camera glides over the ground
  root.classList.add('stories-on');
  const stories = $$('.story'), ticks = $$('.st-ticks i');
  gsap.set(stories.slice(1), { autoAlpha: 0, y: 40 });
  const stl = gsap.timeline({
    scrollTrigger: { trigger: '#how', start: 'top top', end: 'bottom bottom', scrub: 0.6 },
    onUpdate() {
      const k = Math.max(0, Math.min(stories.length - 1, Math.floor(this.time() - 0.3)));
      ticks.forEach((t, i) => t.classList.toggle('on', i <= k));
      if (how.dataset.glyph !== '0' + (k + 1)) { how.dataset.glyph = '0' + (k + 1); setGlyph(); }
    },
  });
  stories.forEach((st, i) => { if (i) stl.to(stories[i - 1], { autoAlpha: 0, y: -40, duration: 0.4 }, i).to(st, { autoAlpha: 1, y: 0, duration: 0.4 }, i + 0.25); });
  stl.to({}, { duration: 0.7 });

  // ---- section headings dissolve as they leave, instead of sliding under the nav
  $$('.sec-head, .proj-head').forEach(h => gsap.fromTo(h, { opacity: 1, y: 0 }, { opacity: 0, y: -50, ease: 'none', immediateRender: false, scrollTrigger: { trigger: h, start: 'bottom 30%', end: 'bottom top', scrub: true } }));

  gsap.fromTo('.tl-fill', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.tl', start: 'top 70%', end: 'bottom 55%', scrub: true } });
  gsap.fromTo(bigChars, { yPercent: 120, rotate: 8, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, stagger: 0.03, ease: 'none',
    scrollTrigger: { trigger: '.contact', start: 'top 85%', end: 'top 25%', scrub: 0.8 } });

  // ---- section rail
  CH.forEach(([id], i) => ScrollTrigger.create({ trigger: '#' + id, start: 'top 50%', end: 'bottom 50%', onToggle: s => s.isActive && setChapter(i) }));

  // camera shots depend on final layout (pins add spacing), so rebuild on every refresh
  ScrollTrigger.addEventListener('refresh', buildShots);
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
  buildShots();
})();
