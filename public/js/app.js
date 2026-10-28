'use strict';

/**
 * ============================================================================
 *  public/js/app.js — Estado Global do Nexus Study (NotebookLM + Júlia CBRO)
 * ============================================================================
 */

const AppState = {
  cadernos: [],
  cadernoAtivo: null,
  activeTab: 'tab-chat',
  quizData: null,
  questaoIndex: 0,
  audioUrl: null
};

document.addEventListener('DOMContentLoaded', () => {

  // Mobile Sidebar Drawer Toggle
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const sidebarEl = document.querySelector('.sidebar');
  const backdropEl = document.getElementById('sidebar-backdrop');

  function fecharSidebarMobile() {
    if (sidebarEl) sidebarEl.classList.remove('mobile-open');
    if (backdropEl) backdropEl.classList.remove('active');
  }

  function toggleSidebarMobile() {
    if (sidebarEl && backdropEl) {
      const isOpen = sidebarEl.classList.toggle('mobile-open');
      if (isOpen) backdropEl.classList.add('active');
      else backdropEl.classList.remove('active');
    }
  }

  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener('click', toggleSidebarMobile);
  }
  if (backdropEl) {
    backdropEl.addEventListener('click', fecharSidebarMobile);
  }

  initTabs();
  initModalNovoCaderno();
  carregarCadernos();
  initBuscaCadernos();

    // Botão Voltar para a Galeria
    const btnVoltarGaleria = document.getElementById('btn-voltar-gallery');
    if (btnVoltarGaleria) {
      btnVoltarGaleria.addEventListener('click', () => {
        mostrarGaleriaCadernos();
      });
    }

    // Botões Waffle
    const btnWaffle = document.getElementById('btn-waffle-tools');
    if (btnWaffle) {
      btnWaffle.addEventListener('click', window.abrirModalWaffle);
    }
    const btnWaffleWs = document.getElementById('btn-waffle-workspace');
    if (btnWaffleWs) {
      btnWaffleWs.addEventListener('click', window.abrirModalWaffle);
    }

    // Busca no Topbar
    const inputBuscaTop = document.getElementById('input-busca-top');
    if (inputBuscaTop) {
      inputBuscaTop.addEventListener('input', (e) => {
        const termo = e.target.value.toLowerCase().trim();
        const filtrados = AppState.cadernos.filter(c => 
          (c.title && c.title.toLowerCase().includes(termo)) ||
          (c.id && c.id.toLowerCase().includes(termo))
        );
        renderizarGaleriaCadernos(filtrados);
        renderizarListaCadernos(filtrados);
      });
    }
  initFontesActions();
  initPesquisaWebAction();
});

/**
 * Alternância de Abas
 */
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn, .ios-tab-item');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      ativarAba(targetId);
      // Fecha sidebar drawer no mobile se estiver aberta
      const sidebarEl = document.querySelector('.sidebar');
      const backdropEl = document.getElementById('sidebar-backdrop');
      if (sidebarEl) sidebarEl.classList.remove('mobile-open');
      if (backdropEl) backdropEl.classList.remove('active');
    });
  });
}

function ativarAba(tabId) {
  AppState.activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.ios-tab-item').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('active', c.id === tabId);
  });

  if (tabId === 'tab-quiz' && AppState.cadernoAtivo) {
    if (typeof window.carregarQuizDoCaderno === 'function') {
      window.carregarQuizDoCaderno(AppState.cadernoAtivo.id);
    }
  }

  if (tabId === 'tab-mapa') {
    if (AppState.cadernoAtivo && typeof window.carregarMapaMentalDoCaderno === 'function') {
      window.carregarMapaMentalDoCaderno(AppState.cadernoAtivo.id);
    } else if (typeof window.carregarMapaMentalDoCaderno === 'function') {
      window.carregarMapaMentalDoCaderno(null);
    }
  }

  if (tabId === 'tab-srs') {
    if (typeof window.carregarFilaSRS === 'function') {
      window.carregarFilaSRS();
    }
  }

  if (tabId === 'tab-podcast' && AppState.cadernoAtivo) {
    if (typeof window.carregarAudioDoCaderno === 'function') {
      window.carregarAudioDoCaderno(AppState.cadernoAtivo.id);
    }
  }

  if (tabId === 'tab-fontes' && AppState.cadernoAtivo) {
    carregarFontes(AppState.cadernoAtivo.id);
    carregarArtefatos(AppState.cadernoAtivo.id);
  }

  if (tabId === 'tab-dashboard') {
    if (typeof window.carregarDashboard === 'function') {
      window.carregarDashboard();
    }
  }
}

