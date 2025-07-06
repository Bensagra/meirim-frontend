// script.js

const BASE_URL       = 'https://meirim-backend.vercel.app';
const ACTIVITIES_API = `${BASE_URL}/actividades`;
const PROPOSALS_API  = `${BASE_URL}/propuestas`;

const calendarEl    = document.getElementById('calendar');
const monthYearEl   = document.getElementById('monthYear');
const formContainer = document.getElementById('ideaFormContainer');
const cancelBtn     = document.getElementById('cancelForm');

let activitiesMap   = {};
let currentActivity = null;
let userDni         = '';   // guardamos el DNI validado

const today        = new Date();
let   currentMonth = today.getMonth();
let   currentYear  = today.getFullYear();

const statusClasses = {
  NO_HAY_NADIE:                      'state-no-hay-nadie',
  HAY_GENTE_PERO_NO_NECESARIA:       'state-hay-gente-pero-no-necesaria',
  YA_HAY_GENTE_PERO_NO_SE_PLANIFICO: 'state-ya-hay-gente-no-se-planifico',
  FUE_PLANIFICADA:                   'state-fue-planificada',
  FUE_DADA_LA_PLANIFICACION:         'state-fue-dada'
};
const noActivityClass = 'tile-no-activity';

// — INIT —
async function init() {
  await loadActivities();
  renderCalendar(currentYear, currentMonth);
}
init();

// — CARGA ACTIVIDADES —
async function loadActivities() {
  try {
    const res  = await fetch(ACTIVITIES_API);
    const data = await res.json();
    activitiesMap = {};
    data.forEach(act => {
      const d   = new Date(act.fecha);
      const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      activitiesMap[iso] = act;
    });
  } catch {
    activitiesMap = {};
  }
}

