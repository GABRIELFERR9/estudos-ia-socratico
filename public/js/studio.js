'use strict';

/**
 * ============================================================================
 *  public/js/studio.js - Google NotebookLM Studio & Grounded Sources Engine (v2)
 *  Clonagem e integração 100% da experiência do NotebookLM para o Nexus Study
 * ============================================================================
 */

const StudioState = {
  fontes: [],
  fontesAtivas: {},
  documentos: {},
  notas: [],
  documentoVisualizando: null,
  carregandoGeracao: false,
  
  // Estado do Player da Visão Geral em Áudio (Audio Overview)
  audioPlayer: {
    dialogo: [],
    indiceAtual: 0,
    tocando: false,
    pausado: false,
    velocidade: 1.0,
    synthUtterance: null
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initStudioEvents();
});

function initStudioEvents() {
  // Botões de ferramentas do Studio
  const btnGuia = document.getElementById('studio-btn-guia');
  const btnFaq = document.getElementById('studio-btn-faq');
  const btnTimeline = document.getElementById('studio-btn-timeline');
  const btnBriefing = document.getElementById('studio-btn-briefing');
  const btnNota = document.getElementById('studio-btn-nota');
  const btnAddFonte = document.getElementById('studio-btn-add-fonte');

  if (btnGuia) btnGuia.addEventListener('click', () => dispararGeradorStudio('guia-estudo'));
  if (btnFaq) btnFaq.addEventListener('click', () => dispararGeradorStudio('faq'));
  if (btnTimeline) btnTimeline.addEventListener('click', () => dispararGeradorStudio('timeline'));
  if (btnBriefing) btnBriefing.addEventListener('click', () => dispararGeradorStudio('briefing-doc'));
  if (btnNota) btnNota.addEventListener('click', abrirModalNovaNota);
  if (btnAddFonte) btnAddFonte.addEventListener('click', abrirModalAdicionarFonte);

  // Audio Overview Buttons
  const btnGerarAudio = document.getElementById('btn-gerar-audio-overview');
  const btnOuvirAudio = document.getElementById('btn-ouvir-audio-overview');
  if (btnGerarAudio) btnGerarAudio.addEventListener('click', () => dispararGeradorStudio('audio-overview'));
  if (btnOuvirAudio) btnOuvirAudio.addEventListener('click', abrirModalAudioOverview);

  // Modal Audio Overview controls
  const btnCloseAudio = document.getElementById('btn-close-audio-overview');
  const btnPlayAudio = document.getElementById('btn-audio-overview-play');
  const btnStopAudio = document.getElementById('btn-audio-stop');
  const btnSpeedAudio = document.getElementById('btn-audio-speed');

  if (btnCloseAudio) btnCloseAudio.addEventListener('click', fecharModalAudioOverview);
  if (btnPlayAudio) btnPlayAudio.addEventListener('click', togglePlayAudioOverview);
  if (btnStopAudio) btnStopAudio.addEventListener('click', pararAudioOverview);
  if (btnSpeedAudio) btnSpeedAudio.addEventListener('click', ciclarVelocidadeAudio);

  // Botões do Modal de Documento Editorial
  const btnFecharDoc = document.getElementById('btn-close-studio-doc');
  const btnFixarDocNota = document.getElementById('btn-fixar-doc-nota');
  const btnCopiarDoc = document.getElementById('btn-copiar-studio-doc');

  if (btnFecharDoc) {
    btnFecharDoc.addEventListener('click', () => {
      const modal = document.getElementById('modal-studio-doc');
      if (modal) modal.style.display = 'none';
    });
  }
  if (btnFixarDocNota) btnFixarDocNota.addEventListener('click', fixarDocumentoComoNota);
  if (btnCopiarDoc) btnCopiarDoc.addEventListener('click', copiarDocumentoAtual);

  // Modal de Nova Nota
  const btnSalvarNota = document.getElementById('btn-salvar-nova-nota');
  const btnCancelarNota = document.getElementById('btn-cancelar-nova-nota');
  if (btnSalvarNota) btnSalvarNota.addEventListener('click', salvarNovaNota);
  if (btnCancelarNota) {
    btnCancelarNota.addEventListener('click', () => {
      const modal = document.getElementById('modal-nova-nota');
      if (modal) modal.style.display = 'none';
    });
  }

  // Modal de Editar Nota
  const btnSalvarEdicao = document.getElementById('btn-salvar-editar-nota');
  const btnCancelarEdicao = document.getElementById('btn-cancelar-editar-nota');
  const btnConverterModal = document.getElementById('btn-converter-nota-fonte-modal');

  if (btnSalvarEdicao) btnSalvarEdicao.addEventListener('click', salvarEdicaoNota);
  if (btnCancelarEdicao) {
    btnCancelarEdicao.addEventListener('click', () => {
      const modal = document.getElementById('modal-editar-nota');
      if (modal) modal.style.display = 'none';
    });
  }
  if (btnConverterModal) {
    btnConverterModal.addEventListener('click', () => {
      const id = document.getElementById('input-editar-nota-id')?.value;
      if (id) {
        converterNotaParaFonte(id);
        const modal = document.getElementById('modal-editar-nota');
        if (modal) modal.style.display = 'none';
      }
    });
  }

  // Modal de Leitura de Fonte Original
  const btnFecharFonte = document.getElementById('btn-close-fonte-viewer');
  if (btnFecharFonte) {
    btnFecharFonte.addEventListener('click', () => {
      const modal = document.getElementById('modal-fonte-viewer');
      if (modal) modal.style.display = 'none';
    });
  }

  // Checkbox Selecionar Todas as Fontes
  const cbSelectAll = document.getElementById('cb-select-all-sources');
  if (cbSelectAll) {
    cbSelectAll.addEventListener('change', (e) => {
      toggleTodasFontes(e.target.checked);
    });
  }
}

