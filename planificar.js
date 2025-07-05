// script.js

const BASE_URL         = 'https://meirim-backend.vercel.app';
const ACTIVITIES_API   = `${BASE_URL}/actividades`;
const PROPOSALS_API    = `${BASE_URL}/propuestas`;

const calendarEl       = document.getElementById('calendar');
const monthYearEl      = document.getElementById('monthYear');
const formContainer    = document.getElementById('ideaFormContainer');
const cancelBtn        = document.getElementById('cancelForm');

let activitiesMap      = {};   // { '2025-07-10': { id, fecha, estado, participants: [...] } }
let currentActivity    = null;
let addedDnis          = [];   // PARA GUARDAR LOS DNIs NUEVOS ENTRE PASOS

const today            = new Date();
let   currentMonth     = today.getMonth();
let   currentYear      = today.getFullYear();

// Mapeo de cada estado a una clase CSS
// script.js
// mapeo de estados → clase CSS
const statusClasses = {
  NO_HAY_NADIE:                     'state-no-hay-nadie',
  HAY_GENTE_PERO_NO_NECESARIA:      'state-hay-gente-pero-no-necesaria',
  YA_HAY_GENTE_PERO_NO_SE_PLANIFICO:'state-ya-hay-gente-no-se-planifico',
  FUE_PLANIFICADA:                  'state-fue-planificada',
  FUE_DADA_LA_PLANIFICACION:        'state-fue-dada'
};
const noActivityClass = 'tile-no-activity';

// ————————————— INIT —————————————
async function init() {
  await loadActivities();
  renderCalendar(currentYear, currentMonth);
}
init();

// ————————————— CARGA TODAS LAS ACTIVIDADES —————————————
async function loadActivities() {
  try {
    const res  = await fetch(ACTIVITIES_API);
    const data = await res.json();
    activitiesMap = {};

    data.forEach(act => {
      // parseamos act.fecha y sacamos YYYY-MM-DD
      const d     = new Date(act.fecha);
      const iso   = [
        d.getFullYear(),
        String(d.getMonth()+1).padStart(2,'0'),
        String(d.getDate()).padStart(2,'0')
      ].join('-');
      activitiesMap[iso] = act;
    });
  } catch (e) {
    console.error('Error cargando actividades:', e);
    activitiesMap = {};
  }
}

// ————————————— RENDER CALENDARIO PARA MES/AÑO —————————————
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
        const cls = act
          ? (statusClasses[act.estado] || noActivityClass)
          : noActivityClass;
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

  // listeners en días con actividad
  calendarEl.querySelectorAll('td[data-date]').forEach(td => {
    const d = td.dataset.date;
    if (activitiesMap[d]) td.onclick = () => openDniForm(d);
  });
}

// ————————————— Navegar meses —————————————
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

// ————————————— CERRAR FORM —————————————
cancelBtn.addEventListener('click', closeForm);

// ————————————— FORM Paso 1: DNI o registro —————————————
function openDniForm(date) {
  currentActivity = activitiesMap[date];
  addedDnis = [];  // resetear antes de cada nueva inscripción
  formContainer.innerHTML = `
    <div id="step1">
      <h3>Actividad ${date}</h3>
      <p>Estado: ${currentActivity.estado.replace(/_/g,' ').toLowerCase()}</p>
      <label>DNI: <input id="dniInput" /></label>
      <div class="buttons">
        <button id="verifyBtn">Verificar</button>
        <button id="noRegBtn">No estoy registrado</button>
      </div>
    </div>
    <div id="regForm" style="display:none">
      <h3>Registro de usuario</h3>
      <label>Nombre: <input id="regName" /></label>
      <label>Apellido: <input id="regSurname" /></label>
      <label>Mail: <input id="regMail" type="email"/></label>
      <label>DNI: <input id="regDni" /></label>
      <div class="buttons">
        <button id="regSubmitBtn">Registrar</button>
        <button id="regCancelBtn">Cancelar</button>
      </div>
    </div>`;
  formContainer.style.display = 'flex';
  cancelBtn.style.display = 'block';

  document.getElementById('verifyBtn').addEventListener('click', verifyDni);
  document.getElementById('noRegBtn').addEventListener('click', () => {
    document.getElementById('step1').style.display = 'none';
    document.getElementById('regForm').style.display = 'block';
  });
  document.getElementById('regCancelBtn').addEventListener('click', () => {
    document.getElementById('regForm').style.display = 'none';
    document.getElementById('step1').style.display = 'block';
  });
  document.getElementById('regSubmitBtn').addEventListener('click', registerUser);
}

