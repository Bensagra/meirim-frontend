(function () {
  // ====== NAV (mobile) ======
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  // ====== CAROUSEL ======
  let current = 0;
  const carousel = document.getElementById('carousel');
  const slidesTrack = carousel?.querySelector('.slides');
  const slides = Array.from(carousel?.querySelectorAll('.slide') || []);
  const dots = Array.from(carousel?.querySelectorAll('.dot') || []);
  const prevBtn = carousel?.querySelector('.carousel-btn.prev');
  const nextBtn = carousel?.querySelector('.carousel-btn.next');
  const total = slides.length;

  function updateUI() {
    if (slidesTrack) slidesTrack.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => {
      const selected = i === current;
      d.classList.toggle('active', selected);
      d.setAttribute('aria-selected', String(selected));
    });
  }
  function goTo(index) { current = (index + total) % total; updateUI(); }
  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  dots.forEach((d) => d.addEventListener('click', (e) => {
    const idx = Number((e.currentTarget).getAttribute('data-index')) || 0;
    goTo(idx);
    restartAutoplay();
  }));
  nextBtn?.addEventListener('click', () => { next(); restartAutoplay(); });
  prevBtn?.addEventListener('click', () => { prev(); restartAutoplay(); });

  let interval = null;
  function startAutoplay() { stopAutoplay(); interval = setInterval(next, 4000); }
  function stopAutoplay() { if (interval) { clearInterval(interval); interval = null; } }
  function restartAutoplay() { stopAutoplay(); startAutoplay(); }
  carousel?.addEventListener('mouseenter', stopAutoplay);
  carousel?.addEventListener('mouseleave', startAutoplay);

  updateUI();
  startAutoplay();

  // ====== PENPALS COUNTDOWN (fecha fija si está seteada) ======
  function initPenpalsCountdown(){
    const sec = document.getElementById('penpals');
    if (!sec) return;
    const targetISO = sec.dataset.targetDate; // ej: 2025-09-09T18:20:00-03:00
    if (!targetISO) return;
    const dd = sec.querySelector('.dd');
    const hh = sec.querySelector('.hh');
    const mm = sec.querySelector('.mm');
    const ss = sec.querySelector('.ss');
    const target = new Date(targetISO);

    function tick(){
      const now = new Date();
      if (now >= target) {
        dd && (dd.textContent = '00');
        hh && (hh.textContent = '00');
        mm && (mm.textContent = '00');
        ss && (ss.textContent = '00');
        return;
      }
      const diff = target - now;
      const d = Math.floor(diff / 864e5);
      const h = Math.floor((diff % 864e5)/36e5);
      const m = Math.floor((diff % 36e5)/6e4);
      const s = Math.floor((diff % 6e4)/1e3);
      dd && (dd.textContent = String(d).padStart(2,'0'));
      hh && (hh.textContent = String(h).padStart(2,'0'));
      mm && (mm.textContent = String(m).padStart(2,'0'));
      ss && (ss.textContent = String(s).padStart(2,'0'));
    }
    tick();
    setInterval(tick, 1000);
  }
  initPenpalsCountdown();

  // ====== API helpers ======
  const API = {
    async post(url, data) {
      const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    async get(url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
  };

  // ====== PLANIFICAR (crear actividad) ======
  const formActividad = document.getElementById('form-actividad');
  if (formActividad) {
    formActividad.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fecha = document.getElementById('fecha').value;
      const estado = document.getElementById('estado').value;
      const participantesRaw = document.getElementById('participantes').value.trim();
      const tematicasRaw = document.getElementById('tematicas').value.trim();
      const notas = document.getElementById('notas').value.trim();

      // aceptar IDs separados por coma; si son nombres, resolverá el backend (opcional)
      const participants = participantesRaw ? participantesRaw.split(',').map(s=>s.trim()).filter(Boolean) : [];
      const tematicas = tematicasRaw ? tematicasRaw.split(',').map(s=>s.trim()).filter(Boolean) : [];

      try {
        await API.post('https://meirim-backend.vercel.app/api/activities', { fecha, estado, participants, tematicas, notas });
        alert('Actividad guardada ✅');
        formActividad.reset();
        // refrescar próximas
        loadProximas();
      } catch (err) {
        alert('Error al guardar actividad: ' + err.message);
      }
    });
  }

  // cargar próximas actividades
  async function loadProximas(){
    const ul = document.getElementById('proximas-list');
    if (!ul) return;
    try {
      const data = await API.get('https://meirim-backend.vercel.app/api/activities/upcoming');
      ul.innerHTML = '';
      data.forEach(item=>{
        const li = document.createElement('li');
        li.className = 'list-item';
        const fecha = new Date(item.fecha);
        const fechaTxt = fecha.toLocaleString('es-AR', { dateStyle:'short', timeStyle:'short' });
        const participantes = item.participants?.map(p=>p.user?.name ?? p.userId).join(', ') || '—';
        const temas = item.tematicas?.map(t=>t.tematica?.tematica ?? t.tematicaId).join(', ') || '—';
        li.innerHTML = `
          <div>
            <strong>${fechaTxt}</strong>
            <div class="muted">Participantes: ${participantes} • Temas: ${temas}</div>
          </div>
          <span class="pill" data-state="${item.estado}">...</span>
        `;
        ul.appendChild(li);
      });
      paintPills();
    } catch (e) {
      console.error(e);
    }
  }
  loadProximas();

  // ====== BANCO (crear temática) ======
  const formTematica = document.getElementById('form-tematica');
  if (formTematica) {
    formTematica.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tematica = document.getElementById('tematica').value.trim();
      if (!tematica) return;
      try {
        await API.post('https://meirim-backend.vercel.app/api/tematicas', { tematica });
        alert('Temática propuesta ✅');
        formTematica.reset();
        loadTematicas();
      } catch (err) {
        alert('Error al proponer temática: ' + err.message);
      }
    });
  }

  async function loadTematicas(){
    const ul = document.getElementById('tematicas-list');
    if (!ul) return;
    try {
      const data = await API.get('https://meirim-backend.vercel.app/api/tematicas');
      ul.innerHTML = '';
      data.forEach(t=>{
        const li = document.createElement('li');
        li.className = 'list-item';
        li.innerHTML = `
          <div><strong>${t.tematica}</strong>
            <div class="muted">Propuesto por: Anónimo</div>
          </div>
          <span class="pill ${t.usada ? '' : 'pill-success'}">${t.usada ? 'Usada' : 'Disponible'}</span>
        `;
        ul.appendChild(li);
      });
    } catch (e) {
      console.error(e);
    }
  }
  loadTematicas();

  // ====== PENPALS (lead) ======
  const formPenpals = document.getElementById('form-penpals');
  if (formPenpals) {
    formPenpals.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('nombre').value.trim();
      const email = document.getElementById('email').value.trim();
      const idioma = document.getElementById('idioma').value;
      try {
        await API.post('https://meirim-backend.vercel.app/api/penpals', { nombre, email, idioma });
        alert('¡Gracias! Te vamos a contactar 💌');
        formPenpals.reset();
      } catch (err) {
        alert('Error al enviar: ' + err.message);
      }
    });
  }

  // ====== TIENDA (notify) ======
  const formNotify = document.getElementById('form-notify');
  if (formNotify) {
    formNotify.addEventListener('submit', async (e) => {
      e.preventDefault();
      const mail = document.getElementById('mail').value.trim();
      const preferencia = document.getElementById('preferencia').value;
      try {
        await API.post('https://meirim-backend.vercel.app/api/notify', { email: mail, preferencia });
        alert('¡Listo! Te avisamos apenas abra la tienda 🛍️');
        formNotify.reset();
      } catch (err) {
        alert('Error al suscribirte: ' + err.message);
      }
    });
  }

  // ====== ESTADOS -> PILLS ======
  const STATE_MAP = {
    'NO_HAY_NADIE': { text: 'No hay nadie', cls: 'pill-danger' },
    'HAY_GENTE_PERO_NO_NECESARIA': { text: 'Hay gente, no la necesaria', cls: 'pill-warn' },
    'YA_HAY_GENTE_PERO_NO_SE_PLANIFICO': { text: 'Hay gente, falta planificar', cls: 'pill-info' },
    'FUE_PLANIFICADA': { text: 'Planificada', cls: 'pill-primary' },
    'FUE_DADA_LA_PLANIFICACION': { text: 'Planificación dada', cls: 'pill-success' },
  };
  function paintPills(){
    document.querySelectorAll('[data-state]').forEach(el=>{
      const key = el.getAttribute('data-state');
      const meta = STATE_MAP[key] || { text: key, cls: '' };
      el.classList.add('pill');
      meta.cls && el.classList.add(meta.cls);
      el.textContent = meta.text;
    });
  }
  paintPills();
})();

