'use strict';

/**
 * ============================================================================
 *  public/js/quiz.js - Simulado Interativo com Inteligência Artificial e SRS
 * ============================================================================
 */

const QuizState = {
  perguntas: [],
  indiceAtual: 0,
  respondida: false,
  ultimaErrada: null
};

document.addEventListener('DOMContentLoaded', () => {
  initQuiz();
});

function initQuiz() {
  const btnPrev = document.getElementById('btn-prev-question');
  const btnNext = document.getElementById('btn-next-question');
  const btnDica = document.getElementById('btn-dica-quiz');
  const btnGerarNovo = document.getElementById('btn-gerar-novo-quiz');
  const btnExplicarErro = document.getElementById('btn-explicar-erro-ia');

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (QuizState.indiceAtual > 0) {
        QuizState.indiceAtual--;
        renderizarQuestao();
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      if (QuizState.indiceAtual < QuizState.perguntas.length - 1) {
        QuizState.indiceAtual++;
        renderizarQuestao();
      }
    });
  }

  if (btnDica) {
    btnDica.addEventListener('click', () => {
      const q = QuizState.perguntas[QuizState.indiceAtual];
      if (!q) return;
      const dicaTexto = q.hint || 'Elimine opções com generalizações abusivas como "sempre" ou "nunca" e busque a alternativa que expressa a fundamentação do caderno.';
      alert(`💡 Dica Pedagógica:\n\n${dicaTexto}`);
    });
  }

  if (btnGerarNovo) {
    btnGerarNovo.addEventListener('click', async () => {
      if (!window.AppState?.cadernoAtivo) return;
      await dispararGeracaoSimuladoIA(window.AppState.cadernoAtivo.id, btnGerarNovo);
    });
  }

  // Ponte Mágica: Errou? Júlia assume o controle no chat!
  if (btnExplicarErro) {
    btnExplicarErro.addEventListener('click', () => {
      if (!QuizState.ultimaErrada) return;

      const { questao, respostaUsuario, gabarito, justificativa } = QuizState.ultimaErrada;

      if (typeof window.ativarAba === 'function') {
        window.ativarAba('tab-chat');
      }

      const promptErro = `Acabei de errar uma questão no simulado do caderno:\n\n` +
        `❓ **Pergunta:** ${questao}\n` +
        `❌ **O que eu marquei:** ${respostaUsuario}\n` +
        `✅ **Gabarito:** ${gabarito}\n` +
        `📖 **Justificativa:** ${justificativa}\n\n` +
        `Júlia, me explica onde eu me confundi usando uma analogia simples e o Método Feynman!`;

      if (typeof window.enviarMensagemParaJulia === 'function') {
        window.enviarMensagemParaJulia(promptErro);
      }
    });
  }
}

/**
 * Dispara a elaboração de Simulado diretamente pela IA (NVIDIA NIM)
 * Grounding 100% ancorado nos conteúdos reais do caderno!
 */
