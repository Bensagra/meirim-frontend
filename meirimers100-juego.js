// JavaScript para el juego - 100 Meirimers Dicen
const API_URL = 'http://localhost:3000';

let preguntas = [];
let preguntaActual = null;
let resultadosCompletos = [];
let respuestasDescubiertas = new Set();
let incorrectas = 0;
let intentos = 0;

// Elementos del DOM
const selectorSection = document.getElementById('selectorSection');
const juegoSection = document.getElementById('juegoSection');
const preguntasList = document.getElementById('preguntasList');
const preguntaActualDisplay = document.getElementById('preguntaActual');
const totalRespuestasDisplay = document.getElementById('totalRespuestas');
const answersBoard = document.getElementById('answersBoard');
const respuestaForm = document.getElementById('respuestaForm');
const respuestaInput = document.getElementById('respuestaInput');
const revelarTodas = document.getElementById('revelarTodas');
const correctasCount = document.getElementById('correctasCount');
const intentosCount = document.getElementById('intentosCount');
const incorrectasDisplay = document.getElementById('incorrectasDisplay');
const volverBtn = document.getElementById('volverBtn');
const siguientePregunta = document.getElementById('siguientePregunta');
const loadingSpinner = document.getElementById('loadingSpinner');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  loadPreguntasDisponibles();

  respuestaForm.addEventListener('submit', handleRespuesta);
  revelarTodas.addEventListener('click', revelarTodasRespuestas);
  volverBtn.addEventListener('click', volverAlMenu);
  siguientePregunta.addEventListener('click', volverAlMenu);
});

async function loadPreguntasDisponibles() {
  showLoading(true);

  try {
    const response = await fetch(`${API_URL}/api/100meirimers/preguntas/juego`);
    
    if (!response.ok) {
      throw new Error('Error al cargar preguntas');
    }

    preguntas = await response.json();
    renderPreguntasList();
  } catch (error) {
    console.error('Error:', error);
    preguntasList.innerHTML = `
      <div class="card centered">
        <h2>⚠️ No hay preguntas disponibles para jugar</h2>
        <p>Para poder jugar necesitas:</p>
        <ol style="text-align: left; max-width: 400px; margin: 1rem auto;">
          <li>Crear preguntas en el panel de admin</li>
          <li>Marcarlas como "Activas"</li>
          <li>Que al menos 1 persona responda cada pregunta</li>
        </ol>
        <div style="margin-top: 1.5rem;">
          <a href="./meirimers100-admin.html" class="btn btn-secondary">Ir al Admin</a>
          <a href="./meirimers100-votar.html" class="btn btn-green">Ir a Votar</a>
        </div>
      </div>
    `;
  } finally {
    showLoading(false);
  }
}

function renderPreguntasList() {
  if (preguntas.length === 0) {
    preguntasList.innerHTML = `
      <div class="card centered">
        <h2>⚠️ No hay preguntas disponibles para jugar</h2>
        <p>Para poder jugar necesitas:</p>
        <ol style="text-align: left; max-width: 400px; margin: 1rem auto;">
          <li>Crear preguntas en el panel de admin</li>
          <li>Marcarlas como "Activas"</li>
          <li>Que al menos 1 persona responda cada pregunta</li>
        </ol>
        <div style="margin-top: 1.5rem;">
          <a href="./meirimers100-admin.html" class="btn btn-secondary">Ir al Admin</a>
          <a href="./meirimers100-votar.html" class="btn btn-green">Ir a Votar</a>
        </div>
      </div>
    `;
    return;
  }

  preguntasList.innerHTML = '';

  preguntas.forEach((pregunta, index) => {
    const item = document.createElement('div');
    item.className = 'pregunta-item';
    item.innerHTML = `
      <div class="pregunta-info">
        <h3>Pregunta ${index + 1}</h3>
        <p class="pregunta-meta">${pregunta.pregunta}</p>
      </div>
      <div>
        <span class="badge active">${pregunta._count.respuestas} respuestas</span>
      </div>
    `;
    item.addEventListener('click', () => iniciarJuego(pregunta.id));
    preguntasList.appendChild(item);
  });
}

