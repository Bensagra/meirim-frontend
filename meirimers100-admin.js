const API_URL = 'https://meirim-backend.vercel.app/api';

document.addEventListener('DOMContentLoaded', () => {
  cargarEstadisticas();
  cargarPreguntas();
  
  document.getElementById('btnInicializar').addEventListener('click', inicializarDatos);
});

async function cargarEstadisticas() {
  try {
    const response = await fetch(`${API_URL}/100meirimers/admin/preguntas`);
    
    if (!response.ok) {
      throw new Error('Error al cargar preguntas');
    }
    
    const preguntas = await response.json();
    
    const totalPreguntas = preguntas.length;
    const preguntasActivas = preguntas.filter(p => p.activa).length;
    const totalOpciones = preguntas.reduce((sum, p) => sum + p.opciones.length, 0);
    
    document.getElementById('totalPreguntas').textContent = totalPreguntas;
    document.getElementById('preguntasActivas').textContent = preguntasActivas;
    document.getElementById('totalOpciones').textContent = totalOpciones;
    
  } catch (error) {
    console.error('Error:', error);
  }
}

async function cargarPreguntas() {
  try {
    showLoading(true);
    
    const response = await fetch(`${API_URL}/100meirimers/admin/preguntas`);
    
    if (!response.ok) {
      throw new Error('Error al cargar preguntas');
    }
    
    const preguntas = await response.json();
    mostrarPreguntas(preguntas);
    
    showLoading(false);
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cargar las preguntas');
    showLoading(false);
  }
}

function mostrarPreguntas(preguntas) {
  const lista = document.getElementById('preguntasAdminList');
  
  if (preguntas.length === 0) {
    lista.innerHTML = '<p class="empty-message">No hay preguntas. Haz clic en "Inicializar Preguntas" para cargar las 7 preguntas predefinidas.</p>';
    return;
  }
  
  lista.innerHTML = '';
  
  preguntas.forEach(pregunta => {
    const div = document.createElement('div');
    div.className = 'pregunta-admin-item';
    
    const opcionesHTML = pregunta.opciones
      .sort((a, b) => a.posicion - b.posicion)
      .map(op => `
        <div class="opcion-admin">
          <span class="opcion-posicion">${op.posicion}°</span>
          <span class="opcion-texto">${op.texto}</span>
          <span class="opcion-cantidad">${op.cantidad} votos</span>
        </div>
      `).join('');
    
    div.innerHTML = `
      <div class="pregunta-admin-header">
        <h3>${pregunta.pregunta}</h3>
        <div class="pregunta-meta">
          <span class="badge ${pregunta.activa ? 'badge-success' : 'badge-secondary'}">
            ${pregunta.activa ? 'Activa' : 'Inactiva'}
          </span>
          <span class="badge badge-info">Orden: ${pregunta.orden}</span>
        </div>
      </div>
      <div class="pregunta-admin-body">
        <h4>Opciones (${pregunta.opciones.length}):</h4>
        <div class="opciones-list">
          ${opcionesHTML}
        </div>
      </div>
      <div class="pregunta-admin-actions">
        <button class="btn btn-sm btn-secondary" onclick="toggleActiva(${pregunta.id}, ${!pregunta.activa})">
          ${pregunta.activa ? 'Desactivar' : 'Activar'}
        </button>
        <button class="btn btn-sm btn-danger" onclick="eliminarPregunta(${pregunta.id})">
          Eliminar
        </button>
      </div>
    `;
    
    lista.appendChild(div);
  });
}

async function inicializarDatos() {
  if (!confirm('¿Estás seguro? Esto eliminará todas las preguntas existentes y cargará las 7 preguntas predefinidas.')) {
    return;
  }
  
  try {
    showLoading(true);
    
    const response = await fetch(`${API_URL}/100meirimers/admin/inicializar`, {
      method: 'POST'
    });
    
    if (!response.ok) {
      throw new Error('Error al inicializar datos');
    }
    
    const result = await response.json();
    
    alert(result.message);
    
    cargarEstadisticas();
    cargarPreguntas();
    
    showLoading(false);
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error al inicializar los datos');
    showLoading(false);
  }
}

async function toggleActiva(preguntaId, activa) {
  try {
    const response = await fetch(`${API_URL}/100meirimers/admin/preguntas/${preguntaId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ activa })
    });
    
    if (!response.ok) {
      throw new Error('Error al actualizar pregunta');
    }
    
    cargarEstadisticas();
    cargarPreguntas();
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error al actualizar la pregunta');
  }
}

async function eliminarPregunta(preguntaId) {
  if (!confirm('¿Estás seguro de eliminar esta pregunta?')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/100meirimers/admin/preguntas/${preguntaId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Error al eliminar pregunta');
    }
    
    cargarEstadisticas();
    cargarPreguntas();
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error al eliminar la pregunta');
  }
}

function showLoading(show) {
  const spinner = document.getElementById('loadingSpinner');
  spinner.style.display = show ? 'flex' : 'none';
}
