(async function() {
  const API = 'https://meirim-backend.vercel.app/actividades';
  const container = document.getElementById('activitiesList');

  // Fetch y render
  async function load() {
    try {
      const res = await fetch(API);
      const list = await res.json();
      container.innerHTML = list.map(renderCard).join('');
      attachListeners();
    } catch (e) {
      container.innerHTML = '<p>Error cargando actividades.</p>';
    }
  }

  // Construye HTML de cada card
  function renderCard(act) {
    const date = new Date(act.fecha).toLocaleDateString('es-AR');
    const nombres = act.participants.map(p=>p.user.name).join(', ');
    const topics = act.tematicas.map(t=>t.tematica.tematica);
    const estado = act.estado;
    return `
      <div class="activity-card" data-id="${act.id}">
        <h3>${date}</h3>
        <div class="meta">
          <span><strong>Planifican:</strong> ${nombres || '–'}</span><br />
          <span><strong>Estado:</strong> <span class="state-tag">${estado}</span></span>
        </div>
        <div class="topics">
          ${topics.map(t=>`<span>${t}</span>`).join('')}
        </div>
        <div class="actions">
          <label><input type="checkbox" class="mark-planned" ${estado === 'FUE_PLANIFICADA' ? 'checked' : ''}/> Planificada</label>
          <button class="save-btn">Guardar</button>
        </div>
        <textarea class="notes" placeholder="Notas (opcional)">${act.notas || ''}</textarea>
      </div>
    `;
  }

  // Listeners de botones
  function attachListeners() {
    container.querySelectorAll('.save-btn').forEach(btn => {
      btn.onclick = async () => {
        const card = btn.closest('.activity-card');
        const id = card.dataset.id;
        const planned = card.querySelector('.mark-planned').checked;
        const notes = card.querySelector('.notes').value.trim();
        try {
          await fetch(`${API}/${id}`, {
            method: 'PATCH',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
              estado: planned ? 'FUE_PLANIFICADA' : 'HAY_GENTE_PERO_NO_NECESARIA',
              notas: notes
            })
          });
          alert('Guardado.');
          load();
        } catch {
          alert('Error al guardar.');
        }
      };
    });
  }

  load();
})();