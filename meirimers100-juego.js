const API_URL = 'https://meirim-backend.vercel.app/api';

let preguntaActual = null;
let ordenActual = []; // Array de IDs en el orden actual

document.addEventListener('DOMContentLoaded', () => {
  cargarPregunta();
  
  document.getElementById('verificarBtn').addEventListener('click', comprobarOrden);
  document.getElementById('siguientePregunta').addEventListener('click', cargarPregunta);
});

async function cargarPregunta() {
  try{
    const loadingDiv = document.getElementById('loadingSpinner');
    const gameDiv = document.getElementById('juegoSection');
    const resultadosDiv = document.getElementById('resultadosSection');
    
    loadingDiv.style.display = 'none';
    gameDiv.style.display = 'block';
    resultadosDiv.style.display = 'none';
    
    const response = await fetch(`${API_URL}/100meirimers/preguntas`);
    
    if (!response.ok) {
      throw new Error('Error al cargar pregunta');
    }
    
    const preguntas = await response.json();
    
    if (!preguntas || preguntas.length === 0) {
      alert('No hay preguntas disponibles');
      return;
    }
    
    // Seleccionar pregunta aleatoria
    preguntaActual = preguntas[Math.floor(Math.random() * preguntas.length)];
    
    // Mezclar opciones para el juego
    const opcionesMezcladas = [...preguntaActual.opciones].sort(() => Math.random() - 0.5);
    ordenActual = opcionesMezcladas.map(o => o.id);
    
    mostrarPregunta(preguntaActual, opcionesMezcladas);
    
    loadingDiv.style.display = 'none';
    gameDiv.style.display = 'block';
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cargar la pregunta. Por favor intenta de nuevo.');
  }
}

function mostrarPregunta(pregunta, opciones) {
  document.getElementById('preguntaActual').textContent = pregunta.pregunta;
  
  const listaOpciones = document.getElementById('opcionesList');
  listaOpciones.innerHTML = '';
  
  opciones.forEach((opcion, index) => {
    const div = document.createElement('div');
    div.className = 'opcion-item';
    div.draggable = true;
    div.dataset.opcionId = opcion.id;
    
    div.innerHTML = `
      <div class="drag-handle">☰</div>
      <div class="opcion-numero">${index + 1}</div>
      <div class="opcion-texto">${opcion.texto}</div>
    `;
    
    // Eventos drag and drop
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('drop', handleDrop);
    div.addEventListener('dragend', handleDragEnd);
    
    listaOpciones.appendChild(div);
  });
}

let draggedElement = null;

function handleDragStart(e) {
  draggedElement = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  
  const afterElement = getDragAfterElement(e.currentTarget.parentElement, e.clientY);
  const dragging = document.querySelector('.dragging');
  
  if (afterElement == null) {
    e.currentTarget.parentElement.appendChild(dragging);
  } else {
    e.currentTarget.parentElement.insertBefore(dragging, afterElement);
  }
  
  return false;
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  // Actualizar números de posición
  actualizarNumerosOrden();
  
  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  
  // Actualizar array de orden actual
  const items = document.querySelectorAll('.opcion-item');
  ordenActual = Array.from(items).map(item => parseInt(item.dataset.opcionId));
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.opcion-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function actualizarNumerosOrden() {
  const items = document.querySelectorAll('.opcion-item');
  items.forEach((item, index) => {
    const numeroDiv = item.querySelector('.opcion-numero');
    numeroDiv.textContent = index + 1;
  });
}

async function comprobarOrden() {
  try {
    const response = await fetch(`${API_URL}/100meirimers/verificar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        preguntaId: preguntaActual.id,
        ordenUsuario: ordenActual
      })
    });
    
    if (!response.ok) {
      throw new Error('Error al verificar orden');
    }
    
    const resultado = await response.json();
    mostrarResultados(resultado);
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error al verificar el orden. Por favor intenta de nuevo.');
  }
}

function mostrarResultados(resultado) {
  document.getElementById('juegoSection').querySelector('.game-board').style.display = 'none';
  document.getElementById('resultadosSection').style.display = 'block';
  
  const porcentaje = Math.round(resultado.porcentaje);
  let mensaje = '';
  
  if (porcentaje === 100) {
    mensaje = '¡PERFECTO! 🎉';
  } else if (porcentaje >= 80) {
    mensaje = '¡Excelente! 🌟';
  } else if (porcentaje >= 60) {
    mensaje = '¡Bien hecho! 👍';
  } else if (porcentaje >= 40) {
    mensaje = 'No está mal 😊';
  } else {
    mensaje = 'Sigue intentando 💪';
  }
  
  document.getElementById('puntajeTexto').innerHTML = `
    ${mensaje}<br>
    Acertaste ${resultado.correctas} de ${resultado.total} (${porcentaje}%)
  `;
  
  const listaResultados = document.getElementById('resultadosList');
  listaResultados.innerHTML = '';
  
  // Ordenar resultados por posición correcta
  const resultadosOrdenados = [...resultado.resultados].sort((a, b) => a.posicionCorrecta - b.posicionCorrecta);
  
  resultadosOrdenados.forEach(res => {
    const opcion = preguntaActual.opciones.find(o => o.id === res.opcionId);
    
    const div = document.createElement('div');
    div.className = `resultado-item ${res.correcto ? 'correcto' : 'incorrecto'}`;
    
    div.innerHTML = `
      <div class="resultado-posicion">
        <span class="resultado-posicion-numero">${res.posicionCorrecta}</span>
        <span class="resultado-posicion-label">Puesto</span>
      </div>
      <div class="resultado-texto">${opcion.texto}</div>
      <div class="resultado-stats">
        <span class="resultado-cantidad">${opcion.cantidad}</span>
        <span class="resultado-label">votos</span>
      </div>
      <div class="resultado-icono">${res.correcto ? '✓' : '✗'}</div>
    `;
    
    listaResultados.appendChild(div);
  });
}
