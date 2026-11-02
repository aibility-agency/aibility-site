/* aibility — page logic. Settings live in config.js (or the Google Sheet), texts in i18n.js. */
(function () {
  'use strict';

  var CFG = Object.assign({}, window.AIBILITY_CONFIG || {});
  var LANG = (document.documentElement.lang || 'it').slice(0, 2);
  var I18N = window.AIBILITY_I18N || {};
  var T = I18N[LANG] || I18N.it;
  var MAIL = 'info@aibility-agency.ch';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }
  function fmt(v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '’'); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function mailLink() { return '<a href="mailto:' + MAIL + '">' + MAIL + '</a>'; }

  /* ---------------- Backend (Google Apps Script) ---------------- */
  function api(action, data) {
    if (!CFG.endpoint) return Promise.reject(new Error('no_endpoint'));
    var req = data
      ? fetch(CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action: action, lang: LANG }, data)) })
      : fetch(CFG.endpoint + (CFG.endpoint.indexOf('?') < 0 ? '?' : '&') + 'action=' + action);
    return req.then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) { var e = new Error((j && j.error) || 'error'); e.code = j && j.error; throw e; }
      return j;
    });
  }

  /* ---------------- Areas & day timeline ---------------- */
  var AREA_KEYS = ['Email', 'Phone', 'Booking', 'Leads', 'Flow', 'Internal'];
  var AREAS = T.areas.map(function (a, i) { return { key: AREA_KEYS[i], label: a[0], name: a[1], sub: a[2] }; });
  var TIMES = ['07:42', '09:10', '10:30', '13:45', '15:20', '17:30'];
  var DAY = T.day.map(function (d, i) { return { time: TIMES[i], service: d[0], before: d[1], after: d[2] }; });

  var dayEl = $('#day');
  dayEl.innerHTML = DAY.map(function (d, i) {
    return '<li class="slot" style="transition-delay:' + (i * 70) + 'ms"><p class="slot-time"><span aria-hidden="true" class="slot-mk"></span>' + d.time +
      '<span class="slot-svc-m"> · ' + d.service + '</span></p><div><p class="slot-svc">' + d.service + '</p><p class="slot-text"></p></div></li>';
  }).join('');
  function setDay(after) {
    dayEl.classList.toggle('is-after', after);
    $$('.slot-text', dayEl).forEach(function (p, i) { p.textContent = after ? DAY[i].after : DAY[i].before; });
    $('#day-summary').textContent = after ? T.dayAfter : T.dayBefore;
    $('#seg-before').setAttribute('aria-pressed', String(!after));
    $('#seg-after').setAttribute('aria-pressed', String(after));
  }
  $('#seg-before').addEventListener('click', function () { setDay(false); });
  $('#seg-after').addEventListener('click', function () { setDay(true); });
  setDay(false);

  /* ---------------- Marquee: duplicate list for a seamless loop ---------------- */
  var track = $('#mq-track');
  var copy = track.firstElementChild.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  track.appendChild(copy);

  /* ---------------- Prices ---------------- */
  function renderPrices() {
    var cur = CFG.currency || 'CHF';
    var per = '<small>' + esc(T.perMonth) + '</small>';
    $('#price-base').innerHTML = esc(cur) + ' ' + fmt(num(CFG.priceBase, 390)) + per;
    $('#price-growth').innerHTML = esc(cur) + ' ' + fmt(num(CFG.priceGrowth, 790)) + per;
    var p = num(CFG.pricePartner, NaN);
    var el = $('#price-partner');
    if (isFinite(p)) { el.classList.remove('price-req'); el.innerHTML = esc(cur) + ' ' + fmt(p) + per; }
    else { el.classList.add('price-req'); el.textContent = T.onRequest; }
    $$('[data-currency]').forEach(function (e) { e.textContent = cur; });
    $$('[data-meeting-min]').forEach(function (e) { e.textContent = num(CFG.meetingMinutes, 30); });
  }

  /* ---------------- Savings quiz ---------------- */
  var S = { step: 1, area: null, n: null, h: null, name: '', email: '', company: '', anim: null };

  function share() {
    var a = S.area !== null ? num(CFG['share' + AREAS[S.area].key], NaN) : NaN;
    return isFinite(a) ? a : num(CFG.automatableShare, 50);
  }
  function calc() {
    var hrs = S.h * S.n * (share() / 100) * num(CFG.workingWeeks, 46);
    var step = num(CFG.roundTo, 100) || 1;
    return {
      hrs: hrs,
      chf: Math.round(hrs * num(CFG.hourlyCost, 65) / step) * step,
      fte: hrs / (num(CFG.fteHoursPerWeek, 42) * num(CFG.workingWeeks, 46))
    };
  }
  function areaName() { return S.area !== null ? AREAS[S.area].name : T.defaultArea; }

  var nIn = $('#fq-n'), hIn = $('#fq-h');
  function setupSliders() {
    [[nIn, 'people', 'n', 1, 10, 2], [hIn, 'hours', 'h', 1, 20, 15]].forEach(function (s) {
      var el = s[0], min = num(CFG[s[1] + 'Min'], s[3]), max = num(CFG[s[1] + 'Max'], s[4]);
      el.min = min; el.max = max;
      if (S[s[2]] === null || S[s[2]] < min || S[s[2]] > max) S[s[2]] = Math.min(max, Math.max(min, num(CFG[s[1] + 'Default'], s[5])));
      el.value = S[s[2]];
    });
    paintSliders();
  }
  function paintSliders() {
    [[nIn, 'n'], [hIn, 'h']].forEach(function (s) {
      var el = s[0], lo = +el.min, hi = +el.max;
      el.style.setProperty('--p', ((S[s[1]] - lo) / (hi - lo || 1) * 100).toFixed(1) + '%');
    });
    $('#n-val').textContent = S.n;
    $('#h-val').textContent = S.h + ' h';
  }
  nIn.addEventListener('input', function () { S.n = +nIn.value; paintSliders(); });
  hIn.addEventListener('input', function () { S.h = +hIn.value; paintSliders(); });

  var optsEl = $('#opts');
  optsEl.innerHTML = AREAS.map(function (o, i) {
    return '<button type="button" class="opt" aria-pressed="false" data-area="' + i + '"><span class="opt-l">' + o.label + '</span><span class="opt-s">' + o.sub + '</span></button>';
  }).join('');
  optsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.opt'); if (!b) return;
    S.area = +b.dataset.area; go(2);
  });
  $('.q-skip').addEventListener('click', function () { S.area = null; });

  function renderCalc() {
    var r = calc();
    $('#hrs-mon').textContent = fmt(r.hrs / 12);
    $('#fte').textContent = r.fte.toFixed(1).replace('.', T.decimal);
    $('#chf').textContent = fmt(r.chf);
    $('#calc-note').textContent = T.calcNote(num(CFG.meetingMinutes, 30), (CFG.currency || 'CHF') + ' ' + fmt(num(CFG.hourlyCost, 65)), share());
    return r;
  }
  function animateChf(target) {
    var el = $('#chf-anim');
    if (S.anim) cancelAnimationFrame(S.anim);
    if (reduceMotion) { el.textContent = fmt(target); return; }
    var t0 = performance.now(), step = num(CFG.roundTo, 100) || 1;
    (function tick(t) {
      var p = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(p < 1 ? Math.round(target * e / step) * step : target);
      if (p < 1) S.anim = requestAnimationFrame(tick);
    })(t0);
  }

  function go(step) {
    S.step = step;
    $$('.qstep').forEach(function (el) { el.hidden = +el.dataset.step !== step; });
    $$('.opt', optsEl).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.area === S.area)); });
    $$('[data-area-up]').forEach(function (e) { e.textContent = areaName().toUpperCase(); });
    $('#dots').innerHTML = [1, 2, 3, 4].map(function (i) {
      return '<span class="dot' + (i <= step ? ' on' : '') + (i === step ? ' cur' : '') + '"></span>';
    }).join('');
    $('#q-label').textContent = step < 4 ? T.question(step) : T.done;
    if (step === 3) animateChf(renderCalc().chf);
    if (step === 4) {
      renderCalc();
      $('#name-suffix').textContent = S.name ? ', ' + S.name : '';
      $('#area-name').textContent = areaName();
      Booker.open();
    }
  }
  $('#quiz').addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]');
    if (b) go(+b.dataset.go);
  });

  /* ---------------- Form helpers ---------------- */
  function validate(form) {
    var bad = null;
    $$('[required]', form).forEach(function (f) {
      var ok = f.type === 'checkbox' ? f.checked : f.type === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.value.trim()) : f.value.trim() !== '';
      if (f.type !== 'checkbox') f.setAttribute('aria-invalid', String(!ok));
      if (!ok && !bad) bad = f;
    });
    var err = $('.form-err', form);
    if (bad) {
      err.textContent = bad.type === 'checkbox' ? T.errConsent : bad.type === 'email' ? T.errEmail : T.errRequired;
      err.hidden = false; bad.focus();
      return false;
    }
    err.hidden = true;
    return true;
  }

  $('#lead-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    if (!validate(f)) return;
    S.name = f.name.value.trim(); S.email = f.email.value.trim(); S.company = f.company.value.trim();
    if (CFG.endpoint && !f.website.value) {
      var r = calc();
      api('lead', { name: S.name, email: S.email, company: S.company, area: areaName(), people: S.n, hours: S.h, savings: r.chf }).catch(function () {});
    }
    go(4);
  });

  /* ---------------- Booking calendar (Google Calendar via Apps Script) ---------------- */
  var Booker = (function () {
    var el = $('#booker'), B = T.bk;
    var st = { days: null, day: null, slot: null, demo: false, busy: false, done: null, loadedAt: 0 };
    var TZ = function () { return CFG.timeZone || 'Europe/Zurich'; };
    function f(d, o) { return new Intl.DateTimeFormat(T.locale, Object.assign({ timeZone: TZ() }, o)).format(new Date(d)); }
    function hm(d) { return f(d, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); }

    function zonedTime(y, m, d, hh, mm, tz) {
      var guess = Date.UTC(y, m, d, hh, mm);
      var p = {};
      new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
        .formatToParts(new Date(guess)).forEach(function (x) { p[x.type] = +x.value; });
      return guess - (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - guess);
    }
    function demoDays() {
      var out = [], d = new Date(), tz = TZ();
      while (out.length < 10) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        var slots = [];
        for (var m = 9 * 60; m < 17 * 60; m += 30) {
          if (m >= 12 * 60 && m < 13 * 60 + 30) continue;
          if ((d.getDate() * 7 + m / 30) % 5 === 0) continue; // fake "busy" slots
          slots.push(new Date(zonedTime(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(m / 60), m % 60, tz)).toISOString());
        }
        out.push({ date: d.toISOString().slice(0, 10), slots: slots });
      }
      return out;
    }

    function load() {
      st.days = null; st.slot = null; render();
      if (!CFG.endpoint) { st.demo = true; st.days = demoDays(); pickFirst(); return; }
      api('slots').then(function (j) {
        st.demo = false; st.days = j.days || []; st.loadedAt = Date.now(); pickFirst();
      }).catch(function () { st.days = 'error'; render(); });
    }
    function pickFirst() {
      var first = (st.days || []).filter(function (d) { return d.slots.length; })[0];
      if (!st.day || !st.days.some(function (d) { return d.date === st.day && d.slots.length; })) st.day = first ? first.date : null;
      render();
    }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    function short(s) { return s.replace(/\./g, ''); }

    function render() {
      if (st.done) {
        var ev = st.done;
        el.innerHTML = '<div class="bk-done"><span aria-hidden="true" class="sq-coral-lg"></span><div>' +
          '<p class="bk-done-t">' + esc(B.doneTitle) + '</p>' +
          '<p class="bk-done-s">' + esc(B.when(cap(f(ev.start, { weekday: 'long', day: 'numeric', month: 'long' })), hm(ev.start), num(CFG.meetingMinutes, 30))) +
          '<br>' + esc(B.sent(S.email, !!ev.meetLink)) +
          (ev.meetLink ? '<br><a href="' + esc(ev.meetLink) + '" target="_blank" rel="noopener">' + esc(B.meetLink) + '</a>' : '') +
          (st.demo ? '<br><em>' + esc(B.demoDone) + '</em>' : '') + '</p></div></div>';
        $('#back-from-4').hidden = true;
        return;
      }
      $('#back-from-4').hidden = false;
      var head = (st.demo ? '<p class="bk-demo">' + esc(B.demo) + '</p>' : '') +
        '<div class="bk-head"><p class="bk-label">' + esc(B.label) + '</p><p class="bk-tz">' + esc(B.tz) + '</p></div>';
      if (st.days === null) { el.innerHTML = head + '<div class="skel"></div><div class="skel"></div>'; return; }
      if (st.days === 'error') {
        el.innerHTML = head + '<p class="bk-msg bk-msg-err">' + esc(B.loadErr) + ' <button type="button" class="link-btn" data-bk="retry" style="margin:0">' + esc(B.retry) + '</button> ' + esc(B.orWrite) + ' ' + mailLink() + '.</p>';
        return;
      }
      if (!st.days.some(function (d) { return d.slots.length; })) {
        el.innerHTML = head + '<p class="bk-msg">' + esc(B.none).replace('{mail}', mailLink()) + '</p>';
        return;
      }
      var days = '<div class="bk-days" role="group" aria-label="' + esc(B.day) + '">' + st.days.map(function (d) {
        var noon = d.date + 'T12:00:00Z';
        return '<button type="button" class="bk-day" data-day="' + d.date + '" aria-pressed="' + (d.date === st.day) + '"' + (d.slots.length ? '' : ' disabled') +
          ' aria-label="' + esc(f(noon, { weekday: 'long', day: 'numeric', month: 'long' })) + (d.slots.length ? '' : esc(B.noSlots)) + '">' +
          '<span class="bk-dow">' + esc(short(f(noon, { weekday: 'short' }))) + '</span><span class="bk-dn">' + esc(f(noon, { day: 'numeric' }).replace('.', '')) +
          '</span><span class="bk-mon">' + esc(short(f(noon, { month: 'short' }))) + '</span></button>';
      }).join('') + '</div>';
      var cur = st.days.filter(function (d) { return d.date === st.day; })[0];
      var times = '<div class="bk-times" role="group" aria-label="' + esc(B.time) + '">' + (cur ? cur.slots : []).map(function (s) {
        return '<button type="button" class="bk-time" data-slot="' + s + '" aria-pressed="' + (s === st.slot) + '">' + esc(hm(s)) + '</button>';
      }).join('') + '</div>';
      var foot = st.slot
        ? '<div class="bk-foot">' + (st.err ? '<p class="form-err" role="alert">' + esc(st.err) + '</p>' : '') +
          '<button type="button" class="btn-go" data-bk="book"' + (st.busy ? ' disabled' : '') + '>' + (st.busy ? esc(B.confirming) : esc(B.confirm) + esc(short(f(st.slot, { weekday: 'short', day: 'numeric', month: 'short' }))) + ', ' + esc(hm(st.slot)) + ' →') + '</button></div>'
        : (st.err ? '<div class="bk-foot"><p class="form-err" role="alert">' + esc(st.err) + '</p></div>' : '');
      el.innerHTML = head + days + times + foot;
    }

    function book() {
      if (st.busy || !st.slot) return;
      st.busy = true; st.err = null; render();
      var r = calc();
      var payload = { start: st.slot, name: S.name, email: S.email, company: S.company, area: areaName(), people: S.n, hours: S.h, savings: r.chf, website: $('#lead-form').website.value };
      var p = st.demo
        ? new Promise(function (res) { setTimeout(function () { res({ event: { start: st.slot } }); }, 700); })
        : api('book', payload);
      p.then(function (j) { st.busy = false; st.done = j.event; render(); })
        .catch(function (e) {
          st.busy = false;
          if (e.code === 'slot_taken') { st.err = B.taken; load(); }
          else { st.err = B.failed; render(); }
        });
    }

    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.day) { st.day = b.dataset.day; st.slot = null; st.err = null; render(); var t = $('.bk-day[data-day="' + st.day + '"]', el); if (t) t.focus(); }
      else if (b.dataset.slot) { st.slot = b.dataset.slot; st.err = null; render(); var s = $('[data-bk="book"]', el); if (s) s.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' }); }
      else if (b.dataset.bk === 'book') book();
      else if (b.dataset.bk === 'retry') load();
    });

    return {
      open: function () {
        // Reload availability if never loaded or older than 2 minutes
        if (!st.done && (!st.days || st.days === 'error' || Date.now() - st.loadedAt > 120000)) load(); else render();
      }
    };
  })();

  /* ---------------- Contact form ---------------- */
  var cForm = $('#contact-form');
  cForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate(cForm)) return;
    var btn = $('button[type="submit"]', cForm);
    var done = function () { btn.disabled = false; cForm.hidden = true; $('#contact-sent').hidden = false; cForm.reset(); };
    if (!CFG.endpoint || cForm.website.value) { done(); return; }
    btn.disabled = true;
    api('contact', { name: cForm.name.value.trim(), email: cForm.email.value.trim(), message: cForm.message.value.trim() })
      .then(done)
      .catch(function () {
        btn.disabled = false;
        var err = $('.form-err', cForm);
        err.innerHTML = esc(T.errContact) + mailLink() + '.';
        err.hidden = false;
      });
  });
  $('#contact-new').addEventListener('click', function () { $('#contact-sent').hidden = true; cForm.hidden = false; });

  /* ---------------- "Come funziona" reveal ---------------- */
  var steps = $('#steps');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var rect = steps.getBoundingClientRect();
    if (rect.top > window.innerHeight) {
      steps.classList.add('armed');
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { steps.classList.add('on'); io.disconnect(); }
      }, { threshold: 0.35 });
      io.observe(steps);
    }
  }

  /* ---------------- Init ---------------- */
  function applyConfig() {
    renderPrices();
    setupSliders();
    if (S.step >= 3) renderCalc();
  }
  applyConfig();
  go(1);

  // Settings from the Google Sheet (if connected) override config.js
  if (CFG.endpoint) {
    api('config').then(function (j) {
      Object.keys(j.config || {}).forEach(function (k) {
        if (k !== 'endpoint' && j.config[k] !== '' && j.config[k] !== null) CFG[k] = j.config[k];
      });
      applyConfig();
    }).catch(function () {});
  }
})();
