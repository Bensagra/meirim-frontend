// JavaScript para Admin - 100 Meirimers Dicen
const API_URL = 'http://localhost:3000';

let preguntas = [];
let editandoPregunta = null;

// Elementos del DOM
const statsGrid = document.getElementById('statsGrid');
const totalPreguntasEl = document.getElementById('totalPreguntas');
const preguntasActivasEl = document.getElementById('preguntasActivas');
const preguntasBloqueadasEl = document.getElementById('preguntasBloqueadas');
const totalRespuestasEl = document.getElementById('totalRespuestas');
const votantesUnicosEl = document.getElementById('votantesUnicos');
const crearPreguntaForm = document.getElementById('crearPreguntaForm');
const preguntasAdminList = document.getElementById('preguntasAdminList');
const recargarBtn = document.getElementById('recargarBtn');
const editModal = document.getElementById('editModal');
const closeEditModal = document.getElementById('closeEditModal');
const editarPreguntaForm = document.getElementById('editarPreguntaForm');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const respuestasModal = document.getElementById('respuestasModal');
const closeRespuestasModal = document.getElementById('closeRespuestasModal');
const respuestasModalTitle = document.getElementById('respuestasModalTitle');
const respuestasContent = document.getElementById('respuestasContent');
const loadingSpinner = document.getElementById('loadingSpinner');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  loadEstadisticas();
  loadPreguntas();

  crearPreguntaForm.addEventListener('submit', handleCrearPregunta);
  editarPreguntaForm.addEventListener('submit', handleEditarPregunta);
  recargarBtn.addEventListener('click', () => {
    loadEstadisticas();
    loadPreguntas();
  });

  closeEditModal.addEventListener('click', () => editModal.style.display = 'none');
  cancelEditBtn.addEventListener('click', () => editModal.style.display = 'none');
  closeRespuestasModal.addEventListener('click', () => respuestasModal.style.display = 'none');

  // Cerrar modales al hacer click fuera
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) editModal.style.display = 'none';
  });
  respuestasModal.addEventListener('click', (e) => {
    if (e.target === respuestasModal) respuestasModal.style.display = 'none';
  });
});

async function loadEstadisticas() {
  try {
    const response = await fetch(`${API_URL}/api/100meirimers/admin/estadisticas`);
    
    if (!response.ok) throw new Error('Error al cargar estadísticas');

    const stats = await response.json();
    
    totalPreguntasEl.textContent = stats.totalPreguntas;
    preguntasActivasEl.textContent = stats.preguntasActivas;
    preguntasBloqueadasEl.textContent = stats.preguntasBloqueadas;
    totalRespuestasEl.textContent = stats.totalRespuestas;
    votantesUnicosEl.textContent = stats.votantesUnicos;
  } catch (error) {
    console.error('Error:', error);
  }
}

async function loadPreguntas() {
  showLoading(true);

  try {
    const response = await fetch(`${API_URL}/api/100meirimers/admin/preguntas`);
    
    if (!response.ok) throw new Error('Error al cargar preguntas');

    preguntas = await response.json();
    renderPreguntas();
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cargar las preguntas');
  } finally {
    showLoading(false);
  }
}

function renderPreguntas() {
  if (preguntas.length === 0) {
    preguntasAdminList.innerHTML = '<p>No hay preguntas creadas aún.</p>';
    return;
  }

  preguntasAdminList.innerHTML = '';

  preguntas.forEach((pregunta) => {
    const item = document.createElement('div');
    item.className = 'pregunta-admin-item';
    
    const badges = [];
    if (pregunta.activa) {
      badges.push('<span class="badge active">Activa</span>');
    } else {
      badges.push('<span class="badge inactive">Inactiva</span>');
    }
    if (pregunta.bloqueada) {
      badges.push('<span class="badge locked">Bloqueada</span>');
    }

    item.innerHTML = `
      <div class="pregunta-admin-header">
        <div class="pregunta-admin-info">
          <h3>${pregunta.pregunta}</h3>
          <div class="pregunta-badges">
            ${badges.join('')}
            <span class="badge">${pregunta._count.respuestas} respuestas</span>
            <span class="badge">Orden: ${pregunta.orden}</span>
          </div>
        </div>
      </div>
      <div class="pregunta-admin-actions">
        <button class="btn btn-small btn-primary" onclick="editarPregunta(${pregunta.id})">
          Editar
        </button>
        <button class="btn btn-small btn-secondary" onclick="verRespuestas(${pregunta.id})">
          Ver Respuestas
        </button>
        <button class="btn btn-small btn-danger" onclick="eliminarPregunta(${pregunta.id})">
          Eliminar
        </button>
      </div>
    `;

    preguntasAdminList.appendChild(item);
  });
}

