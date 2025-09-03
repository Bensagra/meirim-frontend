(function () {
  const BASE_URL = 'https://meirim-backend.vercel.app';
  const ACTIVITIES_API = `${BASE_URL}/actividades`;

  const container = document.getElementById('activitiesList');

  async function load() {
    container.innerHTML = '<p class="muted">Cargando…</p>';
    try {
      const res = await fetch(ACTIVITIES_API);
      if (!res.ok) throw new Error('fetch failed');

      let data = await res.json();
      let items = Array.isArray(data) ? data : (data.items || (data.id ? [data] : []));

      items = items
        .filter(a => !!a.fecha)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

      if (!items.length) {
        container.innerHTML = '<p class="muted">Sin resultados.</p>';
        return;
      }

      container.innerHTML = items.map(renderCard).join('');
      attachListeners();
    } catch (e) {
      console.error(e);
      container.innerHTML = '<p class="muted">Error cargando actividades.</p>';
    }
  }

  function renderCard(act) {
    const date = new Date(act.fecha).toLocaleDateString('es-AR', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });

    const participants = (act.participants || [])
      .map(p => `${p.user?.name || ''} ${p.user?.surname || ''}`.trim())
      .filter(Boolean).join(', ') || '—';

    const topics = (act.tematicas || [])
      .map(t => t.tematica?.tematica).filter(Boolean);

    const estado = act.estado || 'NO_HAY_NADIE';
    const checked = estado === 'FUE_PLANIFICADA' ? 'checked' : '';

    return `
      <article class="activity-card" data-id="${act.id}">
        <header class="card-head">
          <h3>${date}</h3>
          <span class="state-tag ${estado}">${prettyState(estado)}</span>
        </header>

        <div class="meta">
          <div><strong>Planifican:</strong> ${participants}</div>
          ${topics.length ? `<div class="topics">
            ${topics.map(t => `<span>${t}</span>`).join('')}
          </div>` : ''}
        </div>

        <textarea class="notes" placeholder="Notas (opcional)">${act.notas || ''}</textarea>

        <div class="actions">
          <label class="planificada">
            <input type="checkbox" class="mark-planned" ${checked}/> Planificada
          </label>
          <div class="btns">
            <button class="btn btn-aza save-btn">Guardar</button>
          </div>
        </div>
      </article>`;
  }

  function prettyState(s){
    switch(s){
      case 'NO_HAY_NADIE': return 'Sin personas';
      case 'HAY_GENTE_PERO_NO_NECESARIA': return 'Hay gente, falta';
      case 'YA_HAY_GENTE_PERO_NO_SE_PLANIFICO': return 'Hay gente, sin plan';
      case 'FUE_PLANIFICADA': return 'Planificada';
      case 'FUE_DADA_LA_PLANIFICACION': return 'Entregada';
      default: return s;
    }
  }

  function attachListeners(){
    document.querySelectorAll('.save-btn').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const card = btn.closest('.activity-card');
        const id = card.dataset.id;
        const isPlanned = card.querySelector('.mark-planned').checked;
        const notes = card.querySelector('.notes').value.trim();

        // true  -> FUE_PLANIFICADA
        // false -> YA_HAY_GENTE_PERO_NO_SE_PLANIFICO
        const newEstado = isPlanned ? 'FUE_PLANIFICADA' : 'YA_HAY_GENTE_PERO_NO_SE_PLANIFICO';

        try{
          const r = await fetch(`${ACTIVITIES_API}/${id}`,{
            method:'PATCH',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ estado: newEstado, notas: notes })
          });
          if(!r.ok) throw new Error();
          // feedback visual rápido
          btn.textContent = 'Guardado ✓';
          btn.disabled = true;
          setTimeout(()=>{ btn.textContent='Guardar'; btn.disabled=false; load(); }, 700);
        }catch{
          alert('Error al guardar.');
        }
      });
    });
  }

  load();
})();