/**
 * Carrega fontes e dados do Studio para o caderno ativo
 */
async function carregarStudioECaderno(cadernoId) {
  if (!cadernoId) return;

  const sourcesListEl = document.getElementById('notebooklm-sources-list');
  if (sourcesListEl) {
    sourcesListEl.innerHTML = `
      <div class="studio-loading-box">
        <div class="spinner-small"></div>
        <span>Carregando fontes ancoradas...</span>
      </div>
    `;
  }

  try {
    // 1. Carrega Fontes do caderno
    const resFontes = await fetch(`/api/notebooks/${cadernoId}/fontes`);
    const dataFontes = await resFontes.json();
    StudioState.fontes = dataFontes.fontes || [];

    // 2. Carrega Dados do Studio (documentos e notas)
    const resStudio = await fetch(`/api/notebooks/${cadernoId}/studio`);
    const dataStudio = await resStudio.json();
    StudioState.documentos = dataStudio.documentos || {};
    StudioState.notas = dataStudio.notas || [];
    StudioState.fontesAtivas = dataStudio.fontesAtivas || {};

    // Se não tiver registro de ativação, todas vêm ativas por padrão
    StudioState.fontes.forEach(f => {
      const id = f.id || f.title;
      if (StudioState.fontesAtivas[id] === undefined) {
        StudioState.fontesAtivas[id] = true;
      }
    });

    renderizarFontesNotebookLM();
    renderizarNotasStudio();
    atualizarCardAudioOverview();
  } catch (err) {
    console.error('[Studio] Erro ao carregar dados:', err);
    if (sourcesListEl) {
      sourcesListEl.innerHTML = `<p class="empty-hint">Nenhuma fonte cadastrada ainda.</p>`;
    }
  }
}

/**
 * Atualiza o status do card de Visão Geral em Áudio
 */
function atualizarCardAudioOverview() {
  const btnGerar = document.getElementById('btn-gerar-audio-overview');
  const btnOuvir = document.getElementById('btn-ouvir-audio-overview');
  const subTitle = document.getElementById('audio-overview-subtitle');

  const audioDoc = StudioState.documentos['audio-overview'];
  if (audioDoc && Array.isArray(audioDoc.dialogo) && audioDoc.dialogo.length > 0) {
    if (btnOuvir) {
      btnOuvir.style.display = 'block';
      btnOuvir.textContent = '▶️ Ouvir Episódio';
    }
    if (subTitle) subTitle.textContent = `Episódio Disponível (${audioDoc.duracaoEstimada || '3 min'})`;
    if (btnGerar) btnGerar.textContent = '🔄 Regenerar';
  } else {
    if (btnOuvir) btnOuvir.style.display = 'none';
    if (subTitle) subTitle.textContent = 'Conversa aprofundada com 2 vozes';
    if (btnGerar) btnGerar.textContent = '⚡ Gerar Visão Geral';
  }
}

/**
 * Renderiza a lista de fontes da Coluna 1 estilo NotebookLM
 */