/**
 * Carregar Lista de Cadernos do NotebookLM
 */
async function carregarCadernos() {
  const listEl = document.getElementById('notebooks-list');
  try {
    const res = await fetch('/api/notebooks');
    const data = await res.json();

    AppState.cadernos = data.cadernos || [];
    renderizarListaCadernos(AppState.cadernos);
      renderizarGaleriaCadernos(AppState.cadernos);

    // Atualiza contadores do topo
    if (data.estatisticas) {
      const streakEl = document.getElementById('stat-streak');
      const srsEl = document.getElementById('badge-srs');
      if (streakEl) streakEl.textContent = `${data.estatisticas.streakDias || 1} dias`;
      if (srsEl && data.estatisticas.srsPendentes !== undefined) {
        srsEl.textContent = data.estatisticas.srsPendentes;
        srsEl.style.display = data.estatisticas.srsPendentes > 0 ? 'inline-flex' : 'none';
      }
    }

    // Seleciona caderno ativo
    let ativo = null;
    if (data.cadernoAtivoId) {
      ativo = AppState.cadernos.find(c => c.id === data.cadernoAtivoId);
    }
    if (!ativo && AppState.cadernos.length > 0) {
      ativo = AppState.cadernos[0];
    }

    if (ativo) {
      selecionarCaderno(ativo);
    }
  } catch (err) {
    console.error('Erro ao buscar cadernos:', err);
    if (listEl) {
      listEl.innerHTML = '<div style="padding:16px; color:var(--accent-rose); font-size:0.85rem;">Falha ao conectar com o NotebookLM CLI.</div>';
    }
  }
}

function renderizarListaCadernos(lista) {
  const listEl = document.getElementById('notebooks-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (lista.length === 0) {
    listEl.innerHTML = '<div style="padding:16px; color:var(--text-dim); font-size:0.85rem;">Nenhum caderno encontrado. Crie um novo acima!</div>';
    return;
  }

  lista.forEach(nb => {
    const item = document.createElement('div');
    item.className = 'notebook-item';
    item.setAttribute('data-id', nb.id);
    if (AppState.cadernoAtivo && AppState.cadernoAtivo.id === nb.id) {
      item.classList.add('active');
    }

    item.innerHTML = `
      <div class="nb-icon">📓</div>
      <div class="nb-info">
        <div class="nb-title">${nb.title || 'Caderno Sem Título'}</div>
        <div class="nb-meta">${nb.sourcesCount || 0} materiais • ${nb.id.slice(0, 8)}...</div>
      </div>
    `;

    item.addEventListener('click', () => {
      selecionarCaderno(nb);
    });

    listEl.appendChild(item);
  });
}

function selecionarCaderno(nb) {
  AppState.cadernoAtivo = nb;

  // Atualiza UI da sidebar
  document.querySelectorAll('.notebook-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-id') === nb.id);
  });

  const activeTitle = document.getElementById('active-notebook-title');
  const activeSources = document.getElementById('active-notebook-sources');
  const capsuleTitle = document.getElementById('capsule-notebook-title');
  if (activeTitle) activeTitle.textContent = nb.title || 'Caderno de Estudo';
  if (activeSources) activeSources.textContent = `${nb.sourcesCount || 0} materiais ativos`;
  if (capsuleTitle) capsuleTitle.textContent = nb.title || 'Cadernos';
    mostrarWorkspaceCaderno(nb);

  // Fecha drawer no mobile
  const sidebarEl = document.querySelector('.sidebar');
  const backdropEl = document.getElementById('sidebar-backdrop');
  if (sidebarEl) sidebarEl.classList.remove('mobile-open');
  if (backdropEl) backdropEl.classList.remove('active');

  // Salva no backend
  fetch('/api/notebooks/selecionar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: nb.id })
  }).catch(() => {});

  // Atualiza imediatamente as fontes para obter a contagem exata
  carregarFontes(nb.id);
    if (typeof window.carregarStudioECaderno === "function") window.carregarStudioECaderno(nb.id);

  // Recarrega conteúdo da aba ativa
  ativarAba(AppState.activeTab);
}