// — RENDER CALENDARIO —
function renderCalendar(year, month) {
  const days        = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  let html = '<thead><tr>' + days.map(d=>`<th>${d}</th>`).join('') + '</tr></thead><tbody>';
  let dateNum = 1;

  for (let w=0; w<6; w++) {
    html += '<tr>';
    for (let dow=0; dow<7; dow++) {
      if ((w===0 && dow<firstDow) || dateNum>daysInMonth) {
        html += '<td></td>';
      } else {
        const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(dateNum).padStart(2,'0')}`;
        const act = activitiesMap[iso];
        const cls = act ? (statusClasses[act.estado] || noActivityClass) : noActivityClass;
        html += `<td data-date="${iso}" class="${cls}">${dateNum}</td>`;
        dateNum++;
      }
    }
    html += '</tr>';
    if (dateNum>daysInMonth) break;
  }
  html += '</tbody>';

  calendarEl.innerHTML = html;
  monthYearEl.textContent =
    `${['Enero','Febrero','Marzo','Abril','Mayo','Junio',
       'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][month]} ${year}`;

  calendarEl.querySelectorAll('td[data-date]').forEach(td => {
    const d = td.dataset.date;
    if (activitiesMap[d]) td.onclick = () => openDniForm(d);
  });
}

// — NAVEGACIÓN MESES —
document.getElementById('prevMonth').addEventListener('click', () => {
  if (currentMonth === 0) { currentMonth = 11; currentYear--; }
  else currentMonth--;
  renderCalendar(currentYear, currentMonth);
});
document.getElementById('nextMonth').addEventListener('click', () => {
  if (currentMonth === 11) { currentMonth = 0; currentYear++; }
  else currentMonth++;
  renderCalendar(currentYear, currentMonth);
});

// — CERRAR FORM —
cancelBtn.addEventListener('click', closeForm);

// — PASO 1: DNI / Registro —
function openDniForm(date) {
  currentActivity = activitiesMap[date];
  userDni = '';  
  formContainer.innerHTML = `
    <div id="step1">
      <h3>Actividad ${date}</h3>
      <p>Ingresa tu DNI para inscribirte</p>
      <label>DNI: <input id="dniInput" /></label>
      <div class="buttons">
        <button id="verifyBtn">Verificar</button>
        <button id="noRegBtn">Registrar</button>
      </div>
    </div>`;
  formContainer.style.display = 'flex';
  cancelBtn.style.display    = 'block';

  document.getElementById('verifyBtn').addEventListener('click', () => verifyDni(date));
  document.getElementById('noRegBtn').addEventListener('click', () => showRegisterForm(date));
}

async function verifyDni(date) {
  const dni = document.getElementById('dniInput').value.trim();
  if (!dni) return alert('Ingresa tu DNI.');

  try {
    const res = await fetch(`${BASE_URL}/user/${dni}`);
    if (res.ok) {
      userDni = dni;
      openTopicsForm();
    } else if (res.status === 404) {
      alert('DNI no encontrado, regístrate primero.');
      showRegisterForm(date);
    } else {
      throw new Error();
    }
  } catch {
    alert('Error al verificar. Intenta de nuevo.');
  }
}

function showRegisterForm(date) {
  formContainer.innerHTML = `
    <div id="step1-reg">
      <h3>Registro de Usuario</h3>
      <label>Nombre: <input id="regName" /></label>
      <label>Apellido: <input id="regSurname" /></label>
      <label>Email: <input id="regMail" type="email"/></label>
      <label>DNI: <input id="regDni" /></label>
      <div class="buttons">
        <button id="regSubmitBtn">Registrar</button>
        <button id="regCancelBtn">Cancelar</button>
      </div>
    </div>`;
  document.getElementById('regCancelBtn').addEventListener('click', () => openDniForm(currentActivity.fecha.substr(0,10)));
  document.getElementById('regSubmitBtn').addEventListener('click', () => registerUser());
}

async function registerUser() {
  const name    = document.getElementById('regName').value.trim();
  const surname = document.getElementById('regSurname').value.trim();
  const mail    = document.getElementById('regMail').value.trim();
  const dni     = document.getElementById('regDni').value.trim();
  if (!name||!surname||!mail||!dni) return alert('Completa todos los campos.');

  try {
    const res = await fetch(`${BASE_URL}/user`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ name, surname, email:mail, dni })
    });
    if (!res.ok) throw new Error();
    alert('Registrado con éxito.');
    userDni = dni;
    openTopicsForm();
  } catch {
    alert('Error al registrar. Intenta de nuevo.');
  }
}

// — PASO 2: Temáticas y envío —
async function openTopicsForm() {
  formContainer.innerHTML = `
    <div id="step2">
      <h3>Selecciona Temáticas</h3>
      <div id="propsList">Cargando…</div>
      <div class="buttons">
        <button id="submitBtn">Enviar</button>
      </div>
    </div>`;
  // cargar opciones
  let html = '';
  try {
    const res   = await fetch(PROPOSALS_API);
    const props = await res.json();
    props.forEach(p => {
      html += `<label><input type="checkbox" name="prop" value="${p.tematica}"> ${p.tematica}</label><br/>`;
    });
  } catch { html = '<p>Error al cargar.</p>'; }
  html += `
    <label><input type="checkbox" id="otherChk"> Otro…</label>
    <div id="otherDiv" style="display:none">
      <input id="otherInput" placeholder="Nueva temática" />
    </div>`;
  document.getElementById('propsList').innerHTML = html;
  document.getElementById('otherChk').addEventListener('change', e => {
    document.getElementById('otherDiv').style.display = e.target.checked ? 'block' : 'none';
  });
  document.getElementById('submitBtn').addEventListener('click', submitActivityUpdate);
}

async function submitActivityUpdate() {
  const sel = Array.from(document.querySelectorAll('input[name="prop"]:checked'))
    .map(cb => cb.value);
  if (document.getElementById('otherChk').checked) {
    const o = document.getElementById('otherInput').value.trim();
    if (o) sel.push(o);
  }
  if (sel.length === 0) return alert('Selecciona al menos una temática.');

  const body = {
    participants: [ userDni ],
    topics: sel
  };

  try {
    const res = await fetch(`${ACTIVITIES_API}/${currentActivity.id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error();
    alert('¡Inscripción guardada!');
    closeForm();
    await init();
  } catch {
    alert('Error al guardar inscripción.');
  }
}

// — Cerrar form —
function closeForm() {
  formContainer.style.display = 'none';
  cancelBtn.style.display     = 'none';
  formContainer.innerHTML     = '';
}