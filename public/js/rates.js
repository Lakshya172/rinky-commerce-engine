/* ─────────────────────────────────────────────────────────────────────────────
   Gold & Silver rates

   Formatting helpers are shared by the home page bar and the admin portal.
   The bar itself only activates when #rateBar exists, which is on the home
   page alone, so loading this file elsewhere has no visible effect.
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
  // Rates are Indian market rates for a Kanpur shop, so times are shown in the
  // shop's timezone. This is an IANA zone name resolved by Intl, not a fixed
  // offset, so it stays correct however the viewer's device is configured.
  const BUSINESS_TZ = 'Asia/Kolkata';
  const UNITS = { gold: '10g', silver: 'kg' };

  const inrWhole = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const inrPaise = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Indian digit grouping: ₹1,60,000/10g, ₹2,350/kg. Paise are shown only when
  // present, and then always as two digits (₹1,46,700.50, never ₹1,46,700.5).
  function formatRate(value, unit) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '—';
    const fmt = Number.isInteger(n) ? inrWhole : inrPaise;
    return '₹' + fmt.format(n) + '/' + unit;
  }

  function parts(date, options) {
    const out = {};
    new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: BUSINESS_TZ }, options))
      .formatToParts(date)
      .forEach(p => { out[p.type] = p.value; });
    return out;
  }

  // Built from parts rather than a locale string: some engines render en-GB /
  // en-IN short September as "Sept" and insert a narrow no-break space before
  // AM/PM, which would make the output inconsistent across browsers.
  function timeText(date) {
    const t = parts(date, { hour: 'numeric', minute: '2-digit', hour12: true });
    return t.hour + ':' + t.minute + ' ' + String(t.dayPeriod || '').toUpperCase();
  }

  function dateText(date) {
    const d = parts(date, { day: 'numeric', month: 'short', year: 'numeric' });
    return d.day + ' ' + d.month + ' ' + d.year;
  }

  function dayKey(date) {
    const d = parts(date, { year: 'numeric', month: '2-digit', day: '2-digit' });
    return d.year + '-' + d.month + '-' + d.day;
  }

  function toDate(value) {
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // "Updated at 11:09 PM" today, otherwise "Updated on 16 Sep 2026, 11:09 PM".
  function formatUpdated(value, now) {
    const d = toDate(value);
    if (!d) return '';
    const today = toDate(now) || new Date();
    return dayKey(d) === dayKey(today)
      ? 'Updated at ' + timeText(d)
      : 'Updated on ' + dateText(d) + ', ' + timeText(d);
  }

  // Unambiguous form for the admin portal: "16 Sep 2026, 11:09 PM IST".
  function formatUpdatedFull(value) {
    const d = toDate(value);
    if (!d) return '';
    const zone = parts(d, { timeZoneName: 'short' }).timeZoneName;
    return dateText(d) + ', ' + timeText(d) + (zone ? ' ' + (zone === 'GMT+5:30' ? 'IST' : zone) : '');
  }

  window.RinkyRates = { BUSINESS_TZ, UNITS, formatRate, formatUpdated, formatUpdatedFull };

  // ── Home page bar ─────────────────────────────────────────────────────────
  const bar = document.getElementById('rateBar');
  if (!bar) return;

  const valueEls = bar.querySelectorAll('.rate-value[data-rate]');
  const timeEl = document.getElementById('rateBarUpdated');

  function setValues(rates) {
    valueEls.forEach(el => {
      const key = el.dataset.rate;
      el.classList.remove('is-loading');
      el.textContent = rates ? formatRate(rates[key], el.dataset.unit) : '—';
    });
  }

  function setStatus(text, isoValue) {
    if (!timeEl) return;
    timeEl.textContent = text;
    if (isoValue) {
      timeEl.setAttribute('datetime', isoValue);
      timeEl.title = formatUpdatedFull(isoValue);
    } else {
      timeEl.removeAttribute('datetime');
      timeEl.removeAttribute('title');
    }
  }

  function finish(state) {
    bar.setAttribute('aria-busy', 'false');
    bar.dataset.state = state;
    syncOffset();
  }

  async function loadRates() {
    const controller = 'AbortController' in window ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
    try {
      const res = await fetch('/api/rates', { cache: 'no-store', signal: controller && controller.signal });
      const data = await res.json();
      if (!res.ok || !data || !data.success) throw new Error('Bad response');

      if (!data.rates) {
        setValues(null);
        setStatus('Today’s rates will be published shortly');
        return finish('empty');
      }
      setValues(data.rates);
      setStatus(formatUpdated(data.rates.lastUpdated), data.rates.lastUpdated);
      finish('ready');
    } catch (err) {
      setValues(null);
      setStatus('Rates temporarily unavailable');
      finish('error');
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // The navbar is position:fixed at the top of every page. On the home page it
  // has to sit directly below this bar, then dock to the top once the bar has
  // scrolled away, without a gap or an overlap at any scroll position.
  //
  // The bar's height is measured only when it can actually change (resize,
  // content arriving), never inside the scroll handler, so scrolling does not
  // force a layout. Scroll events already fire at most once per frame, so the
  // offset is applied directly in the event rather than deferred to the next one.
  let barHeight = 0;
  let lastOffset = -1;

  function applyOffset() {
    const offset = Math.max(0, Math.round(barHeight - window.scrollY));
    if (offset !== lastOffset) {
      lastOffset = offset;
      document.body.style.setProperty('--rate-bar-offset', offset + 'px');
    }
  }

  function measure() {
    const h = bar.offsetHeight;
    if (h !== barHeight) {
      barHeight = h;
      document.body.style.setProperty('--rate-bar-h', h + 'px');
    }
    applyOffset();
  }

  // Referenced by finish() once rates have rendered.
  const syncOffset = measure;

  window.addEventListener('scroll', applyOffset, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(bar);

  measure();
  loadRates();
})();
