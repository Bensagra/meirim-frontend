// planificar.js
const BASE_URL       = 'https://meirim-backend.vercel.app';
const ACTIVITIES_API = `${BASE_URL}/actividades`;
const PROPOSALS_API  = `${BASE_URL}/propuestas`;
const USER_API       = `${BASE_URL}/user`;

const listEl        = document.getElementById('proximas-list');
const modalEl       = document.getElementById('plan-modal');
const modalWhenEl   = document.getElementById('plan-modal-when');

const formEl        = document.getElementById('plan-form');
const dniEl         = document.getElementById('dni');
const topicSelEl    = document.getElementById('topic');
const topicOtherCk  = document.getElementById('topic-other');
const topicTextEl   = document.getElementById('topic-text');
const closeBtn      = document.getElementById('plan-close');
const cancelBtn     = document.getElementById('plan-cancel');

const regFormEl     = document.getElementById('register-form');
const regNameEl     = document.getElementById('regName');
const regSurnameEl  = document.getElementById('regSurname');
const regMailEl     = document.getElementById('regMail');
const regDniEl      = document.getElementById('regDni');
const regCancelBtn  = document.getElementById('reg-cancel');

const statusPillMap = {
  NO_HAY_NADIE:                      'pill-danger',
  HAY_GENTE_PERO_NO_NECESARIA:       'pill-warn',
  YA_HAY_GENTE_PERO_NO_SE_PLANIFICO: 'pill-info',
  FUE_PLANIFICADA:                   'pill-primary',
  FUE_DADA_LA_PLANIFICACION:         'pill-success'
};

let upcoming = [];
let proposals = [];
let currentActivity = null;

// Init
init().catch(console.error);

async function init(){
  [upcoming, proposals] = await Promise.all([fetchUpcomingActivities(), fetchProposals()]);
  renderUpcoming(upcoming);
  wireModal();
}

async function fetchUpcomingActivities(){
  try {
    const res = await fetch(ACTIVITIES_API);
    const data = await res.json();

    const now = new Date();
    const items = (data || [])
      .map(normalizeActivity)
      .filter(a => a.fecha && a.fecha >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      .sort((a,b) => a.fecha - b.fecha)
      .slice(0, 12);

    return items;
  } catch (e){
    console.error('Error fetch activities', e);
    return [];
  }
}

function normalizeActivity(a){
  // fuerza 18:20 y normaliza arrays a lo que consume el front
  const fecha = fixTime1820(a?.fecha);

  // participants viene como ActivityUser[] con include { user: true }
  // lo reducimos a un array de objetos Usuario [{name,surname,dni,...}]
  const participants = Array.isArray(a?.participants)
    ? a.participants.map(p => p?.user).filter(Boolean)
    : [];

  // tematicas viene como ActivityTematica[] con include { tematica: true }
  // lo reducimos a un array de strings con el nombre de la temática
  const topics = Array.isArray(a?.tematicas)
    ? a.tematicas
        .map(t => (t?.tematica && (t.tematica.tematica || t.tematica.name || t.tematica.titulo || t.tematica.title)) || t?.tematica)
        .filter(Boolean)
    : (Array.isArray(a?.topics) ? a.topics : []);

  return {
    ...a,
    fecha,
    participants,
    topics,
    estado: a?.estado || 'NO_HAY_NADIE'
  };
}

async function fetchProposals(){
  try{
    const res = await fetch(PROPOSALS_API);
    const data = await res.json();
    return (data || []).map(p => p.tematica || p).filter(Boolean);
  }catch(e){
    console.error('Error fetch proposals', e);
    return [];
  }
}

function renderUpcoming(items){
  if (!items.length){
    listEl.innerHTML = `<li class="list-item">No hay próximas actividades cargadas.</li>`;
    return;
  }
  listEl.innerHTML = items.map(act => {
    const when = formatDateTime(act.fecha); // ya tiene 18:20 fijado
    const pillClass = statusPillMap[act.estado] || 'pill-info';

    const displayNames = (act.participants || []).map(u => {
      if (u && typeof u === 'object') {
        const full = [u.name, u.surname].filter(Boolean).join(' ').trim();
        return full || u.dni || '[usuario]';
      }
      return String(u);
    });

    const names = displayNames.slice(0,3).join(', ');
    const extra = displayNames.length > 3 ? ` +${displayNames.length-3}` : '';
    const planners = displayNames.length ? `${names}${extra}` : '—';

    return `
      <li class="activity-item">
        <div class="activity-info">
          <div class="activity-when">${when}</div>
          <div class="activity-meta">
            <span class="pill ${pillClass}">${labelEstado(act.estado)}</span>
            <span class="activity-planners"><strong>Planifican:</strong> ${escapeHtml(planners)}</span>
          </div>
        </div>
        <div class="activity-actions">
          <button class="btn btn-green" data-plan="${act.id}">Planificar acá</button>
        </div>
      </li>
    `;
  }).join('');

  listEl.querySelectorAll('button[data-plan]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-plan');
      const act = upcoming.find(a => String(a.id) === String(id));
      if (act) openModal(act);
    });
  });
}

function openModal(activity){
  currentActivity = activity;
  modalWhenEl.textContent = formatDateTime(activity.fecha); // muestra 18:20 fijo

  // tópicos no usados
  const used = new Set((activity.topics || []).map(t => String(t).toLowerCase()));
  const options = proposals.filter(t => !used.has(String(t).toLowerCase()));
  topicSelEl.innerHTML = options.length
    ? options.map(t => `<option value="${escapeAttr(t)}">${escapeHtml(t)}</option>`).join('')
    : `<option value="" disabled selected>No hay tópicos libres — usá “propio”.</option>`;

  topicOtherCk.checked = false;
  topicTextEl.style.display = 'none';
  topicTextEl.value = '';
  dniEl.value = '';

  // Mostrar paso A, ocultar registro
  formEl.style.display = 'grid';
  regFormEl.style.display = 'none';

  modalEl.setAttribute('aria-hidden', 'false');
  modalEl.classList.add('open');
  dniEl.focus();
}