/**
 * Filtro de Cadernos
 */
function initBuscaCadernos() {
  const input = document.getElementById('input-busca-cadernos');
  if (input) {
    input.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtrados = AppState.cadernos.filter(c => (c.title || '').toLowerCase().includes(q));
      renderizarListaCadernos(filtrados);
    });
  }
}

/**
 * Modal Novo Caderno
 */
function initModalNovoCaderno() {
  const btnAbrir = document.getElementById('btn-novo-caderno');
  const modal = document.getElementById('modal-novo-caderno');
  const btnFechar = document.getElementById('btn-close-modal');
  const btnCancelar = document.getElementById('btn-cancelar-modal');
  const btnConfirmar = document.getElementById('btn-confirmar-novo-caderno');
  const inputTitulo = document.getElementById('input-novo-caderno-titulo');

  if (!btnAbrir || !modal) return;

  const abrir = () => { modal.style.display = 'flex'; inputTitulo.value = ''; inputTitulo.focus(); };
  const fechar = () => { modal.style.display = 'none'; };

  btnAbrir.addEventListener('click', abrir);
  if (btnFechar) btnFechar.addEventListener('click', fechar);
  if (btnCancelar) btnCancelar.addEventListener('click', fechar);

  if (btnConfirmar) {
    btnConfirmar.addEventListener('click', async () => {
      const titulo = inputTitulo.value.trim();
      if (!titulo) return;
      btnConfirmar.textContent = 'Criando no NotebookLM...';
      btnConfirmar.disabled = true;

      try {
        await fetch('/api/notebooks/criar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titulo })
        });
        fechar();
        carregarCadernos();
      } catch (e) {
        alert('Falha ao criar caderno.');
      } finally {
        btnConfirmar.textContent = 'Criar Caderno no NotebookLM';
        btnConfirmar.disabled = false;
      }
    });
  }
}

/**
 * Carregar e Renderizar Fontes do Caderno
 */