async function iniciarJuego(preguntaId) {
  showLoading(true);

  try {
    const response = await fetch(`${API_URL}/api/100meirimers/pregunta/${preguntaId}/resultados`);
    
    if (!response.ok) {
      throw new Error('Error al cargar resultados');
    }

    const data = await response.json();
    preguntaActual = data;
    resultadosCompletos = data.resultados;
    respuestasDescubiertas = new Set();
    incorrectas = 0;
    intentos = 0;

    mostrarJuego();
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cargar la pregunta');
  } finally {
    showLoading(false);
  }
}

function mostrarJuego() {
  selectorSection.style.display = 'none';
  juegoSection.style.display = 'block';

  preguntaActualDisplay.textContent = preguntaActual.pregunta;
  totalRespuestasDisplay.textContent = preguntaActual.totalRespuestas;

  renderBoard();
  updateStats();
  respuestaInput.value = '';
  respuestaInput.focus();
}

function renderBoard() {
  answersBoard.innerHTML = '';

  // Mostrar top 10 respuestas o todas si son menos
  const topRespuestas = resultadosCompletos.slice(0, 10);

  topRespuestas.forEach((resultado, index) => {
    const slot = document.createElement('div');
    slot.className = 'answer-slot hidden';
    slot.id = `answer-${index}`;
    
    if (respuestasDescubiertas.has(resultado.respuesta)) {
      slot.classList.remove('hidden');
      slot.classList.add('revealed');
    }

    slot.innerHTML = `
      <div class="answer-number">${index + 1}</div>
      <div class="answer-text">${respuestasDescubiertas.has(resultado.respuesta) ? resultado.respuesta.toUpperCase() : '???'}</div>
      <div class="answer-points">${resultado.porcentaje}%</div>
    `;

    answersBoard.appendChild(slot);
  });
}

async function handleRespuesta(e) {
  e.preventDefault();

  const respuesta = respuestaInput.value.trim();
  
  if (!respuesta) {
    return;
  }

  intentos++;
  showLoading(true);

  try {
    const response = await fetch(`${API_URL}/api/100meirimers/verificar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        preguntaId: preguntaActual.id,
        respuesta: respuesta
      })
    });

    if (!response.ok) {
      throw new Error('Error al verificar respuesta');
    }

    const data = await response.json();

    if (data.correcta) {
      // Respuesta correcta!
      respuestasDescubiertas.add(data.respuesta);
      renderBoard();
      showNotification(`¡Correcto! ${data.porcentaje}%`, 'success');
      respuestaInput.value = '';

      // Verificar si descubrió todas
      if (respuestasDescubiertas.size >= Math.min(10, resultadosCompletos.length)) {
        setTimeout(() => {
          alert('¡Felicitaciones! ¡Descubriste todas las respuestas!');
          siguientePregunta.style.display = 'block';
        }, 500);
      }
    } else {
      // Respuesta incorrecta
      incorrectas++;
      showNotification('✗ No está en el tablero', 'error');
      respuestaInput.value = '';

      if (incorrectas >= 3) {
        setTimeout(() => {
          alert('¡Se acabó el juego! Llegaste a 3 incorrectas.');
          revelarTodasRespuestas();
        }, 500);
      }
    }

    updateStats();
  } catch (error) {
    console.error('Error:', error);
    alert('Error al verificar la respuesta');
  } finally {
    showLoading(false);
    respuestaInput.focus();
  }
}

function revelarTodasRespuestas() {
  resultadosCompletos.forEach(r => {
    respuestasDescubiertas.add(r.respuesta);
  });
  renderBoard();
  respuestaInput.disabled = true;
  revelarTodas.disabled = true;
  siguientePregunta.style.display = 'block';
}

function updateStats() {
  correctasCount.textContent = respuestasDescubiertas.size;
  intentosCount.textContent = intentos;
  incorrectasDisplay.textContent = `${incorrectas}/3`;
}

function volverAlMenu() {
  selectorSection.style.display = 'block';
  juegoSection.style.display = 'none';
  preguntaActual = null;
  respuestaInput.disabled = false;
  revelarTodas.disabled = false;
  siguientePregunta.style.display = 'none';
}

function showLoading(show) {
  loadingSpinner.style.display = show ? 'flex' : 'none';
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  const bgColor = type === 'success' ? 'var(--game-success)' : 'var(--game-secondary)';
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    font-size: 1.2rem;
    font-weight: bold;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

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