// ————————————— Paso 1: verificar DNI —————————————
async function verifyDni() {
  const dni = document.getElementById('dniInput').value.trim();
  if (!dni) return alert('Ingresa tu DNI.');

  try {
    const res = await fetch(`${BASE_URL}/user/${dni}`);  // GET /user/:id
    if (res.ok) {
      openParticipantsForm();
    } else if (res.status === 404) {
      alert('Usuario no encontrado. Por favor regístrate.');
      document.getElementById('step1').style.display   = 'none';
      document.getElementById('regForm').style.display = 'block';
    } else {
      throw new Error(`Status ${res.status}`);
    }
  } catch (e) {
    console.error('Error verificando usuario:', e);
    alert('Error al verificar usuario. Intenta de nuevo.');
  }
}

// ————————————— Paso 1: registro —————————————
async function registerUser() {
  const name    = document.getElementById('regName').value.trim();
  const surname = document.getElementById('regSurname').value.trim();
  const mail    = document.getElementById('regMail').value.trim();
  const dni     = document.getElementById('regDni').value.trim();
  if (!name || !surname || !mail || !dni) {
    return alert('Completa todos los campos.');
  }

  try {
    const res = await fetch(`${BASE_URL}/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, surname, mail, dni })
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);

    alert('Registrado con éxito.');
    document.getElementById('regForm').style.display  = 'none';
    document.getElementById('step1').style.display    = 'block';
    document.getElementById('dniInput').value         = dni;
  } catch (e) {
    console.error('Error registrando usuario:', e);
    alert('No se pudo registrar. Intenta de nuevo.');
  }
}

// ————————————— Paso 2: participantes —————————————
function openParticipantsForm() {
  const list = currentActivity.participants || [];
  formContainer.innerHTML = `
    <div id="step2">
      <h3>Integrantes actuales</h3>
      <ul>
        ${list.map(p => `<li>${p.name||'–'} (DNI ${p.dni})</li>`).join('')}
      </ul>
      <h4>Agregar DNI de integrante:</h4>
      <div id="newDnis"><input class="newDni" placeholder="DNI" /></div>
      <button id="addDniBtn">+ Agregar campo</button>
      <div class="buttons">
        <button id="toProposalsBtn">Siguiente</button>
      </div>
    </div>`;

  document.getElementById('addDniBtn').addEventListener('click', () => {
    document.getElementById('newDnis')
      .insertAdjacentHTML('beforeend','<input class="newDni" placeholder="DNI" />');
  });

  document.getElementById('toProposalsBtn')
    .addEventListener('click', () => {
      const newDnis = Array.from(document.querySelectorAll('.newDni'))
        .map(i => i.value.trim()).filter(v => v);
      if (newDnis.length === 0) {
        return alert('Agrega al menos un DNI.');
      }
      // guardamos los DNIs antes de cambiar el form
      addedDnis = newDnis;
      openProposalsForm();
    });
}

// ————————————— Paso 3: temáticas —————————————
async function openProposalsForm() {
  formContainer.innerHTML = `
    <div id="step3">
      <h3>Temáticas</h3>
      <div id="propsList">Cargando…</div>
      <div class="buttons">
        <button id="submitBtn">Enviar inscripción</button>
      </div>
    </div>`;
  let html = '';
  try {
    const res   = await fetch(PROPOSALS_API);
    const props = res.ok ? await res.json() : [];
    props.forEach(p => {
      html += `<label><input type="checkbox" name="prop" value="${p.tematica}"> ${p.tematica}</label><br/>`;
    });
  } catch {}
  html += `
    <label><input type="checkbox" id="otherChk"> Otro…</label>
    <div id="otherDiv" style="display:none">
      <input id="otherInput" placeholder="Nueva temática" />
    </div>`;
  document.getElementById('propsList').innerHTML = html;
  document.getElementById('otherChk')
    .addEventListener('change', e => {
      document.getElementById('otherDiv').style.display = e.target.checked ? 'block' : 'none';
    });
  document.getElementById('submitBtn')
    .addEventListener('click', submitActivityUpdate);
}

// ————————————— Submit final —————————————
async function submitActivityUpdate() {
  const allDnIs = [
    ...(currentActivity.participants?.map(p => p.dni) || []),
    ...addedDnis
  ];

  const sel = Array.from(document.querySelectorAll('input[name="prop"]:checked'))
    .map(cb => cb.value);
  if (document.getElementById('otherChk').checked) {
    const o = document.getElementById('otherInput').value.trim();
    if (o) sel.push(o);
  }

  const body = { participants: allDnIs, topics: sel };
  try {
    console.log('Enviando actualización:', JSON.stringify(body, null, 2));
    const res = await fetch(`${ACTIVITIES_API}/${currentActivity.id}`, {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(res.status);
    alert('¡Inscripción guardada!');
    closeForm();
    await init();
  } catch (e) {
    console.error(e);
    alert('Error al guardar inscripción.');
  }
}

// ————————————— Cerrar form —————————————
function closeForm() {
  formContainer.style.display = 'none';
  cancelBtn.style.display      = 'none';
  formContainer.innerHTML      = '';
}