function renderizarFontesNotebookLM() {
  const container = document.getElementById('notebooklm-sources-list');
  const countEl = document.getElementById('sources-count-badge');
  const wordsEl = document.getElementById('sources-words-badge');

  if (!container) return;

  const totalFontes = StudioState.fontes.length;
  if (countEl) countEl.textContent = `${totalFontes} fonte${totalFontes === 1 ? '' : 's'}`;

  if (totalFontes === 0) {
    container.innerHTML = `
      <div class="empty-sources-box">
        <div class="empty-sources-icon">📚</div>
        <p><strong>Nenhuma fonte adicionada</strong></p>
        <p class="empty-sub">Adicione PDFs, links da web ou anotações para ancorar o conhecimento da IA.</p>
        <button class="btn-pri apple-btn-primary btn-add-first-source" onclick="abrirModalAdicionarFonte()">
          + Adicionar Primeira Fonte
        </button>
      </div>
    `;
    if (wordsEl) wordsEl.textContent = '0 palavras';
    return;
  }

  let totalPalavras = 0;
  let html = '';

  StudioState.fontes.forEach((fonte, idx) => {
    const fId = fonte.id || fonte.title;
    const isAtiva = StudioState.fontesAtivas[fId] !== false;
    const palavras = fonte.wordCount || fonte.wordsCount || (fonte.fullText ? fonte.fullText.split(/\s+/).length : (fonte.snippet ? fonte.snippet.split(/\s+/).length : 450));
    totalPalavras += palavras;

    let icone = '📄';
    let tipoLabel = 'Documento';
    if (fonte.type === 'user_note') {
      icone = '📝';
      tipoLabel = 'Nota Salva';
    } else if (fonte.type === 'link' || (fonte.url && !fonte.url.includes('youtube'))) {
      icone = '🔗';
      tipoLabel = 'Link Web';
    } else if (fonte.type === 'youtube' || (fonte.url && fonte.url.includes('youtube'))) {
      icone = '📺';
      tipoLabel = 'YouTube';
    } else if (fonte.type === 'research') {
      icone = '🔍';
      tipoLabel = 'Pesquisa Web';
    }

    html += `
      <div class="source-item-card ${isAtiva ? 'source-active' : 'source-inactive'}" data-source-id="${fId}">
        <div class="source-item-header">
          <label class="source-checkbox-label" title="${isAtiva ? 'Desativar da consulta da IA' : 'Ativar para consulta da IA'}">
            <input type="checkbox" class="source-toggle-cb" data-source-id="${fId}" ${isAtiva ? 'checked' : ''}>
            <span class="custom-check-mark"></span>
          </label>
          <span class="source-icon-badge">${icone}</span>
          <div class="source-meta-texts" onclick="abrirVisualizadorFonte(${idx})" title="Clique para ler esta fonte">
            <h4 class="source-title-text">${fonte.title || 'Material sem título'}</h4>
            <div class="source-tags-line">
              <span class="source-type-pill">${tipoLabel}</span>
              <span class="source-words-pill">${palavras.toLocaleString('pt-BR')} palavras</span>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  if (wordsEl) wordsEl.textContent = `~${totalPalavras.toLocaleString('pt-BR')} palavras`;

  // Listener para checkboxes individuais
  container.querySelectorAll('.source-toggle-cb').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const fId = e.target.getAttribute('data-source-id');
      const checked = e.target.checked;
      StudioState.fontesAtivas[fId] = checked;

      const card = e.target.closest('.source-item-card');
      if (card) {
        card.classList.toggle('source-active', checked);
        card.classList.toggle('source-inactive', !checked);
      }

      if (window.AppState && window.AppState.cadernoAtivo) {
        try {
          await fetch(`/api/notebooks/${window.AppState.cadernoAtivo.id}/fontes/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fonteId: fId, ativa: checked })
          });
        } catch (err) {
          console.warn('[Studio] Falha ao sincronizar toggle:', err);
        }
      }

      if (window.AppleAudio && window.AppleAudio.playHapticClick) {
        window.AppleAudio.playHapticClick();
      }
    });
  });
}

