/* ============================================================
   CONFIG — this is the only file you normally need to edit.
   Everything the business owner changes lives here.
   ============================================================ */

const CONFIG = {

  /* ---- Negocio ---- */
  business: {
    name: 'Barbería',
    tagline: 'Citas en línea',
    timezone: 'America/Chicago',
    locale: 'es-MX',
    phone: ''            // optional, shown in the footer if filled
  },

  /* ---- Horario de atención (24h) ----
     Change these two values and the whole calendar re-draws. */
  hours: {
    open:  '11:00',
    close: '19:00'
  },

  /* Days the shop is closed. 0 = domingo ... 6 = sábado */
  closedWeekdays: [],

  /* ---- Reglas de agenda ---- */
  booking: {
    bufferMinutes: 5,      // descanso obligatorio entre citas
    snapMinutes: 5,        // slot start times round up to this
    startOffsetDays: 1,    // Start tomorrow, in the shop timezone. Set 0 to include today.
    daysAhead: 7,          // <-- 7 per the sketch. Set to 14 to go back to two weeks.
    minLeadMinutes: 0,    // optional advance notice; past times are always excluded
    cacheTtlSeconds: 90    // how long page-1's prefetch stays fresh
  },

  /* ---- Servicios ----
     id        -> sent to n8n / stored in the DB later
     minutes   -> drives slot length on page 2
     calendarUrl -> your old Google booking link, kept as a fallback only */
  services: [
    {
      id: 'corte-standard',
      name: 'Corte Standard',
      price: 120,
      minutes: 30,
      description: 'Corte clásico con diseño y línea de ceja.',
      calendarUrl: 'https://calendar.app.google/fTQqCzfcYn881GmbA'
    },
    {
      id: 'corte-ceja',
      name: 'Corte + Ceja',
      price: 150,
      minutes: 35,
      description: 'Corte clásico con diseño y línea de ceja.',
      calendarUrl: 'https://calendar.app.google/3nHy5SiSrBmjEnew8'
    },
    {
      id: 'corte-barba',
      name: 'Corte + Barba',
      price: 180,
      minutes: 45,
      description: 'Corte completo con perfilado de barba.',
      calendarUrl: 'https://calendar.app.google/vCBXJ4HiXrfVuyZr5'
    },
    {
      id: 'corte-completo',
      name: 'Corte Completo',
      price: 200,
      minutes: 50,
      description: 'Corte, barba y ceja para un look total.',
      calendarUrl: ''
    }
  ],

  /* ---- Conectores (n8n) ----
     Paste your two n8n Production Webhook URLs here.
     Leave useMockData: true until both are live — the site
     runs fully on fake data so you can demo it today. */
     webhooks: {
      getAvailability:
        'https://slopez11.app.n8n.cloud/webhook/barberia/availability',
    
      bookAppointment:
        'https://slopez11.app.n8n.cloud/webhook/barberia/book'
    },
    
    useMockData: false,
  requestTimeoutMs: 12000,

  /* ---- Apariencia del calendario ---- */
  ui: {
    pixelsPerMinute: 1.6   // column height = (close - open) * this
  }
};

/* Derived once, read everywhere. */
CONFIG.serviceById = id => CONFIG.services.find(s => s.id === id) || null;

window.CONFIG = CONFIG;