async function carregarFontes(notebookId) {
  const container = document.getElementById('fontes-list');
  const countEl = document.getElementById('fontes-count');
  if (!container) return;

  container.innerHTML = `<span style="font-size:0.85rem; color:var(--text-dim);">Carregando fontes do NotebookLM...</span>`;

  try {
    const res = await fetch(`/api/notebooks/${notebookId}/fontes`);
    const data = await res.json();
    const fontes = data.fontes || [];

    if (countEl) countEl.textContent = fontes.length;

    // Atualiza contagem nos metadados do caderno ativo na sidebar
    if (AppState.cadernoAtivo && AppState.cadernoAtivo.id === notebookId) {
      AppState.cadernoAtivo.sourcesCount = fontes.length;
      const activeSources = document.getElementById('active-notebook-sources');
      if (activeSources) activeSources.textContent = `${fontes.length} materiais ativos`;

      const itemMeta = document.querySelector(`.notebook-item[data-id="${notebookId}"] .nb-meta`);
      if (itemMeta) {
        itemMeta.textContent = `${fontes.length} materiais • ${notebookId.slice(0, 8)}...`;
      }
    }

    if (fontes.length === 0) {
      container.innerHTML = `<div style="padding: 12px; font-size:0.88rem; color:var(--text-dim);">Nenhuma fonte adicionada ainda. Use os campos acima para adicionar um PDF, link ou pesquisa autônoma!</div>`;
      return;
    }

    container.innerHTML = '';
    fontes.forEach(f => {
      const row = document.createElement('div');
      row.className = 'artifact-row';

      let icon = '📄';
      if (f.type === 'youtube') icon = '🎥';
      else if (f.type === 'pdf') icon = '📑';
      else if (f.type === 'web_page') icon = '🌐';
      else if (f.type === 'pasted_text') icon = '📝';

      const linkHtml = f.url ? `<a href="${f.url}" target="_blank" style="color:var(--text-dim); text-decoration:none; margin-left:8px;" title="Abrir link original">🔗</a>` : '';

      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; overflow:hidden; flex:1;">
          <span style="font-size:1.2rem;">${icon}</span>
          <div style="overflow:hidden;">
            <div style="font-weight:600; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${f.title || 'Sem título'} ${linkHtml}
            </div>
            <div style="font-size:0.75rem; color:var(--text-dim); text-transform:uppercase;">
              ${f.type || 'documento'}
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="color:var(--accent-emerald); font-weight:600; font-size:0.8rem; background:rgba(16,185,129,0.1); padding:2px 8px; border-radius:10px;">
            ● Pronto
          </span>
        </div>
      `;
      container.appendChild(row);
    });
  } catch (err) {
    container.innerHTML = `<span style="font-size:0.85rem; color:var(--text-dim);">Falha ao buscar fontes do caderno.</span>`;
  }
}

/**
 * Listar Artefatos do Caderno
 */
async function carregarArtefatos(notebookId) {
  const container = document.getElementById('artifacts-list');
  if (!container) return;
  container.innerHTML = `<span style="font-size:0.85rem; color:var(--text-dim);">Carregando artefatos...</span>`;

  try {
    const res = await fetch(`/api/notebooks/${notebookId}/artefatos`);
    const data = await res.json();
    const arts = data.artefatos || [];

    if (arts.length === 0) {
      container.innerHTML = `<div style="padding:12px; font-size:0.85rem; color:var(--text-dim);">Nenhum simulado, mapa mental ou podcast gerado ainda. Use os botões acima para criar!</div>`;
      return;
    }

    container.innerHTML = '';
    arts.forEach(a => {
      const row = document.createElement('div');
      row.className = 'artifact-row';
      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="art-type-badge">${a.type || 'Artefato'}</span>
          <span style="font-weight:500;">${a.title || 'Sem título'}</span>
        </div>
        <span style="color:var(--accent-emerald); font-size:0.8rem;">● ${a.status || 'pronto'}</span>
      `;
      container.appendChild(row);
    });
  } catch (err) {
    container.innerHTML = `<span style="font-size:0.85rem; color:var(--text-dim);">Não foi possível carregar os artefatos.</span>`;
  }
}

/**
 * Ações da Aba Fontes (Adicionar Link, Upload, Gerar e Recarregar)
 */
