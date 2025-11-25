// JavaScript para votación - 100 Meirimers Dicen
const API_URL = 'http://localhost:3000';

let currentUser = null;
let preguntas = [];
let misRespuestas = {};

// Elementos del DOM
const loginSection = document.getElementById('loginSection');
const votingSection = document.getElementById('votingSection');
const loginForm = document.getElementById('loginForm');
const nombreInput = document.getElementById('nombreInput');
const userNombreDisplay = document.getElementById('userNombre');
const logoutBtn = document.getElementById('logoutBtn');
const preguntasContainer = document.getElementById('preguntasContainer');
const finalizarBtn = document.getElementById('finalizarBtn');
const loadingSpinner = document.getElementById('loadingSpinner');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('votante100Meirimers');
  if (savedUser) {
    currentUser = savedUser;
    showVotingSection();
  }

  loginForm.addEventListener('submit', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  finalizarBtn.addEventListener('click', () => {
    window.location.href = './meirimers100-juego.html';
  });
});

function handleLogin(e) {
  e.preventDefault();
  const nombre = nombreInput.value.trim();
  
  if (!nombre || nombre.length < 2) {
    alert('Por favor ingresa un nombre válido (mínimo 2 caracteres)');
    return;
  }

  currentUser = nombre;
  localStorage.setItem('votante100Meirimers', nombre);
  showVotingSection();
}

function handleLogout() {
  if (confirm('¿Estás seguro de que quieres cambiar de nombre?')) {
    currentUser = null;
    localStorage.removeItem('votante100Meirimers');
    loginSection.style.display = 'block';
    votingSection.style.display = 'none';
    nombreInput.value = '';
  }
}

async function showVotingSection() {
  loginSection.style.display = 'none';
  votingSection.style.display = 'block';
  userNombreDisplay.textContent = currentUser;
  
  await loadPreguntas();
}

async function loadPreguntas() {
  showLoading(true);
  
  try {
    const [preguntasRes, respuestasRes] = await Promise.all([
      fetch(`${API_URL}/api/100meirimers/preguntas/votar`),
      fetch(`${API_URL}/api/100meirimers/mis-respuestas/${currentUser}`)
    ]);

    if (!preguntasRes.ok) {
      throw new Error('Error al cargar preguntas');
    }

    preguntas = await preguntasRes.json();
    
    if (respuestasRes.ok) {
      const respuestas = await respuestasRes.json();
      misRespuestas = {};
      respuestas.forEach(r => {
        misRespuestas[r.preguntaId] = r.respuesta;
      });
    }

    renderPreguntas();
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cargar las preguntas. Por favor recarga la página.');
  } finally {
    showLoading(false);
  }
}

function renderPreguntas() {
  preguntasContainer.innerHTML = '';

  if (preguntas.length === 0) {
    preguntasContainer.innerHTML = `
      <div class="card centered">
        <h2>No hay preguntas disponibles</h2>
        <p>Vuelve más tarde cuando haya nuevas preguntas para responder.</p>
        <a href="./meirimers100-juego.html" class="btn btn-green">Ir al Juego</a>
      </div>
    `;
    return;
  }

  preguntas.forEach((pregunta, index) => {
    const yaRespondida = misRespuestas[pregunta.id];
    
    const card = document.createElement('div');
    card.className = `pregunta-card ${yaRespondida ? 'respondida' : ''}`;
    
    card.innerHTML = `
      <div class="pregunta-header">
        <div class="pregunta-numero">${index + 1}</div>
        <div class="pregunta-texto">${pregunta.pregunta}</div>
        ${yaRespondida ? '<span class="pregunta-status">✓ Respondida</span>' : ''}
      </div>
      <div class="respuesta-input-group">
        <input 
          type="text" 
          id="respuesta-${pregunta.id}" 
          placeholder="Tu respuesta..." 
          value="${yaRespondida || ''}"
          data-pregunta-id="${pregunta.id}"
        />
        <button class="btn btn-primary" onclick="guardarRespuesta(${pregunta.id})">
          ${yaRespondida ? 'Actualizar' : 'Guardar'}
        </button>
      </div>
    `;

    preguntasContainer.appendChild(card);
  });

  // Verificar si respondió todas
  const todasRespondidas = preguntas.every(p => misRespuestas[p.id]);
  finalizarBtn.style.display = todasRespondidas ? 'block' : 'none';
}

async function guardarRespuesta(preguntaId) {
  const input = document.getElementById(`respuesta-${preguntaId}`);
  const respuesta = input.value.trim();

  if (!respuesta) {
    alert('Por favor escribe una respuesta');
    input.focus();
    return;
  }

  showLoading(true);

  try {
    const response = await fetch(`${API_URL}/api/100meirimers/responder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        preguntaId,
        respuesta,
        votante: currentUser
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al guardar respuesta');
    }

    const data = await response.json();
    misRespuestas[preguntaId] = data.respuesta.respuesta;

    showNotification('¡Respuesta guardada!');
    renderPreguntas();
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'Error al guardar la respuesta');
  } finally {
    showLoading(false);
  }
}

function showLoading(show) {
  loadingSpinner.style.display = show ? 'flex' : 'none';
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--color-primary);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Hacer guardarRespuesta global
window.guardarRespuesta = guardarRespuesta;

const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
