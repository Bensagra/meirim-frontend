// ===== NAV (mobile) =====
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');
if (navToggle) {
  navToggle.addEventListener('click', () => {
    const open = nav.style.display === 'flex';
    nav.style.display = open ? 'none' : 'flex';
    navToggle.setAttribute('aria-expanded', (!open).toString());
  });
}

// ===== CAROUSEL =====
let current = 0;
const slides = document.querySelector('.slides');
const imgs = slides ? Array.from(slides.children) : [];
const total = imgs.length;
const dotsEl = document.querySelector('.dots');

function renderDots() {
  if (!dotsEl) return;
  dotsEl.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const b = document.createElement('button');
    if (i === current) b.classList.add('active');
    b.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(b);
  }
}

function goTo(idx) {
  current = (idx + total) % total;
  slides.style.transform = `translateX(-${current * 100}%)`;
  renderDots();
}
function showNext() { goTo(current + 1); }
function showPrev() { goTo(current - 1); }

let interval = null;
function play() { interval = setInterval(showNext, 4500); }
function pause() { clearInterval(interval); }

const carousel = document.getElementById('carousel');
if (carousel) {
  renderDots();
  play();

  carousel.addEventListener('mouseenter', pause);
  carousel.addEventListener('mouseleave', play);
  carousel.querySelector('.next').addEventListener('click', showNext);
  carousel.querySelector('.prev').addEventListener('click', showPrev);
  carousel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') showNext();
    if (e.key === 'ArrowLeft') showPrev();
  });
}

// ===== PRÓXIMAS ACTIVIDADES (desde tu API) =====
// Ajustá BASE_URL según tu backend
const BASE_URL = '/api';

async function fetchActivities(chapterSlug) {
  const url = new URL(`${BASE_URL}/activities`, window.location.origin);
  if (chapterSlug) url.searchParams.set('chapterSlug', chapterSlug);
  // Podés agregar from/to si querés
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Error cargando actividades');
  return res.json();
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { weekday: 'short', year:'numeric', month:'short', day:'numeric' });
}

function renderActivities(data) {
  const grid = document.getElementById('activitiesGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const items = data.items || data; // soporta {items:[]} o []
  if (!Array.isArray(items) || items.length === 0) {
    grid.innerHTML = `<p class="meta">No hay actividades programadas todavía.</p>`;
    return;
  }

  items.slice(0, 8).forEach(act => {
    const participants = (act.participants || []).map(p => p.user?.name).filter(Boolean);
    const tematicas = (act.tematicas || []).map(t => t.tematica?.tematica).filter(Boolean);
    const el = document.createElement('article');
    el.className = 'card';
    el.innerHTML = `
      <div class="date">${fmtDate(act.fecha)}</div>
      <div class="meta">${participants.length} participantes</div>
      ${tematicas.length ? `<div class="meta">Temáticas: ${tematicas.join(', ')}</div>` : ''}
      ${act.notas ? `<div class="meta">Notas: ${act.notas}</div>` : ''}
      <a class="link" href="./planificar.html?id=${act.id}">Ver detalle</a>
    `;
    grid.appendChild(el);
  });
}

async function initActivities() {
  const select = document.getElementById('chapterSelect');
  if (!select) return;

  async function load() {
    try {
      const chapterSlug = select.value;
      const data = await fetchActivities(chapterSlug);
      renderActivities(data);
    } catch (e) {
      console.error(e);
      const grid = document.getElementById('activitiesGrid');
      if (grid) grid.innerHTML = `<p class="meta">No se pudieron cargar las actividades.</p>`;
    }
  }

  select.addEventListener('change', load);
  load();
}
initActivities();