function initFontesActions() {
  const btnRecarregar = document.getElementById('btn-recarregar-fontes');
  const btnGerarQuiz = document.getElementById('btn-gerar-quiz-fontes');
  const btnGerarAudio = document.getElementById('btn-gerar-audio-fontes');
  const btnGerarMapa = document.getElementById('btn-gerar-mapa-fontes');
  
  // Elementos de Adição de Link
  const btnAddUrl = document.getElementById('btn-add-url-fonte');
  const inputUrl = document.getElementById('input-url-fonte');
  const urlStatus = document.getElementById('url-status');

  // Elementos de Upload
  const btnTriggerUpload = document.getElementById('btn-trigger-upload');
  const fileInput = document.getElementById('file-upload-input');
  const uploadStatus = document.getElementById('upload-status');

  if (btnRecarregar) {
    btnRecarregar.addEventListener('click', () => {
      if (AppState.cadernoAtivo) carregarFontes(AppState.cadernoAtivo.id);
    });
  }

  // Adicionar Link Web / YouTube
  if (btnAddUrl && inputUrl) {
    btnAddUrl.addEventListener('click', async () => {
      const url = inputUrl.value.trim();
      if (!url) {
        alert('Por favor, informe a URL do artigo ou vídeo!');
        return;
      }
      if (!AppState.cadernoAtivo) {
        alert('Selecione um caderno primeiro!');
        return;
      }

      btnAddUrl.disabled = true;
      btnAddUrl.textContent = 'Adicionando...';
      if (urlStatus) urlStatus.textContent = 'Importando e indexando no NotebookLM...';

      try {
        const res = await fetch(`/api/notebooks/${AppState.cadernoAtivo.id}/fonte-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await res.json();
        inputUrl.value = '';
        if (urlStatus) urlStatus.textContent = '✅ Fonte adicionada com sucesso!';
        carregarFontes(AppState.cadernoAtivo.id);
      } catch (err) {
        if (urlStatus) urlStatus.textContent = 'Erro ao adicionar link.';
      } finally {
        btnAddUrl.disabled = false;
        btnAddUrl.textContent = 'Adicionar';
      }
    });
  }

  // Upload de Arquivo PDF / TXT
  if (btnTriggerUpload && fileInput) {
    btnTriggerUpload.addEventListener('click', () => {
      if (!AppState.cadernoAtivo) {
        alert('Selecione um caderno antes de enviar arquivos!');
        return;
      }
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file || !AppState.cadernoAtivo) return;

      const formData = new FormData();
      formData.append('arquivo', file);

      btnTriggerUpload.disabled = true;
      btnTriggerUpload.textContent = 'Enviando...';
      if (uploadStatus) uploadStatus.textContent = `Processando ${file.name}...`;

      try {
        const res = await fetch(`/api/notebooks/${AppState.cadernoAtivo.id}/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (uploadStatus) uploadStatus.textContent = `✅ ${file.name} adicionado com sucesso!`;
        carregarFontes(AppState.cadernoAtivo.id);
      } catch (err) {
        if (uploadStatus) uploadStatus.textContent = 'Erro no envio do arquivo.';
      } finally {
        btnTriggerUpload.disabled = false;
        btnTriggerUpload.textContent = 'Escolher Arquivo';
        fileInput.value = '';
      }
    });
  }

  // Gerar Quiz com IA Instantâneo
  if (btnGerarQuiz) {
    btnGerarQuiz.addEventListener('click', async () => {
      if (!AppState.cadernoAtivo) return;
      btnGerarQuiz.textContent = '✨ Criando Quiz...';
      btnGerarQuiz.disabled = true;
      try {
        const res = await fetch(`/api/notebooks/${AppState.cadernoAtivo.id}/quiz/gerar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        alert('✅ Novo Simulado de 5 questões gerado com sucesso pela IA! Redirecionando para a aba Simulado...');
        ativarAba('tab-quiz');
      } catch (e) {
        alert('Erro ao gerar quiz com IA.');
      } finally {
        btnGerarQuiz.textContent = '✨ Gerar Quiz';
        btnGerarQuiz.disabled = false;
      }
    });
  }

  // Gerar Podcast
  if (btnGerarAudio) {
    btnGerarAudio.addEventListener('click', async () => {
      if (!AppState.cadernoAtivo) return;
      btnGerarAudio.textContent = 'Gerando...';
      btnGerarAudio.disabled = true;
      try {
        await fetch(`/api/notebooks/${AppState.cadernoAtivo.id}/gerar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo: 'audio' })
        });
        alert('Geração de Podcast em áudio disparada no NotebookLM! Pode levar cerca de 2 minutos.');
      } catch (e) {
        alert('Erro ao disparar áudio.');
      } finally {
        btnGerarAudio.textContent = '🎙️ Gerar Podcast';
        btnGerarAudio.disabled = false;
      }
    });
  }

  // Gerar Mapa Mental com IA Instantâneo
  if (btnGerarMapa) {
    btnGerarMapa.addEventListener('click', async () => {
      if (!AppState.cadernoAtivo) return;
      btnGerarMapa.textContent = '🧠 Criando Mapa...';
      btnGerarMapa.disabled = true;
      try {
        const res = await fetch(`/api/notebooks/${AppState.cadernoAtivo.id}/mindmap/gerar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        alert('✅ Mapa Mental gerado e ramificado com sucesso pela IA! Abrindo o mapa...');
        ativarAba('tab-mapa');
      } catch (e) {
        alert('Erro ao gerar mapa mental.');
      } finally {
        btnGerarMapa.textContent = '🗺️ Gerar Mapa';
        btnGerarMapa.disabled = false;
      }
    });
  }
}

/**
 * Pesquisa Autônoma (Deep Research na Web)
 */
function initPesquisaWebAction() {
  const btnPesquisar = document.getElementById('btn-pesquisar-web-fonte');
  const inputQuery = document.getElementById('input-pesquisa-web');
  const statusEl = document.getElementById('pesquisa-web-status');

  if (btnPesquisar && inputQuery) {
    btnPesquisar.addEventListener('click', async () => {
      const q = inputQuery.value.trim();
      if (!q) {
        alert('Digite um tema para pesquisa autônoma.');
        return;
      }
      if (!AppState.cadernoAtivo) {
        alert('Selecione um caderno primeiro.');
        return;
      }

      btnPesquisar.disabled = true;
      btnPesquisar.textContent = '🔍 Pesquisando na Web...';
      if (statusEl) statusEl.textContent = 'NotebookLM consultando a internet e importando fontes automáticas...';

      try {
        const res = await fetch(`/api/notebooks/${AppState.cadernoAtivo.id}/pesquisar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q })
        });
        const data = await res.json();

        if (statusEl) statusEl.textContent = '✅ Pesquisa concluída e fontes anexadas com sucesso!';
        inputQuery.value = '';
        carregarFontes(AppState.cadernoAtivo.id);
      } catch (err) {
        if (statusEl) statusEl.textContent = 'Falha na pesquisa autônoma.';
      } finally {
        btnPesquisar.disabled = false;
        btnPesquisar.textContent = 'Pesquisar & Anexar ao Caderno';
      }
    });
  }
}


