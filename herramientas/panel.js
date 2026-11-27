/**
 * BÓVEDA PERSONAL · CLIENT CONTROLLER
 * Architecture: Text-First, Obsidian-Native, Markdown Workbench.
 */

(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const message = $('#message');

  let toastTimer;
  let topicFilter = 'Todos';
  let cachedData = null;
  let currentDrawerPath = '';
  let isDrawerEditMode = false;
  let vaultName = 'Boveda Personal';

  const routeName = {
    inicio: 'Inicio',
    investigacion: 'Investigar y Estudio',
    proyectos: 'Proyectos',
    tareas: 'Tareas',
    captura: 'Entrada',
    finanzas: 'Finanzas',
    actividad: 'Actividad'
  };

  const headers = () => ({ 'Content-Type': 'application/json' });

  function toast(text, error = false) {
    message.textContent = text;
    message.className = 'status visible' + (error ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      message.className = 'status';
    }, 3600);
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function empty(target, title, detail) {
    const box = el('div', 'empty');
    box.append(el('strong', '', title), document.createTextNode(detail));
    target.append(box);
  }

  function options(id, items, blank = 'Sin proyecto') {
    const s = $(id);
    if (!s) return;
    const previous = s.value;
    s.replaceChildren();
    const first = document.createElement('option');
    first.value = '';
    first.textContent = blank;
    s.append(first);
    items.forEach(item => {
      const o = document.createElement('option');
      o.value = item.path || item;
      o.textContent = item.title || item;
      s.append(o);
    });
    if ([...s.options].some(o => o.value === previous)) {
      s.value = previous;
    }
  }

  function obsidianUri(path) {
    if (!path) return `obsidian://open?vault=${encodeURIComponent(vaultName)}`;
    return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(path)}`;
  }

  function cleanPreview(str) {
    if (!str) return '';
    return str
      .replace(/^---\s*\n[\s\S]*?\n---\s*/g, '')
      .replace(/^#+\s+.*$/gm, '')
      .replace(/\[![^\]]+\]\s*/g, '')
      .replace(/!\[.*?\](?:\(.*?\)|\[.*?\])/g, '')
      .replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/[*_`#>]/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanLink(val) {
    if (!val) return '';
    const m = String(val).match(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/);
    const target = m ? m[1] : String(val);
    return target.split('/').pop().replace(/\.md$/, '');
  }

  function decodeEntities(str) {
    if (!str) return '';
    return str
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  function dayKey(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  }

  function trustedVideo(v) {
    const title = (v.title || '').toLowerCase();
    const channel = (v.channel || '').toLowerCase();
    if (title.includes('#short') || title.includes('shorts') || title.length < 25) return false;
    const trusted = [
      'the cyber mentor', 'john hammond', 'networkchuck', 'liveoverflow',
      'securitips', 'el economista', 'bloomberg', 'harvard business review',
      'ali abdaal', 'james clear', 'andrew huberman', 'morgan housel'
    ];
    return trusted.some(name => channel.includes(name));
  }

  async function post(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'No se pudo guardar');
    return data;
  }

  // ==========================================================================
  // RELOJ EN TIEMPO REAL
  // ==========================================================================

  function updateClock() {
    const d = new Date();
    const timeStr = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const clockEl = $('#live-clock');
    if (clockEl) clockEl.textContent = timeStr;

    const dateStr = d.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    if ($('#today-date')) $('#today-date').textContent = `${dateStr} · ${timeStr}`;
    if ($('#today-label')) $('#today-label').textContent = d.toLocaleDateString('es-AR', { weekday: 'long' });
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ==========================================================================
  // RUTAS Y NAVEGACIÓN
  // ==========================================================================

  function route(name) {
    if (!routeName[name]) name = 'inicio';

    const targetView = $('#' + name);
    $$('.view').forEach(v => {
      v.classList.toggle('active', v.id === name);
    });

    $$('[data-route]').forEach(b => {
      b.classList.toggle('active', b.dataset.route === name);
    });

    const routeLabel = $('#current-route');
    if (routeLabel) routeLabel.textContent = routeName[name];

    if (location.hash.slice(1) !== name) {
      location.hash = name;
    }

    if (window.PanelFX && targetView) {
      window.PanelFX.viewEnter(targetView);
    }

    scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-route]');
    if (btn) {
      const targetRoute = btn.dataset.route;
      const sheet = $('#mobile-sheet');
      if (sheet && !sheet.hidden && window.PanelFX) {
        window.PanelFX.closeBottomSheet(sheet, () => route(targetRoute));
      } else {
        route(targetRoute);
      }
    }
  });

  addEventListener('hashchange', () => route(location.hash.slice(1)));

  // ==========================================================================
  // DRAWER UNIVERSAL: VISOR Y EDITOR DE MARKDOWN
  // ==========================================================================

  const drawer = $('#note-drawer');
  const drawerBackdrop = $('#drawer-backdrop');
  const drawerCloseBtn = $('#drawer-close');
  const drawerModeToggle = $('#drawer-mode-toggle');
  const drawerModeLabel = $('#drawer-mode-label');
  const drawerPreview = $('#drawer-preview');
  const drawerEditPane = $('#drawer-edit-pane');
  const drawerTextarea = $('#drawer-editor-textarea');
  const drawerSaveBtn = $('#drawer-save-btn');
  const drawerObsidianLink = $('#drawer-obsidian-link');
  const drawerPathBadge = $('#drawer-path');
  const drawerTitle = $('#drawer-title');

  async function openNoteDrawer(path) {
    if (!path) return;
    currentDrawerPath = path;

    drawerPathBadge.textContent = path;
    drawerTitle.textContent = path.split('/').pop().replace(/\.md$/, '');
    drawerObsidianLink.href = obsidianUri(path);

    // Reiniciar a modo lectura
    setDrawerEditMode(false);
    drawerPreview.innerHTML = '<p style="color:var(--text-muted)">Cargando contenido...</p>';

    if (window.PanelFX) {
      window.PanelFX.openDrawer(drawer);
    } else {
      drawer.hidden = false;
    }

    try {
      const r = await fetch(`/api/note?path=${encodeURIComponent(path)}`, { headers: headers() });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo leer la nota');

      drawerTextarea.value = data.content;
      renderMarkdownContent(data.content);
    } catch (e) {
      drawerPreview.innerHTML = `<p style="color:var(--danger)">Error: ${e.message}</p>`;
    }
  }

  function closeNoteDrawer() {
    if (window.PanelFX) {
      window.PanelFX.closeDrawer(drawer);
    } else {
      drawer.hidden = true;
    }
  }

  function setDrawerEditMode(editing) {
    isDrawerEditMode = editing;
    if (editing) {
      drawerPreview.hidden = true;
      drawerEditPane.hidden = false;
      drawerModeLabel.textContent = '👁️ Vista previa';
      drawerTextarea.focus();
    } else {
      drawerPreview.hidden = false;
      drawerEditPane.hidden = true;
      drawerModeLabel.textContent = '✎ Editar';
      renderMarkdownContent(drawerTextarea.value);
    }
  }

  function renderMarkdownContent(rawMarkdown) {
    if (window.marked) {
      // Reemplazar enlaces internos tipo [[Nota|Alias]] o [[Nota]]
      const processed = rawMarkdown
        .replace(/\[\[([^\|\]]+)\|([^\]]+)\]\]/g, '<span class="meta-pill link">$2</span>')
        .replace(/\[\[([^\]]+)\]\]/g, '<span class="meta-pill link">$1</span>');
      drawerPreview.innerHTML = window.marked.parse(processed);
    } else {
      drawerPreview.innerHTML = `<pre><code>${rawMarkdown}</code></pre>`;
    }
  }

  async function saveDrawerNote() {
    if (!currentDrawerPath) return;
    const content = drawerTextarea.value;
    try {
      await post('/api/note', { path: currentDrawerPath, content });
      toast('Nota guardada en disco');
      renderMarkdownContent(content);
      await show();
    } catch (e) {
      toast(e.message, true);
    }
  }

  if (drawerBackdrop) drawerBackdrop.onclick = closeNoteDrawer;
  if (drawerCloseBtn) drawerCloseBtn.onclick = closeNoteDrawer;
  if (drawerModeToggle) {
    drawerModeToggle.onclick = () => setDrawerEditMode(!isDrawerEditMode);
  }
  if (drawerSaveBtn) drawerSaveBtn.onclick = saveDrawerNote;

  // Atajos dentro del editor
  drawerTextarea.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveDrawerNote();
    }
  });

  // ==========================================================================
  // SCRATCHPAD (CAPTURA INMEDIATA EN INICIO)
  // ==========================================================================

  const scratchInput = $('#scratchpad-input');
  const scratchSaveBtn = $('#scratchpad-save');

  async function saveScratchpad() {
    const text = scratchInput.value.trim();
    if (!text) return toast('El apunte no puede estar vacío', true);

    try {
      const res = await post('/api/scratchpad', { content: text });
      scratchInput.value = '';
      toast(`Apunte guardado: ${res.title}`);
      await show();
    } catch (e) {
      toast(e.message, true);
    }
  }

  if (scratchSaveBtn) scratchSaveBtn.onclick = saveScratchpad;
  if (scratchInput) {
    scratchInput.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        saveScratchpad();
      }
    });
  }

  // ==========================================================================
  // RENDER: VISTA INICIO
  // ==========================================================================

  function renderHome(data) {
    // 1. Banner de Enfoque Activo
    if (data.study_stage) {
      const stage = data.study_stage;
      $('#focus-title').textContent = `${stage.stage} · ${stage.current_topic}`;
      $('#focus-desc').textContent = `Curso activo: ${stage.course}. Retomá tu clase desde tu último apunte de estudio.`;
      const obsidianBtn = $('#focus-open-obsidian');
      if (obsidianBtn) obsidianBtn.href = obsidianUri(stage.note_path);

      const macheteBtn = $('#focus-open-machete');
      if (macheteBtn) {
        macheteBtn.onclick = () => openNoteDrawer(stage.machete_path);
      }
    }

    // 2. Proyectos Activos (Documentos Vivos)
    const projectsContainer = $('#home-projects');
    projectsContainer.replaceChildren();

    if (!data.projects || !data.projects.length) {
      empty(projectsContainer, 'Sin proyectos activos', 'Podés formular uno directamente en la carpeta 02 Proyectos/.');
    } else {
      data.projects.slice(0, 3).forEach(p => {
        const card = el('div', 'project-card');

        const top = el('div', 'project-card-top');
        top.append(
          el('div', 'project-card-title', cleanPreview(p.title)),
          el('span', 'project-badge', cleanLink(p.area) || p.status || 'activo')
        );

        const body = el('div', 'project-card-body');
        const cleanCurrent = cleanPreview(p.current);
        if (cleanCurrent) {
          body.textContent = cleanCurrent.slice(0, 180) + (cleanCurrent.length > 180 ? '...' : '');
        } else {
          body.textContent = 'Documento de proyecto abierto para redactar y formular ideas.';
        }

        card.append(top, body);

        if (p.next_step) {
          const cleanNext = cleanPreview(p.next_step);
          const next = el('div', 'project-card-next', '↳ Próximo paso: ' + cleanNext);
          card.append(next);
        }

        const actions = el('div', 'project-card-actions');
        const openObsidian = el('a', 'action-btn primary compact', 'Escribir en Obsidian ↗');
        openObsidian.href = obsidianUri(p.path);

        const openDrawerBtn = el('button', 'action-btn secondary compact', 'Leer / Editar ✎');
        openDrawerBtn.onclick = () => openNoteDrawer(p.path);

        actions.append(openDrawerBtn, openObsidian);
        card.append(actions);
        projectsContainer.append(card);
      });
    }

    // 3. Tareas que requieren atención
    const pendingTasks = (data.tasks || []).filter(t => t.status !== 'completada');
    const names = Object.fromEntries((data.projects || []).map(p => [p.path, p.title]));
    const attention = $('#home-attention');
    attention.replaceChildren();

    if (!pendingTasks.length) {
      empty(attention, 'Sin tareas pendientes', 'No hay acciones urgentes registradas para hoy.');
    } else {
      pendingTasks.slice(0, 4).forEach(t => {
        const row = el('div', 'task-row');
        const done = el('button', 'check', '✓');
        done.setAttribute('aria-label', 'Completar ' + t.title);

        done.onclick = async () => {
          done.disabled = true;
          if (window.PanelFX) {
            window.PanelFX.taskComplete(row, async () => {
              try {
                await post('/api/task/' + encodeURIComponent(t.id) + '/complete', {});
                toast('Tarea completada');
                await show();
              } catch (e) {
                done.disabled = false;
                toast(e.message, true);
              }
            });
          }
        };

        const info = el('div', 'row-main');
        info.append(el('div', 'row-title', t.title));

        const meta = el('div', 'row-meta');
        if (t.due) meta.append(el('span', 'meta-pill', t.due));
        if (names[t.project]) meta.append(el('span', 'meta-pill', names[t.project]));
        if (t.path) {
          const link = el('span', 'meta-pill link', 'Contexto ↗');
          link.onclick = () => openNoteDrawer(t.path);
          meta.append(link);
        }

        info.append(meta);
        row.append(done, info);
        attention.append(row);
      });
    }

    // 4. Notas Trabajadas Recientemente
    const recentContainer = $('#home-recent');
    recentContainer.replaceChildren();

    if (!data.recent_notes || !data.recent_notes.length) {
      empty(recentContainer, 'Sin notas recientes', '');
    } else {
      data.recent_notes.slice(0, 5).forEach(n => {
        const row = el('div', 'recent-note-row');
        row.onclick = () => openNoteDrawer(n.path);

        const title = el('span', 'recent-note-title', n.title);
        const folder = el('span', 'recent-note-folder', n.folder);

        row.append(title, folder);
        recentContainer.append(row);
      });
    }
  }

  // ==========================================================================
  // RENDER: VISTA INVESTIGACIÓN Y ESTUDIO
  // ==========================================================================

  let currentSubtab = 'study';
  const subtabStudyBtn = $('#tab-btn-study');
  const subtabSourcesBtn = $('#tab-btn-sources');
  const subtabStudyPane = $('#subtab-study');
  const subtabSourcesPane = $('#subtab-sources');

  function switchSubtab(tab) {
    currentSubtab = tab;
    subtabStudyBtn.classList.toggle('active', tab === 'study');
    subtabSourcesBtn.classList.toggle('active', tab === 'sources');
    subtabStudyPane.classList.toggle('active', tab === 'study');
    subtabSourcesPane.classList.toggle('active', tab === 'sources');
  }

  if (subtabStudyBtn) subtabStudyBtn.onclick = () => switchSubtab('study');
  if (subtabSourcesBtn) subtabSourcesBtn.onclick = () => switchSubtab('sources');

  function renderResearch(data) {
    const studyNotes = data.study_notes || [];
    const candidates = (data.external.youtube || []).filter(trustedVideo);

    $('#study-notes-count').textContent = studyNotes.length;
    $('#sources-count').textContent = candidates.length;

    // 1. Render Notas de Estudio
    const studyGrid = $('#study-notes-grid');
    studyGrid.replaceChildren();

    const searchTerm = ($('#study-search').value || '').toLowerCase();
    const filteredStudyNotes = studyNotes.filter(
      n => n.title.toLowerCase().includes(searchTerm) || (n.preview && n.preview.toLowerCase().includes(searchTerm))
    );

    if (!filteredStudyNotes.length) {
      empty(studyGrid, 'Sin notas de estudio para esta búsqueda', 'Podés crear una nueva nota con el botón superior.');
    } else {
      filteredStudyNotes.forEach(n => {
        const card = el('div', 'study-note-card');

        const top = el('div', 'study-note-top');
        top.append(
          el('span', 'study-topic-badge', cleanLink(n.topic) || 'Conocimiento'),
          el('h3', 'study-note-title', cleanPreview(n.title))
        );

        if (n.aliases && n.aliases.length > 0) {
          const tagsBox = el('div', 'card-tags-box');
          n.aliases.forEach(a => {
            tagsBox.append(el('span', 'tag-badge', cleanPreview(a)));
          });
          top.append(tagsBox);
        }

        const previewText = cleanPreview(n.preview) || 'Documento de estudio técnico en Obsidian.';
        const preview = el('div', 'study-note-preview', previewText);

        const actions = el('div', 'study-note-actions');
        const readBtn = el('button', 'action-btn secondary compact', 'Leer / Editar ✎');
        readBtn.onclick = () => openNoteDrawer(n.path);

        const obsidianBtn = el('a', 'action-btn ghost compact', 'Obsidian ↗');
        obsidianBtn.href = obsidianUri(n.path);

        actions.append(readBtn, obsidianBtn);
        card.append(top, preview, actions);
        studyGrid.append(card);
      });
    }

    // 2. Render Fuentes Curadas
    const topics = ['Todos', ...new Set(candidates.map(v => v.topic).filter(Boolean))];
    const filters = $('#topic-filters');
    filters.replaceChildren();

    topics.forEach(topic => {
      const b = el('button', 'filter' + (topic === topicFilter ? ' active' : ''), topic);
      b.onclick = () => {
        topicFilter = topic;
        renderResearch(data);
      };
      filters.append(b);
    });

    const list = $('#youtube');
    list.replaceChildren();
    const visible = candidates.filter(v => topicFilter === 'Todos' || v.topic === topicFilter);
    const emptyBox = $('#research-empty');
    if (emptyBox) emptyBox.hidden = visible.length > 0;

    visible.forEach(v => {
      const row = el('div', 'research-row');
      const topic = el('div', 'research-topic', v.topic || 'General');
      const title = el('div', 'research-title', v.title);
      const channel = el('div', 'research-channel', v.channel || 'Canal sin identificar');

      const actions = el('div', 'research-actions');
      const link = el('a', 'action-btn ghost compact', 'Abrir fuente ↗');
      link.href = v.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      const studyNoteBtn = el('button', 'action-btn primary compact', '⚡ Crear apunte');
      studyNoteBtn.onclick = async () => {
        try {
          const res = await post('/api/study-note', {
            title: v.title,
            topic: v.topic || 'Estudio',
            url: v.url,
            channel: v.channel,
            notes: `- Apunte del video: ${v.title}\n- Conclusiones:\n`
          });
          toast(`Apunte creado: ${res.title}`);
          await show();
          openNoteDrawer(res.path);
        } catch (e) {
          toast(e.message, true);
        }
      };

      actions.append(studyNoteBtn, link);
      row.append(topic, title, channel, actions);
      list.append(row);
    });
  }

  // Búsqueda en vivo de notas de estudio
  $('#study-search').addEventListener('input', () => {
    if (cachedData) renderResearch(cachedData);
  });

  // Botón Nueva Nota de Estudio
  $('#btn-new-study-note').onclick = async () => {
    const title = prompt('Título del nuevo apunte de estudio:');
    if (!title || !title.trim()) return;
    try {
      const res = await post('/api/study-note', {
        title: title.trim(),
        topic: 'Estudio',
        url: '',
        channel: 'Personal',
        notes: '- Conceptos principales:\n- '
      });
      toast(`Apunte creado: ${res.title}`);
      await show();
      openNoteDrawer(res.path);
    } catch (e) {
      toast(e.message, true);
    }
  };

  // ==========================================================================
  // RENDER: VISTA PROYECTOS (DOCUMENTOS COMPLETOS)
  // ==========================================================================

  function renderProjects(data) {
    const container = $('#projects-full-list');
    container.replaceChildren();

    if (!data.projects || !data.projects.length) {
      empty(container, 'Sin proyectos registrados', 'Creá un proyecto creando una nota en la carpeta 02 Proyectos/.');
      return;
    }

    data.projects.forEach(p => {
      const card = el('div', 'project-full-card');

      const header = el('div', 'project-full-header');
      const titleBox = el('div', '');
      titleBox.append(el('h2', 'project-full-title', p.title));

      const badges = el('div', 'project-full-badges');
      badges.append(el('span', 'project-badge', p.status || 'activo'));
      if (p.area) badges.append(el('span', 'project-badge', p.area));
      titleBox.append(badges);

      const headerActions = el('div', '');
      const openObsidian = el('a', 'action-btn primary compact', 'Abrir en Obsidian ↗');
      openObsidian.href = obsidianUri(p.path);
      headerActions.append(openObsidian);

      header.append(titleBox, headerActions);

      const sectionsGrid = el('div', 'project-sections-grid');

      // 1. Resultado buscado
      const secResult = el('div', 'project-section-box');
      secResult.append(el('h4', '', 'Resultado buscado'));
      secResult.append(el('p', '', p.result || 'No definido en la nota.'));

      // 2. Estado actual
      const secCurrent = el('div', 'project-section-box');
      secCurrent.append(el('h4', '', 'Estado actual'));
      secCurrent.append(el('p', '', p.current || 'En curso.'));

      // 3. Próximo paso
      const secNext = el('div', 'project-section-box');
      secNext.append(el('h4', '', 'Próximo paso'));
      secNext.append(el('p', '', p.next_step || 'Sin próximo paso definido.'));

      sectionsGrid.append(secResult, secCurrent, secNext);

      const footer = el('div', 'project-full-footer');
      const notePath = el('span', '', p.path);
      notePath.style.fontSize = '11px';
      notePath.style.color = 'var(--text-muted)';
      notePath.style.fontFamily = 'var(--font-mono)';

      const editBtn = el('button', 'action-btn secondary compact', 'Editar documento completo ✎');
      editBtn.onclick = () => openNoteDrawer(p.path);

      footer.append(notePath, editBtn);
      card.append(header, sectionsGrid, footer);
      container.append(card);
    });
  }

  // ==========================================================================
  // RENDER: VISTA TAREAS
  // ==========================================================================

  function taskRow(task, names) {
    const row = el('div', 'task-row');
    const done = el('button', 'check', '✓');
    done.setAttribute('aria-label', 'Completar ' + task.title);

    done.onclick = async () => {
      done.disabled = true;
      if (window.PanelFX) {
        window.PanelFX.taskComplete(row, async () => {
          try {
            await post('/api/task/' + encodeURIComponent(task.id) + '/complete', {});
            toast('Tarea completada');
            await show();
          } catch (e) {
            done.disabled = false;
            toast(e.message, true);
          }
        });
      }
    };

    const info = el('div', 'row-main');
    info.append(el('div', 'row-title', task.title));

    const meta = el('div', 'row-meta');
    if (task.due) meta.append(el('span', 'meta-pill', task.due));
    if (names[task.project]) meta.append(el('span', 'meta-pill', names[task.project]));
    if (task.path) {
      const link = el('span', 'meta-pill link', 'Nota en Obsidian ↗');
      link.onclick = () => openNoteDrawer(task.path);
      meta.append(link);
    }

    info.append(meta);
    row.append(done, info);
    return row;
  }

  function renderTasks(data) {
    const pending = (data.tasks || []).filter(t => t.status !== 'completada');
    const names = Object.fromEntries((data.projects || []).map(p => [p.path, p.title]));

    options('#quick-project', data.projects || []);
    options('#task-project', data.projects || []);
    options('#attachment-project', data.projects || []);

    const board = $('#task-board');
    board.replaceChildren();

    const groups = [
      ['Hoy y vencidas', pending.filter(t => t.due && t.due <= dayKey())],
      ['Próximos 7 días', pending.filter(t => t.due && t.due > dayKey() && t.due <= dayKey(7))],
      ['Sin fecha o más adelante', pending.filter(t => !t.due || t.due > dayKey(7))]
    ];

    groups.forEach(([title, tasks]) => {
      const panel = el('section', 'panel');
      panel.append(el('h2', '', title));
      if (!tasks.length) {
        empty(panel, 'Sin tareas en este grupo', '');
      } else {
        tasks.forEach(task => panel.append(taskRow(task, names)));
      }
      board.append(panel);
    });
  }

  // ==========================================================================
  // RENDER: VISTA ENTRADA
  // ==========================================================================

  function renderCapture(data) {
    const target = $('#inbox-list');
    target.replaceChildren();
    if (!data.inbox || !data.inbox.length) {
      empty(target, 'Entrada al día', 'No hay notas pendientes en 01 Entrada/.');
    } else {
      data.inbox.forEach(n => {
        const row = el('div', 'task-row');
        const info = el('div', 'row-main');
        info.append(el('div', 'row-title', n.title));

        const meta = el('div', 'row-meta');
        const link = el('span', 'meta-pill link', 'Abrir nota ✎');
        link.onclick = () => openNoteDrawer(n.path);
        meta.append(link);

        info.append(meta);
        row.append(info);
        target.append(row);
      });
    }
  }

  // ==========================================================================
  // RENDER: VISTA FINANZAS
  // ==========================================================================

  function renderFinance(data) {
    const target = $('#finance');
    target.replaceChildren();
    const accounts = Object.entries(data.finance || {});
    if (!accounts.length) {
      empty(target, 'Saldos iniciales pendientes', 'Cargalos después de verificarlos directamente en la app o extracto.');
    } else {
      accounts.forEach(([name, value]) => {
        const rec = data.reconciliation ? data.reconciliation[name] : null;
        const row = el('div', 'task-row');
        const main = el('div', 'row-main');
        main.append(el('div', 'row-title', name));
        const metaText = 'ARS ' + value + (rec ? ' · conciliación ' + rec.fecha + ' (' + rec.estado + ')' : '');
        main.append(el('div', 'row-meta', metaText));
        row.append(main);
        target.append(row);
      });
    }

    const accountNames = accounts.map(([name]) => name);
    options('#movement-source', accountNames, 'Elegí cuenta origen');
    options('#movement-dest', accountNames, 'Sin destino (gasto/ingreso)');
    options('#reconcile-account', accountNames, 'Elegí cuenta');
  }

  // ==========================================================================
  // RENDER: VISTA ACTIVIDAD
  // ==========================================================================

  function renderActivity(data) {
    const status = $('#source-status');
    status.replaceChildren();
    if (!data.external_capture) {
      empty(status, 'Sin capturas externas registradas', 'Aparecerán cuando se ejecute la importación programada.');
    } else {
      const counts = Object.entries(data.external_capture.counts || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');
      let capturedFormatted = data.external_capture.captured;
      try {
        capturedFormatted = new Date(data.external_capture.captured).toLocaleString('es-AR');
      } catch (_) {}
      status.append(el('div', 'row-title', 'Última captura: ' + capturedFormatted));
      status.append(el('div', 'row-meta', counts || 'Sin elementos nuevos'));
      if (Object.keys(data.external_capture.errors || {}).length) {
        status.append(el('div', 'row-meta', 'Hay fuentes con errores para revisar.'));
      }
    }

    const gmail = $('#gmail');
    gmail.replaceChildren();
    const items = (data.external.gmail || []).slice(0, 8);
    if (!items.length) {
      empty(gmail, 'Sin correos clasificados', 'Gmail opera en solo lectura y sugiere categorías.');
    } else {
      items.forEach(m => {
        const row = el('div', 'task-row');
        const main = el('div', 'row-main');
        const link = el('a', 'row-title', m.subject || 'Sin asunto');
        link.href = 'https://mail.google.com/mail/u/0/#all/' + encodeURIComponent(m.id);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        main.append(link);
        const meta = el('div', 'row-meta', (m.categoria_sugerida || 'General') + ' · ' + (m.from || ''));
        main.append(meta);
        row.append(main);
        gmail.append(row);
      });
    }
  }

  // ==========================================================================
  // CICLO PRINCIPAL
  // ==========================================================================

  async function show() {
    const dot = $('#sync-dot');
    const syncText = $('#sync-state');

    if (window.PanelFX && dot) {
      window.PanelFX.startSyncPulse(dot);
    }

    try {
      const r = await fetch('/api/dashboard', { headers: headers() });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'No se pudo cargar el panel');

      cachedData = data;
      if (data.vault_name) vaultName = data.vault_name;

      renderHome(data);
      renderResearch(data);
      renderProjects(data);
      renderTasks(data);
      renderCapture(data);
      renderFinance(data);
      renderActivity(data);

      if (window.PanelFX && dot) {
        window.PanelFX.stopSyncPulse(dot);
      }
      if (dot) dot.className = 'sync-dot';
      if (syncText) syncText.textContent = 'Conectado';
    } catch (e) {
      if (window.PanelFX && dot) {
        window.PanelFX.stopSyncPulse(dot);
      }
      if (dot) dot.className = 'sync-dot offline';
      if (syncText) syncText.textContent = 'Sin conexión';
      toast('No se pudo conectar con el servidor local.', true);
    }
  }

  // ==========================================================================
  // FORMULARIOS ADICIONALES (TAREA, ENTRADA, FINANZAS)
  // ==========================================================================

  $('#quick-save').onclick = async () => {
    const title = $('#quick-title').value.trim();
    if (!title) return toast('Escribí una tarea', true);
    try {
      await post('/api/task', {
        title,
        due: $('#quick-due').value,
        project: $('#quick-project').value,
        priority: 'normal',
        context: $('#quick-context').value
      });
      ['#quick-title', '#quick-due', '#quick-context'].forEach(id => {
        $(id).value = '';
      });
      toast('Tarea creada');
      await show();
    } catch (e) {
      toast(e.message, true);
    }
  };

  $('#inbox').onclick = async () => {
    const title = $('#title').value.trim();
    if (!title) return toast('Escribí un título', true);
    try {
      await post('/api/inbox', {
        title,
        source: $('#source').value,
        body: $('#body').value
      });
      $('#title').value = '';
      $('#body').value = '';
      toast('Guardado en Entrada');
      await show();
    } catch (e) {
      toast(e.message, true);
    }
  };

  $('#task').onclick = async () => {
    const title = $('#title').value.trim();
    if (!title) return toast('Escribí un título', true);
    try {
      await post('/api/task', {
        title,
        due: '',
        project: $('#task-project').value,
        priority: 'normal',
        context: $('#body').value
      });
      $('#title').value = '';
      $('#body').value = '';
      toast('Tarea creada');
      await show();
    } catch (e) {
      toast(e.message, true);
    }
  };

  $('#attachment-save').onclick = async () => {
    const fileInput = $('#attachment-file');
    const file = fileInput.files[0];
    const title = $('#attachment-title').value.trim();
    if (!file || !title) return toast('Elegí un archivo y escribí un título', true);
    if (file.size > 8 * 1024 * 1024) return toast('El archivo supera los 8 MB', true);

    try {
      const encoded = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await post('/api/attachment', {
        title,
        project: $('#attachment-project').value,
        content_base64: encoded
      });

      $('#attachment-title').value = '';
      fileInput.value = '';
      toast('Original guardado en Entrada');
      await show();
    } catch (e) {
      toast(e.message, true);
    }
  };

  async function financeAction(endpoint, body, confirmationId) {
    if (!$(confirmationId).checked) {
      return toast('Confirmá que verificaste los datos reales', true);
    }
    try {
      const result = await post('/api/' + endpoint, body);
      toast(result.message || 'Registro guardado');
      await show();
    } catch (e) {
      toast(e.message, true);
    }
  }

  $('#opening-save').onclick = () =>
    financeAction(
      'opening',
      {
        cuenta: $('#opening-account').value,
        saldo: $('#opening-amount').value,
        confirmado: true
      },
      '#opening-confirm'
    );

  $('#movement-save').onclick = () =>
    financeAction(
      'movement',
      {
        tipo: $('#movement-kind').value,
        cuenta_origen: $('#movement-source').value,
        cuenta_destino: $('#movement-dest').value,
        importe: $('#movement-amount').value,
        fecha: $('#movement-date').value,
        categoria: $('#movement-category').value,
        descripcion: $('#movement-desc').value,
        confirmado: true
      },
      '#movement-confirm'
    );

  $('#reconcile-save').onclick = () =>
    financeAction(
      'reconciliation',
      {
        cuenta: $('#reconcile-account').value,
        saldo_real: $('#reconcile-amount').value,
        fecha: $('#reconcile-date').value,
        confirmado: true
      },
      '#reconcile-confirm'
    );

  // Bottom Sheet en iPhone
  const sheet = $('#mobile-sheet');
  const openSheetBtn = $('#open-more-sheet');
  const sheetBackdrop = $('#sheet-backdrop');

  if (openSheetBtn && sheet) {
    openSheetBtn.onclick = () => {
      if (window.PanelFX) {
        window.PanelFX.openBottomSheet(sheet);
      } else {
        sheet.hidden = false;
      }
    };
  }

  if (sheetBackdrop && sheet) {
    sheetBackdrop.onclick = () => {
      if (window.PanelFX) {
        window.PanelFX.closeBottomSheet(sheet);
      } else {
        sheet.hidden = true;
      }
    };
  }

  // Inicialización
  route(location.hash.slice(1) || 'inicio');
  show();
})();