async function handleCrearPregunta(e) {
  e.preventDefault();

  const pregunta = document.getElementById('nuevaPregunta').value.trim();
  const orden = parseInt(document.getElementById('nuevoOrden').value);
  const activa = document.getElementById('nuevaActiva').checked;

  if (!pregunta) {
    alert('Por favor ingresa una pregunta');
    return;
  }

  showLoading(true);

  try {
    const response = await fetch(`${API_URL}/api/100meirimers/admin/preguntas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pregunta,
        orden,
        activa
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear pregunta');
    }

    showNotification('¡Pregunta creada exitosamente!');
    crearPreguntaForm.reset();
    document.getElementById('nuevaActiva').checked = true;
    
    loadEstadisticas();
    loadPreguntas();
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'Error al crear la pregunta');
  } finally {
    showLoading(false);
  }
}

function editarPregunta(id) {
  const pregunta = preguntas.find(p => p.id === id);
  if (!pregunta) return;

  editandoPregunta = pregunta;
  
  document.getElementById('editId').value = pregunta.id;
  document.getElementById('editPregunta').value = pregunta.pregunta;
  document.getElementById('editOrden').value = pregunta.orden;
  document.getElementById('editActiva').checked = pregunta.activa;
  document.getElementById('editBloqueada').checked = pregunta.bloqueada;

  editModal.style.display = 'flex';
}

async function handleEditarPregunta(e) {
  e.preventDefault();

  const id = parseInt(document.getElementById('editId').value);
  const pregunta = document.getElementById('editPregunta').value.trim();
  const orden = parseInt(document.getElementById('editOrden').value);
  const activa = document.getElementById('editActiva').checked;
  const bloqueada = document.getElementById('editBloqueada').checked;

  showLoading(true);

  try {
    const response = await fetch(`${API_URL}/api/100meirimers/admin/preguntas/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pregunta,
        orden,
        activa,
        bloqueada
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al actualizar pregunta');
    }

    showNotification('¡Pregunta actualizada exitosamente!');
    editModal.style.display = 'none';
    
    loadEstadisticas();
    loadPreguntas();
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'Error al actualizar la pregunta');
  } finally {
    showLoading(false);
  }
}

async function eliminarPregunta(id) {
  const pregunta = preguntas.find(p => p.id === id);
  if (!pregunta) return;

  if (!confirm(`¿Estás seguro de eliminar la pregunta "${pregunta.pregunta}"?\n\nEsto eliminará también todas sus respuestas.`)) {
    return;
  }

  showLoading(true);

  try {
    const response = await fetch(`${API_URL}/api/100meirimers/admin/preguntas/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar pregunta');
    }

    showNotification('Pregunta eliminada');
    
    loadEstadisticas();
    loadPreguntas();
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'Error al eliminar la pregunta');
  } finally {
    showLoading(false);
  }
}

async function verRespuestas(id) {
  const pregunta = preguntas.find(p => p.id === id);
  if (!pregunta) return;

  showLoading(true);

  try {
    const response = await fetch(`${API_URL}/api/100meirimers/admin/preguntas/${id}/respuestas`);
    
    if (!response.ok) throw new Error('Error al cargar respuestas');

    const data = await response.json();
    
    respuestasModalTitle.textContent = `Respuestas: ${pregunta.pregunta}`;
    
    let html = `<p><strong>Total de respuestas:</strong> ${data.total}</p>`;
    
    if (data.respuestasAgrupadas.length === 0) {
      html += '<p>No hay respuestas aún.</p>';
    } else {
      html += '<h3>Respuestas agrupadas:</h3>';
      html += '<div class="preguntas-admin-list">';
      
      data.respuestasAgrupadas.forEach((r, index) => {
        html += `
          <div class="pregunta-admin-item">
            <div class="pregunta-admin-header">
              <div class="pregunta-admin-info">
                <h3>${index + 1}. ${r.respuesta}</h3>
                <div class="pregunta-badges">
                  <span class="badge active">${r.cantidad} votos</span>
                  <span class="badge">${r.porcentaje}%</span>
                </div>
              </div>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
    }

    respuestasContent.innerHTML = html;
    respuestasModal.style.display = 'flex';
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cargar las respuestas');
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

// Hacer funciones globales
window.editarPregunta = editarPregunta;
window.eliminarPregunta = eliminarPregunta;
window.verRespuestas = verRespuestas;

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
