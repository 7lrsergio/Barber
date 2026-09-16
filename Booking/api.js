/* Connector boundary. No credentials belong in this public browser file. */
const API = (() => {
  const STORE = { service: 'barberia.service', availability: 'barberia.availability', bookings: 'barberia.demoBookings', pending: 'barberia.pending' };
  const memory = {};
  const save = (k,v) => { memory[k]=v; try { sessionStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const load = k => { try { return JSON.parse(sessionStorage.getItem(k)) ?? memory[k] ?? null; } catch { return memory[k] ?? null; } };
  const drop = k => { delete memory[k]; try { sessionStorage.removeItem(k); } catch {} };
  const setService = s => save(STORE.service, s.id);
  const getService = () => CONFIG.serviceById(load(STORE.service)?.id || load(STORE.service));
  const error = (message,code) => Object.assign(new Error(message), { code });
  async function post(url, body) {
    if (!url || !/^https?:\/\//.test(url)) throw error('Falta configurar el conector de reservas.', 'CONFIG');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CONFIG.requestTimeoutMs);
    try {
      const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal:ctrl.signal });
      let data;
      try { data = await res.json(); } catch { throw error('El conector devolvió una respuesta inválida.', 'RESPONSE'); }
      if (!res.ok || data?.ok === false) throw error(data?.message || 'No se pudo completar la solicitud.', res.status === 409 ? 'SLOT_TAKEN' : data?.code || 'HTTP');
      return data;
    } catch (e) {
      if (e.name === 'AbortError') throw error('La consulta tardó demasiado. Vuelve a intentarlo.', 'TIMEOUT');
      throw e;
    } finally { clearTimeout(timer); }
  }
  function windowRange() {
    const startDate = T.shiftKey(T.dateKey(new Date()), CONFIG.booking.startOffsetDays ?? 0);
    return { startDate, endDate:T.shiftKey(startDate, CONFIG.booking.daysAhead-1), days:CONFIG.booking.daysAhead };
  }
  // Fail closed: a missing date or invalid event must never become a free day.
  function normalize(raw, range) {
    const list = raw?.days;
    if (!Array.isArray(list)) throw error('La agenda recibida está incompleta.', 'RESPONSE');
    const out = {};
    for(let i=0; i<range.days; i++) {
      const key = T.shiftKey(range.startDate,i);
      const matches = list.filter(d => d?.date === key);
      if(matches.length !== 1 || !Array.isArray(matches[0].busy)) throw error('Faltan días en la agenda recibida.', 'RESPONSE');
      out[key] = matches[0].busy.map(b => {
        const minute = value => {
          if(typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(value)) throw error('Horario inválido en la agenda.', 'RESPONSE');
          return T.toMin(value);
        };
        const start = minute(b.start), end = minute(b.end);
        if(end <= start) throw error('Evento inválido en la agenda.', 'RESPONSE');
        return {start, end, label:'Ocupado'};
      });
    }
    return out;
  }
  let inFlight = null;
  async function getAvailableTimes({force=false}={}) {
    if(inFlight) return inFlight;
    const range = windowRange();
    const signature = JSON.stringify([range,CONFIG.business.timezone,CONFIG.hours,CONFIG.useMockData,CONFIG.webhooks.getAvailability]);
    const cached = load(STORE.availability);
    if(!force && cached?.signature === signature && Date.now()-cached.fetchedAt < CONFIG.booking.cacheTtlSeconds*1000) return cached.payload;
    inFlight = (async () => {
      const payload = CONFIG.useMockData ? await mockAvailability(range) : normalize(await post(CONFIG.webhooks.getAvailability, {
        action:'get_availability', ...range, timezone:CONFIG.business.timezone,
        openTime:CONFIG.hours.open, closeTime:CONFIG.hours.close,
        serviceId:getService()?.id, durationMinutes:getService()?.minutes
      }),range);
      save(STORE.availability,{signature,fetchedAt:Date.now(),payload});
      return payload;
    })();
    try { return await inFlight; } finally { inFlight=null; }
  }
  async function mockAvailability(range) {
    await new Promise(r=>setTimeout(r,1000));
    const out={};
    for(let i=0;i<range.days;i++) {
      const key=T.shiftKey(range.startDate,i);
      const seed=Number(key.replaceAll('-',''));
      out[key]=[{start:720+(seed%4)*15,end:765+(seed%4)*15},{start:900+(seed%3)*30,end:950+(seed%3)*30}];
      out[key].push(...(load(STORE.bookings)||[]).filter(b=>b.date===key).map(b=>({start:b.start,end:b.end})));
    }
    return out;
  }
  async function bookAppointment({service,dateKey,startMin,endMin,customer}) {
    if(!CONFIG.serviceById(service.id) || endMin-startMin !== service.minutes) throw error('Servicio inválido.', 'BAD_SERVICE');
    if(new Date(T.toISO(dateKey,startMin)) <= new Date()) throw error('Ese horario ya pasó. Elige otro.', 'SLOT_TAKEN');
    const body={action:'book_appointment',service:{id:service.id,name:service.name,price:service.price,durationMinutes:service.minutes},appointment:{date:dateKey,startTime:T.to24(startMin),endTime:T.to24(endMin),startISO:T.toISO(dateKey,startMin),endISO:T.toISO(dateKey,endMin),timezone:CONFIG.business.timezone,bufferMinutes:CONFIG.booking.bufferMinutes},customer:{name:customer.name.trim(),phone:customer.phone.trim()},source:'web'};
    const fingerprint=JSON.stringify(body);
    const previous=load(STORE.pending);
    const requestId=previous?.fingerprint===fingerprint ? previous.requestId : (globalThis.crypto?.randomUUID?.() || `bk_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    save(STORE.pending,{fingerprint,requestId});
    body.requestId=requestId;
    let result;
    if(CONFIG.useMockData) {
      const availability=await getAvailableTimes({force:true});
      const day=T.buildDay({key:dateKey,busy:availability[dateKey]||[],durationMin:service.minutes,cfg:CONFIG});
      if(!day.slots.some(s=>s.start===startMin && s.end===endMin)) throw error('Ese horario ya se ocupó. Elige otro.', 'SLOT_TAKEN');
      const bookings=load(STORE.bookings)||[];
      bookings.push({date:dateKey,start:startMin,end:endMin});
      save(STORE.bookings,bookings);
      result={ok:true,eventId:`demo-${requestId}`,demo:true};
    } else {
      result=await post(CONFIG.webhooks.bookAppointment,body);
      if(result?.ok !== true || typeof result.eventId !== 'string' || !result.eventId) throw error('No recibimos confirmación. Reintenta con los mismos datos para comprobar tu reserva.', 'RESPONSE');
    }
    drop(STORE.availability);drop(STORE.pending);
    return result;
  }
  return {STORE,getService,setService,getAvailableTimes,bookAppointment,drop,load};
})();
window.API=API;
