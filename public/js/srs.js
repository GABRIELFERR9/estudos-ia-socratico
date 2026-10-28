'use strict';

/**
 * ============================================================================
 *  public/js/srs.js — Repetição Espaçada Automática (SRS / Anki de Erros SM-2)
 * ============================================================================
 */

const SRSState = {
  fila: [],
  todosCards: [],
  indiceAtual: 0,
  cardVirado: false
};

document.addEventListener('DOMContentLoaded', () => {
  initSRS();
});

function initSRS() {
  const cardElement = document.getElementById('srs-card-box') || document.getElementById('srs-flashcard');
  const btnFlip = document.getElementById('btn-flip-srs') || document.getElementById('btn-srs-flip');

  if (cardElement) {
    cardElement.addEventListener('click', (e) => {
      // Evita virar se clicou num botão dentro do card
      if (e.target.closest('button')) return;
      toggleFlipCard();
    });
  }

  if (btnFlip) {
    btnFlip.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFlipCard();
    });
  }

  // Botões de avaliação de qualidade (Errei, Difícil, Bom, Fácil)
  const actionBtns = document.querySelectorAll('.srs-actions-buttons button, .srs-btn');
  actionBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const qual = parseInt(btn.getAttribute('data-quality') || '3', 10);
      responderCard(qual);
    });
  });

  const btnManual = document.getElementById('btn-novo-card-manual');
  if (btnManual) {
    btnManual.addEventListener('click', () => {
      const q = prompt('Digite a pergunta ou conceito que você deseja memorizar:');
      if (!q) return;
      const resp = prompt('Digite a resposta ou gabarito correto:');
      if (!resp) return;

      adicionarCardManual(q, resp);
    });
  }

  // Atalhos de Teclado
  window.addEventListener('keydown', (e) => {
    const srsTab = document.getElementById('tab-srs');
    if (!srsTab || !srsTab.classList.contains('active')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
      e.preventDefault();
      toggleFlipCard();
    } else if (e.key === '1' && SRSState.cardVirado) {
      responderCard(1);
    } else if (e.key === '2' && SRSState.cardVirado) {
      responderCard(2);
    } else if (e.key === '3' && SRSState.cardVirado) {
      responderCard(4);
    } else if (e.key === '4' && SRSState.cardVirado) {
      responderCard(5);
    }
  });

  carregarFilaSRS();
}

function toggleFlipCard() {
  const cardElement = document.getElementById('srs-card-box') || document.getElementById('srs-flashcard');
  SRSState.cardVirado = !SRSState.cardVirado;

  if (cardElement) {
    cardElement.classList.toggle('flipped', SRSState.cardVirado);
  }
}

async function carregarFilaSRS() {
  const badge = document.getElementById('badge-srs');
  const frontText = document.getElementById('srs-front-text') || document.getElementById('srs-question-text');
  const totalCountEl = document.getElementById('srs-total-count');

  try {
    const cadernoId = window.AppState?.cadernoAtivo?.id || null;
    const url = cadernoId ? `/api/notebooks/srs/fila?cadernoId=${cadernoId}` : '/api/notebooks/srs/fila';
    const res = await fetch(url);
    const data = await res.json();

    SRSState.fila = data.pendentes || [];
    SRSState.todosCards = data.todosCards || data.pendentes || [];
    SRSState.indiceAtual = 0;
    SRSState.cardVirado = false;

    if (badge) {
      badge.textContent = SRSState.fila.length;
      badge.style.display = SRSState.fila.length > 0 ? 'inline-flex' : 'none';
    }

    if (totalCountEl) {
      totalCountEl.textContent = data.totalCards !== undefined ? data.totalCards : SRSState.fila.length;
    }

    renderizarTabelaCards(data.todosCards || SRSState.fila);

    if (SRSState.fila.length === 0) {
      if (frontText) {
        frontText.innerHTML = `
          <div style="text-align:center; padding:16px 0;">
            <div style="font-size:2rem; margin-bottom:8px;">🎉</div>
            <div style="font-weight:700; font-size:1.05rem; margin-bottom:6px;">Nenhum card pendente para hoje!</div>
            <div style="font-size:0.85rem; color:rgba(255,255,255,0.6); max-width:320px; margin:0 auto;">
              Você está em dia com a repetição espaçada. Quando errar questões no Simulado, novos flashcards serão criados automaticamente!
            </div>
          </div>
        `;
      }
      return;
    }

    renderizarCardAtual();
  } catch (err) {
    console.error('Erro ao buscar fila SRS:', err);
    if (frontText) {
      frontText.textContent = 'Nenhum flashcard registrado ainda.';
    }
  }
}

