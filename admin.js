
(function(){
  const BASE_URL = '/api';
  const ACTIVITIES_API = `${BASE_URL}/activities`;

  const container = document.getElementById('activitiesList');
  const chapterSelect = document.getElementById('chapterSelect');
  const dateFrom = document.getElementById('dateFrom');
  const dateTo = document.getElementById('dateTo');
  const searchText = document.getElementById('searchText');
  const statusSelect = document.getElementById('statusSelect');
  const takeSelect = document.getElementById('takeSelect');
  const applyBtn = document.getElementById('applyFilters');
  const clearBtn = document.getElementById('clearFilters');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');

  // Estado de paginación
  let skip = 0; let total = 0;

  // Init chapter from query
  (function syncChapterFromQuery(){
    const u = new URL(window.location.href);
    const s = u.searchParams.get('chapterSlug');
    if(s){ const opt = Array.from(chapterSelect.options).find(o=>o.value===s); if(opt) chapterSelect.value = s; }
  })();

  // Eventos
  applyBtn.addEventListener('click', ()=>{ skip = 0; load(); });
  clearBtn.addEventListener('click', ()=>{ dateFrom.value=''; dateTo.value=''; searchText.value=''; statusSelect.value=''; takeSelect.value='48'; skip=0; load(); });
  chapterSelect.addEventListener('change', ()=>{ skip=0; load(); });
  prevBtn.addEventListener('click', ()=>{ if(skip>0){ skip = Math.max(0, skip - Number(takeSelect.value)); load(); }});
  nextBtn.addEventListener('click', ()=>{ if(skip + Number(takeSelect.value) < total){ skip += Number(takeSelect.value); load(); }});

  // Fetch y render
  async function load(){
    container.innerHTML = '<p class="loading">Cargando…</p>';
    try {
      const url = new URL(ACTIVITIES_API, window.location.origin);
      url.searchParams.set('chapterSlug', chapterSelect.value);
      if(dateFrom.value) url.searchParams.set('from', dateFrom.value);
      if(dateTo.value) url.searchParams.set('to', dateTo.value);
      if(searchText.value.trim()) url.searchParams.set('q', searchText.value.trim());
      url.searchParams.set('take', takeSelect.value);
      url.searchParams.set('skip', String(skip));
      // Nota: el filtro por estado lo haremos client-side si el backend no lo soporta.
      const res = await fetch(url.toString());
      const data = await res.json();
      const items = Array.isArray(data)? data : (data.items || []);
      total = data.total ?? items.length;

      // Filtro por estado (client-side)
      const filtered = statusSelect.value ? items.filter(a=> a.estado === statusSelect.value) : items;

      if(filtered.length === 0){ container.innerHTML = '<p class="empty">Sin resultados.</p>'; pageInfo.textContent = '';
      } else {
        container.innerHTML = filtered.map(renderCard).join('');
        attachListeners();
        const fromN = skip + 1; const toN = Math.min(skip + Number(takeSelect.value), total);
        pageInfo.textContent = `${fromN}–${toN} de ${total}`;
      }
    } catch (e) {
      console.error(e);
      container.innerHTML = '<p class="error">Error cargando actividades.</p>';
      pageInfo.textContent = '';
    }
  }

  // HTML de cada card
  function renderCard(act){
    const date = new Date(act.fecha).toLocaleDateString('es-AR', {weekday:'short', year:'numeric', month:'short', day:'numeric'});
    const participants = (act.participants||[]).map(p=>`${p.user?.name||''} ${p.user?.surname||''}`.trim()).filter(Boolean).join(', ') || '—';
    const topics = (act.tematicas||[]).map(t=>t.tematica?.tematica).filter(Boolean);
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
          ${topics.length? `<div class="topics">${topics.map(t=>`<span>${t}</span>`).join('')}</div>`:''}
        </div>
        <textarea class="notes" placeholder="Notas (opcional)">${act.notas||''}</textarea>
        <div class="actions">
          <label class="planificada"><input type="checkbox" class="mark-planned" ${checked}/> Planificada</label>
          <div class="btns">
            <button class="btn btn-secondary btn-refresh">Recalcular estado</button>
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

  // Listeners de acciones
  function attachListeners(){
    container.querySelectorAll('.save-btn').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const card = btn.closest('.activity-card');
        const id = card.dataset.id;
        const planned = card.querySelector('.mark-planned').checked;
        const notes = card.querySelector('.notes').value.trim();
        try{
          // En tu backend nuevo PATCH espera { planificada, notas }
          const res = await fetch(`${ACTIVITIES_API}/${id}`,{
            method:'PATCH', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ planificada: planned, notas: notes })
          });
          if(!res.ok) throw new Error('patch failed');
          // Optimista: actualizamos UI rápidamente
          card.querySelector('.state-tag').textContent = planned? 'Planificada':'Actualizado';
          await load();
        }catch(e){ alert('Error al guardar.'); }
      });
    });

    container.querySelectorAll('.btn-refresh').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const card = btn.closest('.activity-card');
        const id = card.dataset.id;
        try{
          // Enviar planificada=false para forzar recálculo por # de participantes
          const res = await fetch(`${ACTIVITIES_API}/${id}`,{
            method:'PATCH', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ planificada: false })
          });
          if(!res.ok) throw new Error('recalc failed');
          await load();
        }catch(e){ alert('No se pudo recalcular.'); }
      });
    });
  }

  // Arranque
  load();
})();