// ============================================================================
// GOOGLE NOTEBOOKLM — GALERIA & WORKSPACE NAVIGATION
// ============================================================================

function renderizarGaleriaCadernos(lista) {
  const gridEl = document.getElementById('nlm-gallery-grid');
  const countBadge = document.getElementById('gallery-count-badge');
  if (countBadge) countBadge.textContent = `${lista.length} caderno${lista.length === 1 ? '' : 's'}`;
  if (!gridEl) return;

  gridEl.innerHTML = '';

  // 1. Card Criar Novo Caderno (Google Material 3)
  const cardNew = document.createElement('div');
  cardNew.className = 'nlm-card-new-notebook';
  cardNew.innerHTML = `
    <div class="nlm-plus-circle">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </div>
    <h4>Criar novo caderno</h4>
    <p>Adicione PDFs, vídeos do YouTube, links web ou notas de estudo</p>
  `;
  cardNew.addEventListener('click', () => {
    if (typeof window.abrirModalNovoCaderno === 'function') {
      window.abrirModalNovoCaderno();
    }
  });
  gridEl.appendChild(cardNew);

  // 2. Cards dos Cadernos Existentes
  lista.forEach(nb => {
    const card = document.createElement('div');
    card.className = 'nlm-gallery-item';
    card.setAttribute('data-id', nb.id);
    if (AppState.cadernoAtivo && AppState.cadernoAtivo.id === nb.id) {
      card.classList.add('active');
    }

    const sourcesCount = nb.sourcesCount || (nb.sources ? nb.sources.length : 0);

    card.innerHTML = `
      <div class="nlm-gallery-item-top">
        <div class="nlm-gallery-folder-icon">📓</div>
        <span class="nlm-gallery-badge">${sourcesCount} fonte${sourcesCount === 1 ? '' : 's'}</span>
      </div>
      <div class="nlm-gallery-item-body">
        <h4 class="nlm-gallery-title">${nb.title || 'Caderno Sem Título'}</h4>
        <p class="nlm-gallery-meta">ID: ${nb.id.slice(0, 8)}... • Grounded AI</p>
      </div>
      <div class="nlm-gallery-item-footer">
        <span class="nlm-gallery-open-hint">Abrir no Studio →</span>
      </div>
    `;

    card.addEventListener('click', () => {
      selecionarCaderno(nb);
      mostrarWorkspaceCaderno(nb);
    });

    gridEl.appendChild(card);
  });
}