function renderizarCardAtual() {
  const card = SRSState.fila[SRSState.indiceAtual];
  if (!card) {
    carregarFilaSRS();
    return;
  }

  SRSState.cardVirado = false;
  const cardEl = document.getElementById('srs-card-box') || document.getElementById('srs-flashcard');
  if (cardEl) cardEl.classList.remove('flipped');

  // Frente
  const frontText = document.getElementById('srs-front-text') || document.getElementById('srs-question-text');
  if (frontText) {
    frontText.textContent = card.questao;
  }

  // Verso
  const backText = document.getElementById('srs-back-text') || document.getElementById('srs-answer-text');
  const backExp = document.getElementById('srs-back-exp') || document.getElementById('srs-justificativa-text');

  if (backText) {
    backText.textContent = `Gabarito: ${card.gabarito}`;
  }
  if (backExp) {
    backExp.textContent = card.justificativa || card.explicacaoIA || 'Foco na retenção ativa deste conceito.';
  }
}

async function responderCard(qualidade) {
  const card = SRSState.fila[SRSState.indiceAtual];
  if (!card) return;

  if (qualidade >= 3) {
    if (window.AppleAudio) window.AppleAudio.playCorrect();
    if (window.GameEngine) window.GameEngine.registrarAcao('srs_revisao');
  } else {
    if (window.AppleAudio) window.AppleAudio.playWrong();
  }

  try {
    await fetch('/api/notebooks/srs/responder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardId: card.id,
        qualidade
      })
    });

    SRSState.indiceAtual++;
    if (SRSState.indiceAtual < SRSState.fila.length) {
      renderizarCardAtual();
    } else {
      carregarFilaSRS();
    }
  } catch (err) {
    console.error('Erro ao responder card:', err);
  }
}

async function adicionarCardManual(questao, gabarito) {
  try {
    await fetch('/api/notebooks/srs/adicionar-erro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questao,
        gabarito,
        justificativa: 'Criado manualmente pelo estudante',
        cadernoId: window.AppState?.cadernoAtivo?.id || null
      })
    });
    alert('✅ Flashcard adicionado com sucesso!');
    carregarFilaSRS();
  } catch (e) {
    alert('Erro ao salvar flashcard.');
  }
}

function renderizarTabelaCards(cards) {
  const tbody = document.getElementById('srs-cards-tbody');
  if (!tbody) return;

  if (!cards || cards.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:18px; color:rgba(255,255,255,0.45);">Nenhum flashcard registrado ainda. Erre questões no simulado para preencher sua coleção!</td></tr>`;
    return;
  }

  tbody.innerHTML = cards.map(c => {
    const qCurta = c.questao && c.questao.length > 50 ? c.questao.slice(0, 48) + '...' : (c.questao || 'Conceito');
    const prox = c.proximaRevisao ? new Date(c.proximaRevisao).toLocaleDateString('pt-BR') : 'Hoje';
    return `
      <tr>
        <td style="font-weight:500;">${qCurta}</td>
        <td><span style="color:var(--apple-green); font-weight:700;">${c.gabarito || 'OK'}</span></td>
        <td style="color:rgba(255,255,255,0.6);">${c.intervaloDias || 1}d</td>
        <td style="color:var(--apple-blue);">${prox}</td>
      </tr>
    `;
  }).join('');
}

window.carregarFilaSRS = carregarFilaSRS;