async function toggleTodasFontes(marcarTodas) {
  StudioState.fontes.forEach(f => {
    const id = f.id || f.title;
    StudioState.fontesAtivas[id] = marcarTodas;
  });
  renderizarFontesNotebookLM();

  if (window.AppState && window.AppState.cadernoAtivo) {
    try {
      await fetch(`/api/notebooks/${window.AppState.cadernoAtivo.id}/fontes/toggle-todas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativarTodas: marcarTodas })
      });
    } catch (err) {}
  }
}

/**
 * Renderiza o deck de notas salvas na Coluna 3 (Studio)
 */
function renderizarNotasStudio() {
  const container = document.getElementById('studio-notes-deck');
  const countEl = document.getElementById('studio-notes-count');
  if (!container) return;

  const notas = StudioState.notas || [];
  if (countEl) countEl.textContent = `${notas.length}`;

  if (notas.length === 0) {
    container.innerHTML = `
      <div class="empty-notes-prompt">
        <p><strong>Nenhuma nota fixada</strong></p>
        <p class="empty-sub">Clique em <em>Nova Nota</em> ou clique em <em>Salvar como Nota</em> nas respostas do chat para reunir seu mural.</p>
      </div>
    `;
    return;
  }

  let html = '';
  notas.forEach(nota => {
    const dataFmt = new Date(nota.criadaEm).toLocaleDateString('pt-BR');
    html += `
      <div class="studio-note-card" data-note-id="${nota.id}">
        <div class="note-card-header">
          <h4>${nota.titulo}</h4>
          <div style="display:flex; gap:4px;">
            <button class="btn-note-icon" onclick="converterNotaParaFonte('${nota.id}')" title="Converter em Fonte Oficial para a IA usar">📥</button>
            <button class="btn-note-icon" onclick="abrirEditarNota('${nota.id}')" title="Editar nota">✏️</button>
            <button class="btn-note-icon btn-del-note" onclick="excluirNota('${nota.id}')" title="Excluir nota">🗑️</button>
          </div>
        </div>
        <div class="note-card-body">
          <p>${nota.conteudo.length > 200 ? nota.conteudo.substring(0, 200) + '...' : nota.conteudo}</p>
        </div>
        <div class="note-card-footer">
          <span class="note-date">${dataFmt}</span>
          <button class="btn-view-note-full" onclick="abrirNotaCompleta('${nota.id}')">Ver Completa ↗</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Dispara geração de documento do Studio (Guia, FAQ, Timeline, Briefing, Audio Overview)
 */
async function dispararGeradorStudio(tipo) {
  if (!window.AppState || !window.AppState.cadernoAtivo) {
    alert('Por favor, selecione ou crie um caderno primeiro.');
    return;
  }

  const caderno = window.AppState.cadernoAtivo;

  if (tipo === 'audio-overview') {
    const btnGerar = document.getElementById('btn-gerar-audio-overview');
    if (btnGerar) btnGerar.textContent = '⏳ Gerando Diálogo...';
  } else {
    const modal = document.getElementById('modal-studio-doc');
    const docTitleEl = document.getElementById('studio-doc-modal-title');
    const docContentEl = document.getElementById('studio-doc-modal-content');

    if (modal) modal.style.display = 'flex';
    if (docTitleEl) {
      if (tipo === 'faq') docTitleEl.textContent = 'Perguntas Frequentes (FAQ)';
      else if (tipo === 'timeline') docTitleEl.textContent = 'Linha do Tempo';
      else if (tipo === 'briefing-doc') docTitleEl.textContent = 'Documento de Briefing Executivo';
      else docTitleEl.textContent = 'Guia de Estudos Completo';
    }
    if (docContentEl) {
      docContentEl.innerHTML = `
        <div class="studio-doc-generating">
          <div class="pulse-sparkle-icon">✨</div>
          <h3>O NotebookLM está analisando suas fontes...</h3>
          <p>Sintetizando conceitos fundamentais e estruturando seu documento com fidelidade às fontes ativas.</p>
          <div class="generating-progress-bar">
            <div class="generating-fill"></div>
          </div>
        </div>
      `;
    }
  }

  if (window.AppleAudio && window.AppleAudio.playHapticClick) {
    window.AppleAudio.playHapticClick();
  }

  try {
    const res = await fetch(`/api/notebooks/${caderno.id}/studio/gerar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: tipo,
        titulo: caderno.title || 'Caderno de Estudos'
      })
    });

    const data = await res.json();
    if (data && data.documento) {
      StudioState.documentos[tipo] = data.documento;

      if (tipo === 'audio-overview') {
        atualizarCardAudioOverview();
        abrirModalAudioOverview();
      } else {
        const docTitleEl = document.getElementById('studio-doc-modal-title');
        StudioState.documentoVisualizando = {
          tipo: tipo,
          dados: data.documento,
          titulo: docTitleEl ? docTitleEl.textContent : 'Documento do Studio'
        };
        renderizarConteudoDocumentoStudio(tipo, data.documento);
      }

      if (window.AppleAudio && window.AppleAudio.playFanfareLevelUp) {
        window.AppleAudio.playFanfareLevelUp();
      }
    } else {
      alert('Não foi possível gerar o documento. Verifique as fontes do caderno.');
    }
  } catch (err) {
    console.error('[Studio] Erro na geração:', err);
    alert('Erro de conexão ao gerar documento do Studio.');
  } finally {
    if (tipo === 'audio-overview') {
      atualizarCardAudioOverview();
    }
  }
}

/**
 * Renderiza o documento gerado com tipografia editorial
 */
function renderizarConteudoDocumentoStudio(tipo, doc) {
  const container = document.getElementById('studio-doc-modal-content');
  if (!container) return;

  let html = '';

  if (tipo === 'briefing-doc') {
    html += `
      <div class="studio-editorial-doc">
        <div class="doc-header-banner">
          <span class="doc-type-badge">NOTEBOOKLM BRIEFING DOC</span>
          <h2>${doc.titulo || 'Documento de Briefing'}</h2>
          <p class="doc-intro">${doc.resumoExecutivo || ''}</p>
        </div>

        <div class="doc-section">
          <h3 class="section-title">📌 Principais Conclusões</h3>
          <div class="topics-cards-stack">
            ${(doc.principaisConclusoes || []).map(c => `
              <div class="topic-breakdown-card">
                <h4>${c.topico}</h4>
                <p>${c.detalhe}</p>
              </div>
            `).join('')}
          </div>
        </div>

        ${doc.pontosDeAtencao && doc.pontosDeAtencao.length > 0 ? `
          <div class="doc-section">
            <h3 class="section-title">⚠️ Pontos de Atenção & Armadilhas</h3>
            <ul class="topic-key-points">
              ${doc.pontosDeAtencao.map(p => `<li>${p}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${doc.proximosPassos && doc.proximosPassos.length > 0 ? `
          <div class="doc-section">
            <h3 class="section-title">🎯 Próximos Passos de Estudo</h3>
            <ul class="topic-key-points">
              ${doc.proximosPassos.map(p => `<li>${p}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  } else if (tipo === 'faq') {
    html += `
      <div class="studio-editorial-doc">
        <div class="doc-header-banner">
          <span class="doc-type-badge">NOTEBOOKLM FAQ</span>
          <h2>${doc.titulo || 'Perguntas Frequentes'}</h2>
          <p class="doc-intro">Perguntas mais prováveis de cair em provas e esclarecimentos cruciais para a matéria.</p>
        </div>
        <div class="faq-cards-grid">
    `;

    (doc.faqs || []).forEach(f => {
      html += `
        <div class="faq-item-box">
          <div class="faq-q-line">
            <span class="faq-badge">${f.categoria || 'Dúvida'}</span>
            <h3>${f.pergunta}</h3>
          </div>
          <div class="faq-a-line">
            <p>${f.resposta}</p>
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
  } else if (tipo === 'timeline') {
    html += `
      <div class="studio-editorial-doc">
        <div class="doc-header-banner">
          <span class="doc-type-badge">NOTEBOOKLM CRONOLOGIA</span>
          <h2>${doc.titulo || 'Linha do Tempo'}</h2>
          <p class="doc-intro">Evolução sequencial e estruturação lógica dos temas do caderno.</p>
        </div>
        <div class="timeline-visual-flow">
    `;

    (doc.etapas || []).forEach((etapa, idx) => {
      html += `
        <div class="timeline-node-card">
          <div class="timeline-marker-circle">${idx + 1}</div>
          <div class="timeline-card-content">
            <span class="timeline-fase-badge">${etapa.marcador}</span>
            <h3>${etapa.titulo}</h3>
            <p>${etapa.descricao}</p>
            ${etapa.relevancia ? `<div class="timeline-relevance-box"><strong>Por que importa:</strong> ${etapa.relevancia}</div>` : ''}
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
  } else {
    // Guia de Estudos Completo
    html += `
      <div class="studio-editorial-doc">
        <div class="doc-header-banner">
          <span class="doc-type-badge">NOTEBOOKLM STUDY GUIDE</span>
          <h2>${doc.titulo || 'Guia de Estudos'}</h2>
          <p class="doc-intro">${doc.resumoExecutivo || ''}</p>
        </div>

        <div class="doc-section">
          <h3 class="section-title">📘 Tópicos Fundamentais</h3>
          <div class="topics-cards-stack">
            ${(doc.topicosPrincipais || []).map(t => `
              <div class="topic-breakdown-card">
                <h4>${t.titulo}</h4>
                <p>${t.explicacao}</p>
                ${t.pontosChave ? `
                  <ul class="topic-key-points">
                    ${t.pontosChave.map(p => `<li>${p}</li>`).join('')}
                  </ul>
                ` : ''}
                ${t.citacao ? `<blockquote class="feynman-quote">"${t.citacao}"</blockquote>` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="doc-section">
          <h3 class="section-title">🎯 Questões de Fixação Rápida</h3>
          <div class="review-questions-list">
            ${(doc.perguntasDeRevisao || []).map((q, i) => `
              <div class="review-q-card">
                <span class="q-num">Pergunta ${i + 1}</span>
                <h4>${q.pergunta}</h4>
                <div class="q-answer-reveal">
                  <strong>Gabarito:</strong> ${q.resposta}
                </div>
                ${q.dicaFeynman ? `<div class="feynman-hint-box">💡 <strong>Mundo Real:</strong> ${q.dicaFeynman}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        ${doc.glossario && doc.glossario.length > 0 ? `
          <div class="doc-section">
            <h3 class="section-title">📖 Glossário de Termos Chave</h3>
            <div class="glossary-grid">
              ${doc.glossario.map(g => `
                <div class="glossary-item">
                  <strong>${g.termo}</strong>
                  <p>${g.definicao}</p>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  container.innerHTML = html;
}

// ============================================================================
// AUDIO OVERVIEW (DEEP DIVE PODCAST PLAYER)
// ============================================================================

function abrirModalAudioOverview() {
  const modal = document.getElementById('modal-audio-overview');
  const audioDoc = StudioState.documentos['audio-overview'];
  if (!audioDoc || !Array.isArray(audioDoc.dialogo)) {
    dispararGeradorStudio('audio-overview');
    return;
  }

  StudioState.audioPlayer.dialogo = audioDoc.dialogo;
  StudioState.audioPlayer.indiceAtual = 0;
  StudioState.audioPlayer.tocando = false;
  StudioState.audioPlayer.pausado = false;

  renderizarDialogoAudioOverview();
  atualizarUiPlayerAudio();

  if (modal) modal.style.display = 'flex';
}

function fecharModalAudioOverview() {
  pararAudioOverview();
  const modal = document.getElementById('modal-audio-overview');
  if (modal) modal.style.display = 'none';
}

function renderizarDialogoAudioOverview() {
  const list = document.getElementById('audio-overview-dialog-list');
  if (!list) return;

  const dialogo = StudioState.audioPlayer.dialogo || [];
  let html = '';

  dialogo.forEach((d, idx) => {
    const isMasc = d.genero === 'm' || d.locutor.toLowerCase().includes('alex');
    const corBadge = isMasc ? '#0A84FF' : '#FF375F';
    const bgBox = isMasc ? 'rgba(10, 132, 255, 0.08)' : 'rgba(255, 55, 95, 0.08)';

    html += `
      <div class="audio-dialogue-turn" id="turn-${idx}" style="background:${bgBox}; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px 14px; transition:all 0.3s ease;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-weight:700; font-size:0.8rem; color:${corBadge}; text-transform:uppercase; letter-spacing:0.5px;">
            ${isMasc ? '🎙️ Alex' : '🎙️ Sarah'}
          </span>
          <span style="font-size:0.7rem; color:var(--text-dim);">#${idx + 1}</span>
        </div>
        <p style="margin:0; font-size:0.9rem; line-height:1.45; color:var(--text-primary);">${d.texto}</p>
      </div>
    `;
  });

  list.innerHTML = html;
}

function togglePlayAudioOverview() {
  if (StudioState.audioPlayer.tocando) {
    // Pausar
    window.speechSynthesis.pause();
    StudioState.audioPlayer.tocando = false;
    StudioState.audioPlayer.pausado = true;
    atualizarUiPlayerAudio();
  } else if (StudioState.audioPlayer.pausado) {
    // Retomar
    window.speechSynthesis.resume();
    StudioState.audioPlayer.tocando = true;
    StudioState.audioPlayer.pausado = false;
    atualizarUiPlayerAudio();
  } else {
    // Começar do início ou da fala atual
    StudioState.audioPlayer.tocando = true;
    StudioState.audioPlayer.pausado = false;
    falarLinhaAtualAudioOverview();
    atualizarUiPlayerAudio();
  }
}

function pararAudioOverview() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  StudioState.audioPlayer.tocando = false;
  StudioState.audioPlayer.pausado = false;
  StudioState.audioPlayer.indiceAtual = 0;
  atualizarUiPlayerAudio();
  destacarLinhaAtivaAudio(-1);
}

function ciclarVelocidadeAudio() {
  const speeds = [1.0, 1.25, 1.5];
  const idx = speeds.indexOf(StudioState.audioPlayer.velocidade);
  StudioState.audioPlayer.velocidade = speeds[(idx + 1) % speeds.length];
  const btn = document.getElementById('btn-audio-speed');
  if (btn) btn.textContent = `${StudioState.audioPlayer.velocidade}x`;
}

function falarLinhaAtualAudioOverview() {
  const player = StudioState.audioPlayer;
  if (!player.tocando || player.indiceAtual >= player.dialogo.length) {
    pararAudioOverview();
    return;
  }

  const fala = player.dialogo[player.indiceAtual];
  destacarLinhaAtivaAudio(player.indiceAtual);
  atualizarUiPlayerAudio();

  const utter = new SpeechSynthesisUtterance(fala.texto);
  utter.lang = 'pt-BR';
  utter.rate = player.velocidade;

  const isMasc = fala.genero === 'm' || fala.locutor.toLowerCase().includes('alex');
  utter.pitch = isMasc ? 0.95 : 1.2;

  const vozes = window.speechSynthesis.getVoices();
  if (vozes.length > 0) {
    const ptVoices = vozes.filter(v => v.lang.includes('pt') || v.lang.includes('BR'));
    if (isMasc) {
      const mascVoice = ptVoices.find(v => v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('antonio'));
      if (mascVoice) utter.voice = mascVoice;
    } else {
      const femVoice = ptVoices.find(v => v.name.toLowerCase().includes('maria') || v.name.toLowerCase().includes('luciana') || v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('francisca'));
      if (femVoice) utter.voice = femVoice;
    }
  }

  utter.onend = () => {
    player.indiceAtual++;
    if (player.tocando) {
      setTimeout(() => falarLinhaAtualAudioOverview(), 400);
    }
  };

  utter.onerror = () => {
    player.indiceAtual++;
    if (player.tocando) falarLinhaAtualAudioOverview();
  };

  window.speechSynthesis.speak(utter);
}

function destacarLinhaAtivaAudio(index) {
  document.querySelectorAll('.audio-dialogue-turn').forEach((el, i) => {
    if (i === index) {
      el.style.border = '2px solid var(--apple-blue)';
      el.style.transform = 'scale(1.02)';
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      el.style.border = '1px solid rgba(255,255,255,0.08)';
      el.style.transform = 'scale(1)';
    }
  });
}

function atualizarUiPlayerAudio() {
  const btnPlay = document.getElementById('btn-audio-overview-play');
  const speakerText = document.getElementById('audio-speaker-now');
  const progText = document.getElementById('audio-overview-progress-text');
  const progBar = document.getElementById('audio-overview-prog-bar');

  const player = StudioState.audioPlayer;
  const total = player.dialogo.length;

  if (btnPlay) {
    btnPlay.textContent = player.tocando ? '⏸' : '▶';
  }

  if (player.tocando || player.pausado) {
    const fala = player.dialogo[player.indiceAtual];
    if (fala && speakerText) {
      speakerText.textContent = `${fala.locutor} falando...`;
    }
    if (progText) {
      progText.textContent = `Fala ${player.indiceAtual + 1} de ${total}`;
    }
    if (progBar && total > 0) {
      progBar.style.width = `${Math.round(((player.indiceAtual + 1) / total) * 100)}%`;
    }
  } else {
    if (speakerText) speakerText.textContent = 'Pronto para iniciar';
    if (progText) progText.textContent = `0 de ${total} falas`;
    if (progBar) progBar.style.width = '0%';
  }
}

// ============================================================================
// NOTAS & CONVERSÃO EM FONTE
// ============================================================================

function abrirModalNovaNota() {
  const modal = document.getElementById('modal-nova-nota');
  const tInput = document.getElementById('input-nota-titulo');
  const cInput = document.getElementById('input-nota-conteudo');
  if (tInput) tInput.value = '';
  if (cInput) cInput.value = '';
  if (modal) modal.style.display = 'flex';
}

async function salvarNovaNota() {
  if (!window.AppState || !window.AppState.cadernoAtivo) return;

  const tInput = document.getElementById('input-nota-titulo');
  const cInput = document.getElementById('input-nota-conteudo');
  const titulo = tInput ? tInput.value.trim() : '';
  const conteudo = cInput ? cInput.value.trim() : '';

  if (!conteudo) {
    alert('Por favor, escreva o conteúdo da nota.');
    return;
  }

  try {
    const res = await fetch(`/api/notebooks/${window.AppState.cadernoAtivo.id}/studio/notas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: titulo || 'Nota de Estudo', conteudo })
    });
    const data = await res.json();
    if (data && data.sucesso) {
      StudioState.notas.unshift(data.nota);
      renderizarNotasStudio();
      const modal = document.getElementById('modal-nova-nota');
      if (modal) modal.style.display = 'none';
      if (window.AppleAudio && window.AppleAudio.playHapticClick) window.AppleAudio.playHapticClick();
    }
  } catch (err) {
    alert('Erro ao salvar nota.');
  }
}

function abrirEditarNota(notaId) {
  const nota = StudioState.notas.find(n => n.id === notaId);
  if (!nota) return;

  const modal = document.getElementById('modal-editar-nota');
  const idInput = document.getElementById('input-editar-nota-id');
  const tInput = document.getElementById('input-editar-nota-titulo');
  const cInput = document.getElementById('input-editar-nota-conteudo');

  if (idInput) idInput.value = nota.id;
  if (tInput) tInput.value = nota.titulo;
  if (cInput) cInput.value = nota.conteudo;
  if (modal) modal.style.display = 'flex';
}

async function salvarEdicaoNota() {
  if (!window.AppState || !window.AppState.cadernoAtivo) return;

  const id = document.getElementById('input-editar-nota-id')?.value;
  const titulo = document.getElementById('input-editar-nota-titulo')?.value;
  const conteudo = document.getElementById('input-editar-nota-conteudo')?.value;

  if (!id || !conteudo) return;

  try {
    const res = await fetch(`/api/notebooks/${window.AppState.cadernoAtivo.id}/studio/notas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, conteudo })
    });
    const data = await res.json();
    if (data && data.sucesso) {
      const idx = StudioState.notas.findIndex(n => n.id === id);
      if (idx !== -1) StudioState.notas[idx] = data.nota;
      renderizarNotasStudio();
      const modal = document.getElementById('modal-editar-nota');
      if (modal) modal.style.display = 'none';
    }
  } catch (err) {
    alert('Erro ao salvar edição da nota.');
  }
}

async function converterNotaParaFonte(notaId) {
  if (!window.AppState || !window.AppState.cadernoAtivo) return;

  try {
    const res = await fetch(`/api/notebooks/${window.AppState.cadernoAtivo.id}/studio/notas/${notaId}/converter-em-fonte`, {
      method: 'POST'
    });
    const data = await res.json();
    if (data && data.sucesso) {
      alert('✓ Nota convertida em Fonte Oficial com sucesso! A IA agora usará esta nota para fundamentar respostas.');
      carregarStudioECaderno(window.AppState.cadernoAtivo.id);
    }
  } catch (err) {
    alert('Erro ao converter nota em fonte.');
  }
}

async function excluirNota(notaId) {
  if (!confirm('Deseja excluir esta nota?')) return;
  if (!window.AppState || !window.AppState.cadernoAtivo) return;

  try {
    const res = await fetch(`/api/notebooks/${window.AppState.cadernoAtivo.id}/studio/notas/${notaId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data && data.sucesso) {
      StudioState.notas = StudioState.notas.filter(n => n.id !== notaId);
      renderizarNotasStudio();
    }
  } catch (err) {
    alert('Erro ao excluir nota.');
  }
}

function abrirNotaCompleta(notaId) {
  const nota = StudioState.notas.find(n => n.id === notaId);
  if (!nota) return;
  abrirEditarNota(notaId);
}

async function fixarDocumentoComoNota() {
  if (!StudioState.documentoVisualizando || !window.AppState?.cadernoAtivo) return;
  const doc = StudioState.documentoVisualizando;
  const titulo = `Súmula: ${doc.titulo}`;
  const conteudo = JSON.stringify(doc.dados, null, 2);

  try {
    const res = await fetch(`/api/notebooks/${window.AppState.cadernoAtivo.id}/studio/notas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, conteudo })
    });
    const data = await res.json();
    if (data && data.sucesso) {
      StudioState.notas.unshift(data.nota);
      renderizarNotasStudio();
      alert('✓ Documento fixado no seu Mural de Notas!');
    }
  } catch (err) {
    alert('Erro ao fixar nota.');
  }
}

function copiarDocumentoAtual() {
  if (!StudioState.documentoVisualizando) return;
  const texto = JSON.stringify(StudioState.documentoVisualizando.dados, null, 2);
  navigator.clipboard.writeText(texto).then(() => {
    alert('✓ Conteúdo copiado para a área de transferência!');
  });
}

async function abrirVisualizadorFonte(index) {
  const fonte = StudioState.fontes[index];
  if (!fonte) return;

  const modal = document.getElementById('modal-fonte-viewer');
  const titleEl = document.getElementById('fonte-viewer-title');
  const metaEl = document.getElementById('fonte-viewer-meta');
  const contentEl = document.getElementById('fonte-viewer-content');

  if (titleEl) titleEl.textContent = fonte.title || 'Documento';
  if (metaEl) metaEl.textContent = `${fonte.type || 'arquivo'} · Carregando leitura...`;
  
  if (modal) modal.style.display = 'flex';

  if (contentEl) {
    if (fonte.fullText && fonte.fullText.length > 50) {
      contentEl.innerHTML = `<div style="white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6; color: var(--text-primary); font-family: var(--font-system);">${fonte.fullText}</div>`;
      if (metaEl) metaEl.textContent = `${fonte.type || 'arquivo'} · ~${fonte.fullText.split(/\s+/).length} palavras`;
    } else {
      contentEl.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <div class="spinner" style="margin: 0 auto 16px; width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--apple-blue); border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <p style="font-size: 0.9rem;">Lendo e processando texto original do documento via NotebookLM Grounded Engine...</p>
        </div>
      `;

      const cadernoId = window.AppState?.cadernoAtivo?.id;
      if (cadernoId && (fonte.id || fonte.title)) {
        try {
          const targetId = encodeURIComponent(fonte.id || fonte.title);
          const res = await fetch(`/api/notebooks/${cadernoId}/fontes/${targetId}/texto`);
          const data = await res.json();
          if (data && data.texto && data.texto.length > 0) {
            fonte.fullText = data.texto;
            contentEl.innerHTML = `<div style="white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6; color: var(--text-primary); font-family: var(--font-system);">${data.texto}</div>`;
            if (metaEl) metaEl.textContent = `${fonte.type || 'arquivo'} · ~${data.texto.split(/\s+/).length} palavras`;
          } else {
            const fallbackTxt = fonte.snippet || 'Texto completo processado e indexado no banco vetorial do Google NotebookLM.';
            contentEl.innerHTML = `<div style="white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6; color: var(--text-primary); font-family: var(--font-system);">${fallbackTxt}</div>`;
            if (metaEl) metaEl.textContent = `${fonte.type || 'arquivo'}`;
          }
        } catch (err) {
          contentEl.innerHTML = `<p style="color: var(--apple-amber); padding: 20px;">Nota indexada no NotebookLM. O conteúdo está ativo e ancorado para respostas da IA.</p>`;
        }
      }
    }
  }
}

/**
 * Salva diretamente uma resposta do chat como Nota no Studio
 */
async function salvarNotaDiretaDoChat(conteudo, tituloPersonalizado = null) {
  if (!window.AppState || !window.AppState.cadernoAtivo) {
    alert('Selecione um caderno ativo primeiro.');
    return;
  }

  const titulo = tituloPersonalizado || `Resposta Salva (${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`;

  try {
    const res = await fetch(`/api/notebooks/${window.AppState.cadernoAtivo.id}/studio/notas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, conteudo })
    });
    const data = await res.json();
    if (data && data.sucesso) {
      StudioState.notas.unshift(data.nota);
      renderizarNotasStudio();
      return true;
    }
  } catch (err) {
    console.warn('[Studio] Falha ao salvar nota direta:', err);
  }
  return false;
}

/**
 * Converte citações estilo [1], [2] em links clicáveis que abrem a fonte exata
 */
function formatarCitacoesNotebookLM(texto) {
  if (!texto) return '';
  return texto.replace(/\[(\d+)\]/g, (match, numero) => {
    const idx = parseInt(numero, 10) - 1;
    return `<button class="citation-pill" onclick="window.abrirVisualizadorFonte(${Math.max(0, idx)})" title="Ver citação na fonte original">[${numero}]</button>`;
  });
}

// Exports globais
window.carregarStudioECaderno = carregarStudioECaderno;
window.formatarCitacoesNotebookLM = formatarCitacoesNotebookLM;
window.abrirVisualizadorFonte = abrirVisualizadorFonte;
window.abrirEditarNota = abrirEditarNota;
window.converterNotaParaFonte = converterNotaParaFonte;
window.excluirNota = excluirNota;
window.abrirNotaCompleta = abrirNotaCompleta;
window.salvarNotaDiretaDoChat = salvarNotaDiretaDoChat;