function mostrarGaleriaCadernos() {
  const galleryEl = document.getElementById('nlm-gallery-view');
  const workspaceEl = document.getElementById('nlm-workspace-view');
  const headerGallery = document.getElementById('nlm-header-gallery-brand');
  const headerWorkspace = document.getElementById('nlm-header-workspace-brand');
  const centerSearch = document.getElementById('nlm-center-search');
  const centerTitle = document.getElementById('nlm-center-workspace-title');
  const btnNovo = document.getElementById('btn-header-novo-caderno');
  const btnAddFonte = document.getElementById('btn-header-add-fonte');

  if (galleryEl) galleryEl.style.display = 'block';
  if (workspaceEl) workspaceEl.style.display = 'none';
  if (headerGallery) headerGallery.style.display = 'flex';
  if (headerWorkspace) headerWorkspace.style.display = 'none';
  if (centerSearch) centerSearch.style.display = 'flex';
  if (centerTitle) centerTitle.style.display = 'none';
  if (btnNovo) btnNovo.style.display = 'inline-flex';
  if (btnAddFonte) btnAddFonte.style.display = 'none';

  renderizarGaleriaCadernos(AppState.cadernos);
}

function mostrarWorkspaceCaderno(nb) {
  const galleryEl = document.getElementById('nlm-gallery-view');
  const workspaceEl = document.getElementById('nlm-workspace-view');
  const headerGallery = document.getElementById('nlm-header-gallery-brand');
  const headerWorkspace = document.getElementById('nlm-header-workspace-brand');
  const centerSearch = document.getElementById('nlm-center-search');
  const centerTitle = document.getElementById('nlm-center-workspace-title');
  const btnNovo = document.getElementById('btn-header-novo-caderno');
  const btnAddFonte = document.getElementById('btn-header-add-fonte');
  const capsuleTitle = document.getElementById('capsule-notebook-title');
  const headerSources = document.getElementById('header-sources-badge');

  if (galleryEl) galleryEl.style.display = 'none';
  if (workspaceEl) workspaceEl.style.display = 'grid';
  if (headerGallery) headerGallery.style.display = 'none';
  if (headerWorkspace) headerWorkspace.style.display = 'flex';
  if (centerSearch) centerSearch.style.display = 'none';
  if (centerTitle) centerTitle.style.display = 'flex';
  if (btnNovo) btnNovo.style.display = 'none';
  if (btnAddFonte) btnAddFonte.style.display = 'inline-flex';

  if (capsuleTitle) capsuleTitle.textContent = nb ? (nb.title || 'Caderno') : 'Caderno';
  const sourcesCount = nb ? (nb.sourcesCount || (nb.sources ? nb.sources.length : 0)) : 0;
  if (headerSources) headerSources.textContent = `${sourcesCount} fonte${sourcesCount === 1 ? '' : 's'}`;
}

// Modais Globais do Google NotebookLM
window.abrirModalNovoCaderno = function() {
  const modal = document.getElementById('modal-novo-caderno');
  if (modal) modal.style.display = 'flex';
  const inp = document.getElementById('input-novo-caderno-titulo');
  if (inp) { inp.value = ''; inp.focus(); }
};

window.fecharModalNovoCaderno = function() {
  const modal = document.getElementById('modal-novo-caderno');
  if (modal) modal.style.display = 'none';
};

window.abrirModalWaffle = function() {
  const modal = document.getElementById('modal-waffle-tools');
  if (modal) modal.style.display = 'flex';
};

window.fecharModalWaffle = function() {
  const modal = document.getElementById('modal-waffle-tools');
  if (modal) modal.style.display = 'none';
};

window.trocarAbaWaffle = function(tabId) {
  window.ativarAba(tabId);
  window.fecharModalWaffle();
};

window.abrirModalLandingPage = function() {
  const modal = document.getElementById('modal-nlm-landing');
  if (modal) modal.style.display = 'flex';
};

window.fecharModalLandingPage = function() {
  const modal = document.getElementById('modal-nlm-landing');
  if (modal) modal.style.display = 'none';
};

window.mostrarGaleriaCadernos = mostrarGaleriaCadernos;
window.mostrarWorkspaceCaderno = mostrarWorkspaceCaderno;
window.renderizarGaleriaCadernos = renderizarGaleriaCadernos;

window.AppState = AppState;
window.ativarAba = ativarAba;
window.selecionarCaderno = selecionarCaderno;
window.carregarFontes = carregarFontes;
window.carregarArtefatos = carregarArtefatos;
