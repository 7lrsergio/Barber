/* ============================================================
   TIME — pure functions. No DOM, no fetch.
   All internal math is "minutes since local midnight".
   ============================================================ */

const T = (() => {

  const DAYS_LONG  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const DAYS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const MONTHS     = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

  /* "11:00" -> 660 */
  const toMin = hhmm => {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + m;
  };

  /* 660 -> "11:00"  (24h, for payloads) */
  const to24 = min =>
    String(Math.floor(min / 60)).padStart(2, '0') + ':' +
    String(min % 60).padStart(2, '0');

  /* 780 -> "1:00pm"  (for humans) */
  const toLabel = min => {
    const h24 = Math.floor(min / 60), m = min % 60;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, '0')}${h24 < 12 ? 'am' : 'pm'}`;
  };

  // Calendar dates and clock times always use the shop's configured timezone.
  const zoned = d => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: CONFIG.business.timezone, year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(d);
    const v = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return { key: `${v.year}-${v.month}-${v.day}`, min: Number(v.hour)*60+Number(v.minute), seconds: Number(v.second) };
  };
  const dateKey = d => zoned(d).key;
  const shiftKey = (key, n) => {
    const d = new Date(key + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const keyToDate = key => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const addDays = (d, n) => {
    const out = new Date(d);
    out.setDate(out.getDate() + n);
    return out;
  };

  const ceilTo = (min, step) => Math.ceil(min / step) * step;

  /* "Lunes, 17 oct 2026" */
  const longDate = key => {
    const d = keyToDate(key);
    return `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  const shortDay = key => {
    const d = keyToDate(key);
    return { dow: DAYS_SHORT[d.getDay()], dom: d.getDate(), month: MONTHS[d.getMonth()] };
  };

  const isoToLocal = iso => zoned(new Date(iso));
  const toISO = (key, min) => {
    const target = Date.parse(`${key}T${to24(min)}:00Z`);
    let guess = target;
    for (let i = 0; i < 4; i++) {
      const local = zoned(new Date(guess));
      const wall = Date.parse(`${local.key}T${to24(local.min)}:00Z`);
      const delta = target - wall;
      if (!delta) return new Date(guess).toISOString();
      guess += delta;
    }
    throw new Error('La hora no existe en la zona horaria configurada.');
  };

  /* ----------------------------------------------------------
     mergeBusy — overlapping Outlook events collapse into one band
     ---------------------------------------------------------- */
  const mergeBusy = list => {
    const sorted = [...list].sort((a, b) => a.start - b.start);
    const out = [];
    for (const b of sorted) {
      const last = out[out.length - 1];
      if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
      else out.push({ ...b });
    }
    return out;
  };

  /* ----------------------------------------------------------
     buildDay — THE core function.

     Given one day's busy events and the chosen haircut length,
     return everything page 2 needs to draw a column.

     Slots chain at (duration + buffer) inside each open gap, so
     every appointment is guaranteed a 5-minute break on both
     sides — including against existing Outlook events.
     ---------------------------------------------------------- */
  const buildDay = ({ key, busy = [], durationMin, cfg, now = new Date() }) => {
    const openMin  = toMin(cfg.hours.open);
    const closeMin = toMin(cfg.hours.close);
    const { bufferMinutes: buf, snapMinutes: snap, minLeadMinutes: lead } = cfg.booking;

    const weekday = keyToDate(key).getDay();
    const closed  = cfg.closedWeekdays.includes(weekday);

    /* Clip busy events to business hours, drop anything outside. */
    const occupied = mergeBusy(busy);
    const bands = mergeBusy(
      busy
        .map(b => ({
          start: Math.max(b.start, openMin),
          end:   Math.min(b.end,   closeMin),
          label: b.label || ''
        }))
        .filter(b => b.end > b.start)
    );

    /* Earliest bookable minute today (lead time), or opening on future days. */
    const isToday = key === dateKey(now);
    const earliest = isToday
      ? Math.max(openMin, ceilTo(zoned(now).min + zoned(now).seconds / 60 + lead, snap))
      : openMin;

    /* Walk the free gaps between busy bands, padded by the buffer. */
    const slots = [];
    if (!closed && key >= dateKey(now)) {
      let cursor = earliest;
      /* El centinela final lleva el colchón sumado: el descanso de 5 min
         va ENTRE citas, no contra la hora de cierre. Sin esto se perdía
         el último hueco del día. */
      const edges = [...occupied, { start: closeMin + buf, end: closeMin + buf }];

      for (const band of edges) {
        const gapEnd = band.start - buf;
        let s = ceilTo(cursor, snap);
        while (s + durationMin <= gapEnd && s + durationMin <= closeMin) {
          slots.push({ start: s, end: s + durationMin });
          s = ceilTo(s + durationMin + buf, snap);
        }
        cursor = Math.max(cursor, band.end + buf);
      }
    }

    return {
      key,
      closed,
      openMin,
      closeMin,
      spanMin: closeMin - openMin,
      busy: bands,
      slots,
      past: isToday && earliest >= closeMin
    };
  };

  return {
    toMin, to24, toLabel, dateKey, keyToDate, addDays, ceilTo,
    zoned, shiftKey, longDate, shortDay, isoToLocal, toISO, mergeBusy, buildDay,
    DAYS_LONG, DAYS_SHORT, MONTHS
  };
})();

window.T = T;
