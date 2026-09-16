/* ============================================================
   PÁGINA 2 — Aparta tu cita
   ============================================================ */
(() => {
  const el = id => document.getElementById(id);
  const loader = el('loader'), main = el('main'), doneView = el('done');
  const strip = el('strip'), confirm = el('confirm');

  const service = API.getService();
  if (!service) { location.replace('index.html'); return; }

  el('shopName').textContent = CONFIG.business.name;
  el('chipName').textContent = service.name;
  el('calendarHelp').textContent = `Próximos ${CONFIG.booking.daysAhead} días · ${T.toLabel(T.toMin(CONFIG.hours.open))} – ${T.toLabel(T.toMin(CONFIG.hours.close))} · ${CONFIG.business.timezone}. Desliza para ver más días y toca un horario.`;
  el('modeNote').hidden = !CONFIG.useMockData;
  el('modeNote').textContent = 'Modo demostración · Horarios de ejemplo. No se crean citas reales.';
  el('chipService').addEventListener('click', () => { location.href = 'index.html'; });

  const PX  = CONFIG.ui.pixelsPerMinute;
  const OPEN  = T.toMin(CONFIG.hours.open);
  const CLOSE = T.toMin(CONFIG.hours.close);
  const SPAN  = CLOSE - OPEN;

  let booking = false;
  let selected = null;              // { key, start, end }
  let days = [];                    // modelos ya calculados
  const draft = { name: '', phone: '' };   // sobrevive al cambio de horario

  /* ------------------------------------------------------------
     Arranque
     ------------------------------------------------------------ */
  start();

  async function start(force = false) {
    loader.hidden = false; loader.classList.remove('is-out');
    const slowHint = setTimeout(() => {
      el('loaderHint').textContent = 'Tarda un poco más de lo normal. Seguimos en eso.';
    }, 6000);

    try {
      const availability = await API.getAvailableTimes({force});
      clearTimeout(slowHint);
      build(availability);
      reveal();
    } catch (err) {
      clearTimeout(slowHint);
      loader.querySelector('.loader__text').textContent = 'No pudimos leer la agenda';
      el('loaderHint').innerHTML =
        'Revisa tu conexión e inténtalo otra vez.<br><br>' +
        '<a class="done__again" href="agenda.html">Reintentar</a> · <a class="done__again" href="index.html">Cambiar corte</a>';
      loader.querySelector('.pole').classList.remove('pole--spin');
    }
  }

  function reveal() {
    main.hidden = false;
    loader.classList.add('is-out');
    setTimeout(() => { loader.hidden = true; }, 380);
  }

  /* ------------------------------------------------------------
     Construir los N días a partir de UNA sola respuesta
     ------------------------------------------------------------ */
  function build(availability) {
    const now = new Date();
    days = [];

    for (let i = 0; i < CONFIG.booking.daysAhead; i++) {
      const key = T.shiftKey(T.dateKey(now), i + (CONFIG.booking.startOffsetDays ?? 0));
      days.push(T.buildDay({
        key,
        busy: availability[key] || [],
        durationMin: service.minutes,
        cfg: CONFIG,
        now
      }));
    }
    render();
  }

  /* ------------------------------------------------------------
     Render de la tira
     ------------------------------------------------------------ */
  function render() {
    strip.innerHTML = '';
    strip.style.setProperty('--hour', `${60 * PX}px`);

    strip.appendChild(ruler());
    const todayKey = T.dateKey(new Date());
    days.forEach(day => strip.appendChild(column(day, day.key === todayKey)));
    const nav = el('weekNav');
    nav.replaceChildren();
    days.forEach((day, i) => {
      const d = T.shortDay(day.key);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'week-day';
      button.innerHTML = `<span>${d.dow}</span><b>${d.dom}</b><small>${d.month}</small>`;
      button.setAttribute('aria-label', T.longDate(day.key));
      button.addEventListener('click', () => {
        const col = strip.querySelectorAll('.day')[i];
        const rulerWidth = strip.querySelector('.ruler').getBoundingClientRect().width;
        strip.scrollTo({left: col.offsetLeft - rulerWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
        nav.querySelectorAll('button').forEach(b => b.removeAttribute('aria-current'));
        button.setAttribute('aria-current', 'date');
      });
      nav.appendChild(button);
    });
  }

  function ruler() {
    const wrap = document.createElement('div');
    wrap.className = 'ruler';

    const head = document.createElement('div');
    head.className = 'ruler__head';
    wrap.appendChild(head);

    const track = document.createElement('div');
    track.className = 'ruler__track';
    track.style.height = `${SPAN * PX}px`;

    for (let m = OPEN; m <= CLOSE; m += 60) {
      const tick = document.createElement('span');
      tick.className = 'ruler__tick';
      tick.style.top = `${(m - OPEN) * PX}px`;
      tick.textContent = T.toLabel(m).replace(':00', '');
      track.appendChild(tick);
    }
    wrap.appendChild(track);
    return wrap;
  }

  function column(day, isToday) {
    const col = document.createElement('div');
    col.className = 'day' + (isToday ? ' day--today' : '');

    const d = T.shortDay(day.key);
    const head = document.createElement('div');
    head.className = 'day__head';
    head.innerHTML = `<span class="day__dow">${isToday ? 'Hoy' : d.dow}</span>
                      <span class="day__dom">${d.dom} <small>${d.month}</small></span>`;
    col.appendChild(head);

    const track = document.createElement('div');
    track.className = 'day__track';
    track.style.height = `${SPAN * PX}px`;

    /* bloques ocupados */
    day.busy.forEach(b => {
      const band = document.createElement('div');
      band.className = 'busy';
      band.style.top = `${(b.start - OPEN) * PX}px`;
      band.style.height = `${(b.end - b.start) * PX}px`;
      band.title = `Ocupado ${T.toLabel(b.start)} – ${T.toLabel(b.end)}`;
      track.appendChild(band);
    });

    /* horarios disponibles */
    day.slots.forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot';
      btn.style.top = `${(s.start - OPEN) * PX}px`;
      btn.style.height = `${(s.end - s.start) * PX - 2}px`;
      btn.textContent = T.toLabel(s.start).replace(/(am|pm)$/, '');
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label',
        `${T.longDate(day.key)}, ${T.toLabel(s.start)} a ${T.toLabel(s.end)}`);
      btn.addEventListener('click', () => select(day.key, s, btn));
      track.appendChild(btn);
    });

    if (!day.slots.length) {
      const empty = document.createElement('div');
      empty.className = 'day__empty';
      empty.textContent = day.closed ? 'Cerrado' : 'Sin espacio';
      track.appendChild(empty);
    }

    col.appendChild(track);
    return col;
  }

  /* ------------------------------------------------------------
     Selección de horario (no agenda todavía)
     ------------------------------------------------------------ */
  function select(key, slot, btn) {
    if (booking) return;
    strip.querySelectorAll('.slot[aria-pressed="true"]')
         .forEach(b => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');

    selected = { key, start: slot.start, end: slot.end };
    renderConfirm();
    confirm.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' });
    el('fName').focus({preventScroll:true});
  }

  function renderConfirm() {
    if (!selected) return;

    confirm.innerHTML = `
      <form class="ticket" id="bookingForm">
        <div class="ticket__line1">Cita para ${service.name}, ${service.minutes} min</div>
        <div class="ticket__price">$${service.price} · ${CONFIG.booking.bufferMinutes} min de descanso entre citas</div><div class="ticket__line2">${T.longDate(selected.key)}</div>
        <div class="ticket__line3">${T.toLabel(selected.start)} – ${T.toLabel(selected.end)}</div>

        <div class="fields">
          <div class="field">
            <label for="fName">Tu nombre</label>
            <input id="fName" type="text" autocomplete="name" placeholder="Nombre y apellido"
                   required minlength="2" maxlength="100">
          </div>
          <div class="field">
            <label for="fPhone">Teléfono</label>
            <input id="fPhone" type="tel" autocomplete="tel" inputmode="tel" placeholder="Tu número de contacto"
                   required maxlength="25">
          </div>
        </div>

        <button type="submit" class="btn-book" id="btnBook">¡Agendar cita!</button>
        <div id="msg" role="alert"></div>
      </form>`;

    el('fName').value = draft.name;
    el('fPhone').value = draft.phone;
    el('fName').addEventListener('input',  e => draft.name  = e.target.value);
    el('fPhone').addEventListener('input', e => draft.phone = e.target.value);
    el('bookingForm').addEventListener('submit', event => { event.preventDefault(); book(); });
  }

  /* ------------------------------------------------------------
     Agendar — el único disparo del webhook de reserva
     ------------------------------------------------------------ */
  async function book() {
    if (booking || !selected) return;
    const btn  = el('btnBook');
    const msg  = el('msg');
    const name = el('fName').value.trim();
    const phone = el('fPhone').value.trim();

    msg.innerHTML = '';

    if (name.length < 2) return fail(msg, 'Escribe tu nombre para apartar la cita.', 'fName');
    if (phone.replace(/\D/g, '').length < 10 || phone.replace(/\D/g, '').length > 15)
      return fail(msg, 'Escribe un teléfono de 10 dígitos.', 'fPhone');

    booking = true;
    el('chipService').disabled = true;
    strip.querySelectorAll('.slot').forEach(b => b.disabled = true);
    btn.disabled = true;
    btn.textContent = 'Agendando…';

    try {
      const result = await API.bookAppointment({
        service,
        dateKey: selected.key,
        startMin: selected.start,
        endMin: selected.end,
        customer: { name, phone }
      });

      doneView.querySelector('.done__title').textContent = result.demo ? '¡Prueba completada!' : '¡Cita agendada!';
      el('doneBody').textContent = (result.demo ? 'Reserva de demostración. No se creó una cita en Outlook. ' : '') +
        `${service.name}, ${T.longDate(selected.key)} de ${T.toLabel(selected.start)} a ` +
        `${T.toLabel(selected.end)}. Te esperamos, ${name.split(' ')[0]}.`;
      main.hidden = true;
      doneView.hidden = false;
      window.scrollTo(0, 0);

    } catch (err) {
      btn.disabled = false;
      btn.textContent = '¡Agendar cita!';
      fail(msg, err.message || 'No pudimos confirmar la cita. Reintenta con los mismos datos.');
      if (err.code === 'SLOT_TAKEN') {
        selected = null;
        confirm.innerHTML = '<p class="msg msg--error" role="alert">Ese horario ya no está disponible. Selecciona otro en la agenda actualizada.</p>';
        await start(true);
      }
    } finally {
      booking = false;
      el('chipService').disabled = false;
      strip.querySelectorAll('.slot').forEach(b => b.disabled = false);
    }
  }

  function fail(box, text, focusId) {
    box.replaceChildren();
    const message = document.createElement('div');
    message.className = 'msg msg--error'; message.textContent = text; box.appendChild(message);
    if (focusId) el(focusId).focus();
  }
})();