(() => {
  // 14 de octubre (hora local). Cambiá el año si necesitás.
  const target = new Date('2025-10-14T00:00:00');

  const $dd = document.getElementById('dd');
  const $hh = document.getElementById('hh');
  const $mm = document.getElementById('mm');
  const $ss = document.getElementById('ss');
  const $sr = document.getElementById('sr-announce');
  const $count = document.getElementById('countdown');

  if (!$count) return;

  const pad = (n, len = 2) => String(n).padStart(len, '0');

  function tick(){
    const now = new Date();
    let diff = target - now;

    if (diff <= 0){
      $count.innerHTML = '<span class="num">YA&nbsp;ABRIMOS</span>';
      if ($sr) $sr.textContent = 'La tienda ya está abierta';
      clearInterval(timer);
      return;
    }

    const sec = Math.floor(diff/1000);
    const d = Math.floor(sec/86400);
    const h = Math.floor((sec%86400)/3600);
    const m = Math.floor((sec%3600)/60);
    const s = sec%60;

    $dd.textContent = pad(d);
    $hh.textContent = pad(h);
    $mm.textContent = pad(m);
    $ss.textContent = pad(s);

    if ($sr) $sr.textContent = `Faltan ${d} días, ${h} horas, ${m} minutos y ${s} segundos para la apertura.`;
  }

  tick();
  const timer = setInterval(tick, 500);
})();