function wireModal(){
  topicOtherCk.addEventListener('change', () => {
    const show = topicOtherCk.checked;
    topicTextEl.style.display = show ? 'block' : 'none';
    if (show) topicTextEl.focus();
  });

  document.querySelectorAll('[data-close], #plan-close, #plan-cancel').forEach(el => {
    el.addEventListener('click', closeModal);
  });
  regCancelBtn.addEventListener('click', () => {
    // volver al paso A
    regFormEl.style.display = 'none';
    formEl.style.display = 'grid';
    dniEl.focus();
  });

  formEl.addEventListener('submit', onSubmitPlan);
  regFormEl.addEventListener('submit', onSubmitRegister);
}

function closeModal(){
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.classList.remove('open');
  currentActivity = null;
}

async function onSubmitPlan(e){
  e.preventDefault();
  if (!currentActivity) return;

  const dni = dniEl.value.trim();
  if (!dni) return alert('Ingresá tu DNI');

  // verificar usuario
  const exists = await userExists(dni);
  if (!exists){
    // abrir paso de registro con DNI precargado
    formEl.style.display = 'none';
    regFormEl.style.display = 'grid';
    regDniEl.value = dni;
    regNameEl.focus();
    return;
  }

  // continuar guardado
  const topic = getChosenTopic();
  if (!topic) return;

  await savePlanning(currentActivity, dni, topic);
}

async function onSubmitRegister(e){
  e.preventDefault();
  const name    = regNameEl.value.trim();
  const surname = regSurnameEl.value.trim();
  const mail    = regMailEl.value.trim();
  const dni     = regDniEl.value.trim();

  if (!name || !surname || !mail || !dni){
    return alert('Completá todos los campos.');
  }

  try{
    const res = await fetch(USER_API, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name, surname, email: mail, dni })
    });
    if (!res.ok) throw new Error('Registro falló');
    // registrado → volver a plan
    alert('Usuario creado. ¡Sigamos!');
    // tomar el tópico elegido en el paso A
    const topic = getChosenTopic();
    if (!topic) {
      // volvemos al paso A para que elija tópico
      regFormEl.style.display = 'none';
      formEl.style.display = 'grid';
      return;
    }
    await savePlanning(currentActivity, dni, topic);
  }catch(err){
    console.error(err);
    alert('No se pudo registrar. Probá de nuevo.');
  }
}

function getChosenTopic(){
  let topic = '';
  if (topicOtherCk.checked){
    topic = topicTextEl.value.trim();
    if (!topic){ alert('Escribí tu tópico propio.'); return ''; }
  } else {
    topic = topicSelEl.value;
    if (!topic){ alert('Elegí un tópico disponible o tildá “propio”.'); return ''; }
  }
  return topic;
}

async function userExists(dni){
  try{
    const res = await fetch(`${USER_API}/${encodeURIComponent(dni)}`);
    if (res.ok) return true;
    if (res.status === 404) return false;
    throw new Error('Check user failed');
  }catch(e){
    console.error(e);
    // si falla el check, por seguridad no bloqueamos: pedimos registro
    return false;
  }
}

async function savePlanning(activity, dni, topic){
  const existingDnis = (activity.participants || [])
    .map(u => (u && typeof u === 'object') ? u.dni : String(u))
    .filter(Boolean);
  const participants = uniq([...existingDnis, dni]);
  const topics       = uniq([...(activity.topics || []), topic]);
  try{
    const res = await fetch(`${ACTIVITIES_API}/${activity.id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ participants, topics })
    });
    if (!res.ok) throw new Error('PUT failed');

    alert('¡Guardado! Te sumaste como planificador/a.');
    closeModal();
    [upcoming] = await Promise.all([fetchUpcomingActivities()]);
    renderUpcoming(upcoming);
  }catch(err){
    console.error(err);
    alert('No se pudo guardar. Probá de nuevo.');
  }
}

function labelEstado(code){
  switch(code){
    case 'NO_HAY_NADIE': return 'No hay nadie para planificar';
    case 'HAY_GENTE_PERO_NO_NECESARIA': return 'Hay gente, no la suficiente';
    case 'YA_HAY_GENTE_PERO_NO_SE_PLANIFICO': return 'Ya hay suficiente gente';
    case 'FUE_PLANIFICADA': return 'Planificada';
    case 'FUE_DADA_LA_PLANIFICACION': return 'Planificación dada';
    default: return code;
  }
}

// ——— Hora fija 18:20 ———
function fixTime1820(dateLike){
  const d = new Date(dateLike);
  if (isNaN(d)) return null;
  // set horas/min atento a TZ local del navegador (Argentina -03)
  d.setHours(18, 20, 0, 0);
  return d;
}
function formatDateTime(d){
  const dt = fixTime1820(d); // asegurar
  return dt.toLocaleString('es-AR', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit'
  }).replace('.', '');
}

// utils
function uniq(arr){
  const s = new Set();
  const out = [];
  for (const v of arr) {
    const key = String(v).trim().toLowerCase();
    if (!s.has(key)) { s.add(key); out.push(v); }
  }
  return out;
}
function escapeHtml(s=''){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}
function escapeAttr(s=''){ return escapeHtml(s); }

// --- nav mobile simple ---
(function wireNav(){
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', ()=>{
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
})();