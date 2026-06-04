/* ============================================================
   Brooke Baxter — Portfolio interactions
   Reveal system is scroll-position based (robust even when
   IntersectionObserver is inert, e.g. inside preview iframes),
   with a load-time fallback so content is never stranded.
   ============================================================ */
(function () {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- NAV scrolled state ---------- */
  const nav = document.getElementById('nav');
  const onNav = () => nav && nav.classList.toggle('scrolled', window.scrollY > 24);
  onNav();

  /* ---------- TOOLS TICKER ---------- */
  const tools = [
    ['n8n',            'workflows',  'assets/integrations/N8n-logo-new.svg'],
    ['Claude API',     'agents',     'assets/integrations/claude-logo.svg'],
    ['Python',         'automation', 'assets/integrations/Python-logo-notext.svg.png'],
    ['Next.js',        'full-stack', 'assets/integrations/Nextjs-logo.svg.png'],
    ['Supabase',       'realtime db','assets/integrations/supabase.webp'],
    ['Google Cloud Run','serverless','assets/integrations/googlecloudrun.webp'],
    ['Teamleader',     'CRM',        'assets/integrations/teamleader.png'],
    ['Microsoft Graph','M365 API',   'assets/integrations/microsoftgraphapilogo.png'],
    ['Docker',         'containers', 'assets/integrations/docker-icon-logo-icon-png-svg.png'],
    ['Mailchimp',      'delivery',   'assets/integrations/mailchimp_icon_146054.webp'],
  ];
  const track = document.getElementById('track');
  if (track) {
    const make = () => tools.map(([name, sub, img]) =>
      `<div class="tool"><img class="glyph" src="${img}" alt="${name}" />${name}<small>${sub}</small></div>`
    ).join('');
    track.innerHTML = make() + make(); // duplicate for seamless loop
  }

  /* ============================================================
     ROBUST "in view" SYSTEM
     watch(el, cb) -> cb runs once when el scrolls into view.
     Driven by scroll/resize position checks + a load fallback.
     ============================================================ */
  const pending = [];
  function watch(el, cb) { if (el) pending.push({ el, cb, done: false }); }

  function inView(el, margin) {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return r.top < vh * (1 - (margin || 0.06)) && r.bottom > 0;
  }
  let ticking = false;
  function check() {
    ticking = false;
    let alive = false;
    for (const item of pending) {
      if (item.done) continue;
      if (inView(item.el)) { item.done = true; item.cb(item.el); }
      else alive = true;
    }
    if (!alive && pollId) { clearInterval(pollId); pollId = null; }
    return alive;
  }
  function requestCheck() {
    if (!ticking) { ticking = true; requestAnimationFrame(check); }
  }
  // Transition-proof finalize: snaps every animated element to its END state
  // WITHOUT relying on the document timeline. In a throttled/preview iframe the
  // timeline can be frozen (transitions stuck at currentTime 0), so merely adding
  // a class never advances opacity past its hidden start. Setting transition:none
  // + the final value inline is immune to that freeze.
  function finalizeAll() {
    document.querySelectorAll('.reveal, .principle').forEach((e) => {
      e.style.transition = 'none'; e.classList.add('in');
      e.style.opacity = '1'; e.style.transform = 'none';
    });
    document.querySelectorAll('.donut-seg').forEach((s) => { s.style.transition = 'none'; s.style.strokeDashoffset = '0'; });
    document.querySelectorAll('.pipe').forEach((p) => { p.classList.add('run'); p.querySelectorAll('.pipe__step, .pipe__arrow').forEach((x) => x.classList.add('on')); });
    document.querySelectorAll('.kpi .bar > i').forEach((i) => { i.style.transition = 'none'; i.style.width = i.dataset.w + '%'; });
    document.querySelectorAll('.metro__line .track > span').forEach((s) => { s.style.transition = 'none'; s.style.width = s.dataset.w + '%'; });
    document.querySelectorAll('.principle .rule').forEach((r) => { r.style.transition = 'none'; r.style.transform = 'scaleX(1)'; });
    document.querySelectorAll('[data-count]').forEach((n) => { n.textContent = (n.dataset.prefix || '') + n.dataset.count + (n.dataset.suffix || ''); });
    document.querySelectorAll('.pill').forEach((p) => { p.style.opacity = '1'; });
    pending.forEach((it) => { it.done = true; });
    if (pollId) { clearInterval(pollId); pollId = null; }
  }

  window.addEventListener('scroll', () => { onNav(); check(); }, { passive: true });
  window.addEventListener('resize', check, { passive: true });
  let pollId = setInterval(check, 220);
  check();
  window.addEventListener('load', check);

  // Freeze probe: if a tiny test transition doesn't advance, the timeline is
  // frozen in this frame -> snap everything to final state so nothing is blank.
  (function freezeProbe() {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;transition:opacity .05s linear;pointer-events:none';
    document.body.appendChild(probe);
    setTimeout(() => { probe.style.opacity = '1'; }, 16);
    setTimeout(() => {
      const moved = parseFloat(getComputedStyle(probe).opacity) > 0.5;
      probe.remove();
      if (!moved) finalizeAll(); // timeline frozen -> guarantee visibility
    }, 260);
  })();

  // ultimate net: never strand content even if the probe is inconclusive
  setTimeout(() => { if (pending.some((it) => !it.done)) finalizeAll(); }, 6000);

  /* ---------- REVEAL ---------- */
  document.querySelectorAll('.reveal, .principle').forEach((el) => {
    watch(el, (e) => e.classList.add('in'));
  });

  /* ---------- COUNT-UP ---------- */
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    if (reduce) { el.textContent = prefix + target + suffix; return; }
    const dur = 1300, start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const val = Math.round((1 - Math.pow(1 - p, 3)) * target);
      el.textContent = prefix + val + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  document.querySelectorAll('.statrow').forEach((row) => {
    watch(row, (e) => e.querySelectorAll('[data-count]').forEach(countUp));
  });

  /* ---------- ESSMA PIPELINE ---------- */
  const pipe = document.getElementById('pipe');
  watch(pipe, (el) => {
    el.classList.add('run');
    const steps = [...el.querySelectorAll('.pipe__step')];
    const arrows = [...el.querySelectorAll('.pipe__arrow')];
    if (reduce) { steps.forEach(s => s.classList.add('on')); arrows.forEach(a => a.classList.add('on')); return; }
    steps.forEach((s, i) => setTimeout(() => {
      s.classList.add('on');
      if (arrows[i]) arrows[i].classList.add('on');
    }, i * 360));
  });

  /* ---------- ELEV8 KPI + METRO ---------- */
  watch(document.getElementById('elev8'), (el) => {
    el.querySelectorAll('.kpi .bar > i').forEach((i) => { i.style.width = i.dataset.w + '%'; });
    el.querySelectorAll('.metro__line .track > span').forEach((s, idx) => {
      setTimeout(() => { s.style.transition = 'width 1s cubic-bezier(.2,.8,.2,1)'; s.style.width = s.dataset.w + '%'; }, reduce ? 0 : 200 + idx * 120);
    });
  });

  /* ---------- PURE PORTFOLIOS DONUTS ---------- */
  const PAL = {
    blue: '#4C8DD6', purple: '#8C7BD6', green: '#36A877', teal: '#46BFA0',
    red: '#D56A4A', amber: '#E0A93B', grey: '#BBB4A7',
  };
  const donutData = [
    { title: 'Growth', risk: 'Aggressive — long horizon', center: '$2.1M',
      segs: [['Equities', 55, PAL.blue], ['Tech ETFs', 20, PAL.purple], ['Emerging mkts', 15, PAL.green], ['Cash', 10, PAL.grey]] },
    { title: 'Balanced', risk: 'Moderate — mixed risk', center: '$4.8M',
      segs: [['Equities', 40, PAL.blue], ['Bonds', 30, PAL.teal], ['Real estate', 15, PAL.red], ['Commodities', 10, PAL.amber], ['Cash', 5, PAL.grey]] },
    { title: 'Preservation', risk: 'Conservative — capital protection', center: '$8.3M',
      segs: [['Bonds', 50, PAL.green], ['Equities', 20, PAL.blue], ['Real estate', 20, PAL.red], ['Cash', 10, PAL.grey]] },
  ];
  const donutsWrap = document.getElementById('donuts');
  if (donutsWrap) {
    donutData.forEach((d) => {
      let cum = 0;
      const segsSVG = d.segs.map(([label, pct, color]) => {
        const rot = cum * 3.6 - 90; cum += pct;
        return `<circle class="donut-seg" r="15.9155" cx="21" cy="21" fill="none" stroke="${color}" stroke-width="5.4" stroke-dasharray="${pct} 100" stroke-dashoffset="${pct}" transform="rotate(${rot} 21 21)"></circle>`;
      }).join('');
      const legend = d.segs.map(([label, pct, color]) =>
        `<div class="lg"><span class="sw" style="background:${color}"></span><span class="ln">${label}</span><span class="pc">${pct}%</span></div>`).join('');
      const el = document.createElement('div');
      el.className = 'donut';
      el.innerHTML = `
        <h5>${d.title}</h5>
        <div class="risk">${d.risk}</div>
        <svg viewBox="0 0 42 42">
          <circle r="15.9155" cx="21" cy="21" fill="none" stroke="#E8E2D7" stroke-width="5.4"></circle>
          ${segsSVG}
          <text class="ctr-v" x="21" y="20.5" text-anchor="middle" dominant-baseline="middle" fill="var(--ink)">${d.center}</text>
          <text class="ctr-l" x="21" y="25.5" text-anchor="middle" dominant-baseline="middle">AUM</text>
        </svg>
        <div class="legend">${legend}</div>`;
      donutsWrap.appendChild(el);
      watch(el, (node) => {
        node.querySelectorAll('.donut-seg').forEach((s, i) => {
          if (reduce) { s.style.strokeDashoffset = '0'; return; }
          setTimeout(() => { s.style.strokeDashoffset = '0'; }, 120 + i * 130);
        });
      });
    });
  }
  // donuts were appended after initial check — run once more
  check();

  /* ---------- HERO DRAG REVEAL ---------- */
  const reveal = document.getElementById('reveal');
  if (reveal) {
    const MIN = 6, MAX = 94;
    let split = 52, dragging = false, hasDragged = false;

    function paint() {
      reveal.style.setProperty('--split', split + '%');
      // high split => illustration (left) dominates => teal chips
      const teal = split >= 50;
      reveal.classList.toggle('show-teal', teal);
      reveal.classList.toggle('show-blue', !teal);
    }
    function setFromClientX(x) {
      const r = reveal.getBoundingClientRect();
      const p = ((x - r.left) / r.width) * 100;
      split = Math.max(MIN, Math.min(MAX, p));
      paint();
    }
    function start(e) {
      dragging = true;
      if (!hasDragged) { hasDragged = true; reveal.classList.add('dragged'); }
      if (reveal.setPointerCapture && e.pointerId != null) { try { reveal.setPointerCapture(e.pointerId); } catch (_) {} }
      setFromClientX(e.clientX);
    }
    function move(e) { if (dragging) { setFromClientX(e.clientX); e.preventDefault(); } }
    function end() { dragging = false; }

    reveal.addEventListener('pointerdown', start);
    reveal.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    reveal.addEventListener('pointercancel', end);

    paint();

    // If this frame's CSS timeline is frozen (some preview iframes), a class-driven
    // fade would stick — so disable the chip transition and let swaps be instant.
    (function chipFreezeProbe() {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;opacity:0;transition:opacity .05s linear;pointer-events:none';
      reveal.appendChild(probe);
      setTimeout(() => { probe.style.opacity = '1'; }, 16);
      setTimeout(() => {
        if (parseFloat(getComputedStyle(probe).opacity) < 0.5) reveal.classList.add('rc--instant');
        probe.remove();
      }, 240);
    })();

    // one-time auto demo so the interaction is discoverable
    if (!reduce) {
      [[850, 66], [1550, 36], [2300, 52]].forEach(([t, target]) => setTimeout(() => {
        if (hasDragged) return;
        const from = split, dur = 540, t0 = performance.now();
        (function step(now) {
          if (hasDragged) return;
          const k = Math.min((now - t0) / dur, 1);
          split = from + (target - from) * (1 - Math.pow(1 - k, 3));
          paint();
          if (k < 1) requestAnimationFrame(step);
        })(performance.now());
      }, t));
    }
  }

  /* ---------- PORTLAND GEAR badge carousel ---------- */
  ;(function pgInit() {
    const stage = document.getElementById('pg-stage');
    if (!stage) return;
    const slides = [...stage.querySelectorAll('.pg-slide')];
    const dots = [...document.querySelectorAll('#pg-dots .pg-dot')];
    let cur = 0;

    function goTo(n) {
      slides[cur].classList.remove('pg-slide--active');
      dots[cur].classList.remove('pg-dot--active');
      cur = (n + slides.length) % slides.length;
      slides[cur].classList.add('pg-slide--active');
      dots[cur].classList.add('pg-dot--active');
    }

    document.getElementById('pg-prev')?.addEventListener('click', () => goTo(cur - 1));
    document.getElementById('pg-next')?.addEventListener('click', () => goTo(cur + 1));
    dots.forEach(d => d.addEventListener('click', () => goTo(+d.dataset.i)));

    // touch / drag swipe
    let tx = 0;
    stage.addEventListener('pointerdown', e => { tx = e.clientX; });
    stage.addEventListener('pointerup', e => {
      const dx = e.clientX - tx;
      if (Math.abs(dx) > 36) goTo(dx < 0 ? cur + 1 : cur - 1);
    });
  })();

  /* ---------- HERO ANNOTATION LEAN INTERACTION ---------- */
  ;(function heroAnnotInit() {
    const zone = document.getElementById('heroAnnot');
    if (!zone) return;
    const photo = zone.querySelector('.ha-photo');
    if (!photo) return;

    let current = '';
    function setLean(side) {
      if (side === current) return;
      current = side;
      zone.classList.remove('lean-left', 'lean-right');
      if (side) zone.classList.add('lean-' + side);
    }

    zone.addEventListener('mousemove', (e) => {
      const r = photo.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      setLean(e.clientX < cx ? 'left' : 'right');
    });

    // touch support — finger position on photo
    zone.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const r = photo.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      setLean(touch.clientX < cx ? 'left' : 'right');
    }, { passive: true });

    zone.addEventListener('mouseleave', () => setLean(''));
    zone.addEventListener('touchend',   () => setLean(''));
  })();

  /* ---------- PRIVACY POLICY MODAL ---------- */
  ;(function privacyInit() {
    const btn = document.getElementById('privacyBtn');
    const modal = document.getElementById('privModal');
    const close = document.getElementById('privClose');
    const backdrop = document.getElementById('privBackdrop');
    if (!btn || !modal) return;

    function open() { modal.classList.add('is-open'); document.body.style.overflow = 'hidden'; requestAnimationFrame(() => close.focus()); }
    function shut() { modal.classList.remove('is-open'); document.body.style.overflow = ''; btn.focus(); }

    btn.addEventListener('click', open);
    close.addEventListener('click', shut);
    backdrop.addEventListener('click', shut);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('is-open')) shut(); });
  })();

  /* ---------- INROADS — tab switching + flip card ---------- */
  ;(function irInit() {
    const tabs = document.querySelectorAll('.ir-tab[data-irtab]');
    tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('ir-tab--active'));
        document.querySelectorAll('.ir-panel').forEach((p) => p.classList.remove('ir-panel--active'));
        btn.classList.add('ir-tab--active');
        const panel = document.getElementById('irtab-' + btn.dataset.irtab);
        if (panel) panel.classList.add('ir-panel--active');
      });
    });

    // postcard flip
    const flip = document.getElementById('ir-flip');
    const label = document.getElementById('ir-flip-label');
    if (flip) {
      flip.addEventListener('click', () => {
        const isFlipped = flip.classList.toggle('flipped');
        if (label) label.textContent = isFlipped ? 'Showing back' : 'Showing front';
      });
    }

    // count-up for ir-stat__n
    const irCard = document.getElementById('inroads');
    if (irCard) {
      watch(irCard, () => {
        irCard.querySelectorAll('.ir-stat__n[data-count]').forEach(countUp);
      });
    }
  })();

})();