async function dispararGeracaoSimuladoIA(cadernoId, botaoDisparador = null) {
  const questaoEl = document.getElementById('quiz-question-text');
  const progressoEl = document.getElementById('quiz-progress-text');
  const optionsEl = document.getElementById('quiz-options-list');
  const feedbackEl = document.getElementById('quiz-feedback');

  const textoOriginalBotao = botaoDisparador ? botaoDisparador.innerHTML : '';
  if (botaoDisparador) {
    botaoDisparador.innerHTML = '✨ Elaborando com IA...';
    botaoDisparador.disabled = true;
  }

  if (questaoEl) questaoEl.textContent = '✨ A IA está lendo o conteúdo do seu caderno e elaborando 5 questões inéditas...';
  if (progressoEl) progressoEl.textContent = 'Processando com NVIDIA NIM...';
  if (feedbackEl) feedbackEl.style.display = 'none';

  if (optionsEl) {
    optionsEl.innerHTML = `
      <div style="text-align: center; padding: 32px 16px; background: rgba(255,255,255,0.03); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
        <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 8px;">
          Analisando Mapa Mental, fontes e regras de ouro do caderno...
        </p>
        <span style="display: inline-block; font-size: 0.85rem; color: var(--accent-blue);">
          ⏳ Aguarde alguns segundos enquanto as questões e justificativas são formuladas.
        </span>
      </div>
    `;
  }

  try {
    const res = await fetch(`/api/notebooks/${cadernoId}/quiz/gerar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();

    const quizObtido = data.quiz;
    if (quizObtido && Array.isArray(quizObtido.questions) && quizObtido.questions.length > 0) {
      QuizState.perguntas = quizObtido.questions;
      QuizState.indiceAtual = 0;
      renderizarQuestao();

      if (window.AppleAudio?.playTrophy) {
        window.AppleAudio.playTrophy();
      }
    } else {
      alert('Não foi possível formular questões inéditas no momento. Tente novamente.');
      carregarQuizDoCaderno(cadernoId);
    }
  } catch (err) {
    console.error('Erro ao gerar quiz com IA:', err);
    alert('Erro de conexão ao solicitar simulado à IA.');
  } finally {
    if (botaoDisparador) {
      botaoDisparador.innerHTML = textoOriginalBotao || '⚡ Gerar Novo Simulado';
      botaoDisparador.disabled = false;
    }
  }
}

async function carregarQuizDoCaderno(notebookId) {
  const questaoEl = document.getElementById('quiz-question-text');
  const progressoEl = document.getElementById('quiz-progress-text');
  const titleEl = document.getElementById('quiz-source-title');

  if (window.AppState?.cadernoAtivo) {
    titleEl.textContent = `Simulado: ${window.AppState.cadernoAtivo.title || 'Caderno'}`;
  }

  if (questaoEl) questaoEl.textContent = 'Carregando questões do caderno...';

  try {
    const res = await fetch(`/api/notebooks/${notebookId}/quiz`);
    const data = await res.json();

    const lista = data.questions || [];
    QuizState.perguntas = lista;
    QuizState.indiceAtual = 0;

    if (lista.length === 0) {
      if (questaoEl) {
        questaoEl.innerHTML = `📚 <strong>Caderno Pronto!</strong> Você já tem conteúdos cadastrados neste caderno. Clique no botão abaixo para a IA elaborar o primeiro simulado com gabarito fundamentado!`;
      }
      const optionsList = document.getElementById('quiz-options-list');
      if (optionsList) {
        optionsList.innerHTML = `
          <div style="text-align: center; padding: 24px; background: var(--bg-input); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 16px;">
              A IA vai analisar o mapa mental e os tópicos para criar questões inéditas de concurso.
            </p>
            <button id="btn-gerar-quiz-inline" class="btn-pri" style="padding: 12px 24px; font-size: 0.95rem;">
              ✨ Elaborar Simulado com IA Agora
            </button>
          </div>
        `;
        const btnInline = document.getElementById('btn-gerar-quiz-inline');
        if (btnInline) {
          btnInline.addEventListener('click', () => dispararGeracaoSimuladoIA(notebookId, btnInline));
        }
      }
      const feedbackEl = document.getElementById('quiz-feedback');
      if (feedbackEl) feedbackEl.style.display = 'none';
      if (progressoEl) progressoEl.textContent = '0 questões geradas';
      return;
    }

    renderizarQuestao();
  } catch (err) {
    console.error('Erro ao carregar quiz:', err);
    if (questaoEl) questaoEl.textContent = 'Falha ao buscar perguntas do caderno.';
  }
}

function renderizarQuestao() {
  const q = QuizState.perguntas[QuizState.indiceAtual];
  if (!q) return;

  QuizState.respondida = false;
  QuizState.ultimaErrada = null;

  const questaoEl = document.getElementById('quiz-question-text');
  const progressoEl = document.getElementById('quiz-progress-text');
  const optionsEl = document.getElementById('quiz-options-list');
  const feedbackEl = document.getElementById('quiz-feedback');
  const btnPrev = document.getElementById('btn-prev-question');
  const btnNext = document.getElementById('btn-next-question');

  if (questaoEl) questaoEl.textContent = q.question;
  if (progressoEl) progressoEl.textContent = `Questão ${QuizState.indiceAtual + 1} de ${QuizState.perguntas.length}`;
  if (feedbackEl) feedbackEl.style.display = 'none';

  if (btnPrev) btnPrev.disabled = QuizState.indiceAtual === 0;
  if (btnNext) btnNext.disabled = QuizState.indiceAtual === QuizState.perguntas.length - 1;

  if (!optionsEl) return;
  optionsEl.innerHTML = '';
  const letras = ['A', 'B', 'C', 'D', 'E'];

  (q.answerOptions || []).forEach((opt, idx) => {
    const optDiv = document.createElement('div');
    optDiv.className = 'quiz-option';
    optDiv.innerHTML = `
      <div class="opt-letter">${letras[idx] || idx + 1}</div>
      <div class="opt-text">${opt.text}</div>
    `;

    optDiv.addEventListener('click', () => {
      if (QuizState.respondida) return;
      verificarResposta(opt, optDiv, q);
    });

    optionsEl.appendChild(optDiv);
  });
}

function verificarResposta(opcaoEscolhida, elementoClicado, questaoCompleta) {
  QuizState.respondida = true;

  const options = document.querySelectorAll('.quiz-option');
  options.forEach(o => o.classList.add('answered'));

  const feedbackEl = document.getElementById('quiz-feedback');
  const badgeEl = document.getElementById('feedback-badge');
  const rationaleEl = document.getElementById('feedback-rationale');
  const btnExplicarErro = document.getElementById('btn-explicar-erro-ia');

  if (feedbackEl) feedbackEl.style.display = 'block';

  const opcaoCorreta = (questaoCompleta.answerOptions || []).find(o => o.isCorrect);

  if (opcaoEscolhida.isCorrect) {
    elementoClicado.classList.add('selected-correct');
    if (badgeEl) {
      badgeEl.textContent = '🎉 Resposta Correta!';
      badgeEl.className = 'feedback-badge correct';
    }
    if (rationaleEl) {
      rationaleEl.textContent = opcaoEscolhida.rationale || 'Você acertou o conceito fundamental!';
    }
    if (btnExplicarErro) btnExplicarErro.style.display = 'none';

    // Áudio Apple de Sucesso
    if (window.AppleAudio?.playTrophy) {
      window.AppleAudio.playTrophy();
    }

    // Registra acerto no banco
    fetch('/api/notebooks/registrar-resposta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acertou: true })
    }).catch(() => {});
  } else {
    elementoClicado.classList.add('selected-wrong');
    if (badgeEl) {
      badgeEl.textContent = '❌ Resposta Incorreta';
      badgeEl.className = 'feedback-badge wrong';
    }

    // Áudio Apple de Card Flip
    if (window.AppleAudio?.playCardFlip) {
      window.AppleAudio.playCardFlip();
    }

    // Destaca a correta
    options.forEach((o, idx) => {
      const optData = questaoCompleta.answerOptions[idx];
      if (optData && optData.isCorrect) {
        o.classList.add('highlight-correct');
      }
    });

    const gabaritoTexto = opcaoCorreta ? opcaoCorreta.text : '';
    const justificativaTexto = opcaoCorreta ? opcaoCorreta.rationale : (opcaoEscolhida.rationale || '');

    if (rationaleEl) {
      rationaleEl.innerHTML = `${opcaoEscolhida.rationale ? `<strong>Atenção:</strong> ${opcaoEscolhida.rationale}<br>` : ''}` +
        `<strong>Gabarito:</strong> ${gabaritoTexto}<br>` +
        `<span style="display: inline-block; margin-top: 8px; font-size: 0.85rem; color: var(--accent-amber);">⚡ <em>Questão adicionada automaticamente à sua fila de Flashcards SRS!</em></span>`;
    }

    QuizState.ultimaErrada = {
      questao: questaoCompleta.question,
      respostaUsuario: opcaoEscolhida.text,
      gabarito: gabaritoTexto,
      justificativa: justificativaTexto
    };

    if (btnExplicarErro) btnExplicarErro.style.display = 'inline-flex';

    // 1. Registra erro geral
    fetch('/api/notebooks/registrar-resposta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acertou: false })
    }).catch(() => {});

    // 2. REPETIÇÃO ESPAÇADA AUTOMÁTICA: Salva no SRS instantaneamente!
    fetch('/api/notebooks/srs/adicionar-erro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cadernoId: window.AppState?.cadernoAtivo?.id,
        questao: questaoCompleta.question,
        opcoes: questaoCompleta.answerOptions,
        gabarito: gabaritoTexto,
        justificativa: justificativaTexto
      })
    }).then(() => {
      if (typeof window.carregarFilaSRS === 'function') {
        window.carregarFilaSRS();
      }
    }).catch(() => {});
  }
}

window.carregarQuizDoCaderno = carregarQuizDoCaderno;
window.dispararGeracaoSimuladoIA = dispararGeracaoSimuladoIA;
