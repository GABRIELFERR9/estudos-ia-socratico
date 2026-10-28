'use strict';

/**
 * ============================================================================
 *  public/js/chat.js — Google NotebookLM Grounded Chat Engine + Citações
 * ============================================================================
 */

const ChatState = {
  historico: [],
  gravandoVoz: false,
  recognition: null,
  audioElemento: null,
  btnTocandoAtual: null,
  vozAtual: 'pt-BR-FranciscaNeural' // Voz padrão humana ultra-realista
};

document.addEventListener('DOMContentLoaded', () => {
  initChatInput();
  initQuickChips();
  initVozMicrofone();
});

function initChatInput() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');

  const enviar = () => {
    const texto = input.value.trim();
    if (!texto) return;
    input.value = '';
    enviarMensagemParaZelda(texto);
  };

  if (sendBtn) sendBtn.addEventListener('click', enviar);

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviar();
      }
    });
  }
}

function initQuickChips() {
  const chips = document.querySelectorAll('.cmd-pill, .chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const cmd = chip.getAttribute('data-cmd') || chip.textContent.trim();
      const input = document.getElementById('chat-input');
      if (cmd.startsWith('/feynman')) {
        input.value = '/feynman ';
        input.focus();
      } else {
        enviarMensagemParaZelda(cmd);
      }
    });
  });

  // Prompt Starter Chips do NotebookLM
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt') || chip.textContent.trim();
      const input = document.getElementById('chat-input');
      if (input) input.value = prompt;
      enviarMensagemParaZelda(prompt);
    });
  });
}

/**
 * Modo Oral / Microfone com Web Speech API
 */
function initVozMicrofone() {
  const btnMic = document.getElementById('btn-mic-chat');
  const input = document.getElementById('chat-input');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (btnMic) {
      btnMic.title = 'Reconhecimento de voz não suportado neste navegador';
      btnMic.style.opacity = '0.5';
    }
    return;
  }

  const rec = new SpeechRecognition();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = 'pt-BR';

  rec.onstart = () => {
    ChatState.gravandoVoz = true;
    if (btnMic) {
      btnMic.classList.add('recording');
      btnMic.style.color = 'var(--apple-red)';
      btnMic.title = 'Gravando sua voz... Fale sua dúvida!';
    }
    if (input) input.placeholder = '🎙️ Ouvindo... Pode falar sua dúvida!';
  };

  rec.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        input.value = event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
        input.value = interimTranscript;
      }
    }
  };

  rec.onerror = (event) => {
    console.warn('[WebSpeech API] Erro:', event.error);
    encerrarGravacao();
  };

  rec.onend = () => {
    encerrarGravacao();
    if (input && input.value.trim()) {
      input.focus();
    }
  };

  function encerrarGravacao() {
    ChatState.gravandoVoz = false;
    if (btnMic) {
      btnMic.classList.remove('recording');
      btnMic.style.color = '';
      btnMic.title = 'Falar por microfone (Método Oral)';
    }
    if (input) input.placeholder = 'Pergunte qualquer coisa sobre o caderno ou use /feynman...';
  }

  if (btnMic) {
    btnMic.addEventListener('click', () => {
      if (ChatState.gravandoVoz) {
        rec.stop();
      } else {
        try {
          rec.start();
        } catch (e) {
          rec.stop();
        }
      }
    });
  }

  ChatState.recognition = rec;
}

/**
 * Síntese de Voz Ultra-Realista da Zelda (Edge-TTS Neural)
 */
async function narrarTexto(texto, btnElement = null) {
  // Se já estiver tocando este mesmo áudio, para
  if (ChatState.audioElemento && !ChatState.audioElemento.paused) {
    ChatState.audioElemento.pause();
    ChatState.audioElemento.currentTime = 0;
    if (ChatState.btnTocandoAtual) {
      ChatState.btnTocandoAtual.innerHTML = '🔊 Ouvir';
    }
    if (ChatState.btnTocandoAtual === btnElement) {
      ChatState.btnTocandoAtual = null;
      return;
    }
  }

  // Cancela SpeechSynthesis nativo se estiver falando
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }

  if (btnElement) {
    btnElement.innerHTML = '⏳ Gerando voz...';
    ChatState.btnTocandoAtual = btnElement;
  }

  try {
    // 1. Tenta sintetizar com a voz neural da Zelda no backend (Francisca Neural)
    const res = await fetch('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texto: texto,
        voz: ChatState.vozAtual
      })
    });

    const data = await res.json();
    if (data && data.audioUrl) {
      const audio = new Audio(data.audioUrl);
      ChatState.audioElemento = audio;

      audio.onplay = () => {
        if (btnElement) btnElement.innerHTML = '⏹️ Parar Voz';
      };

      audio.onended = () => {
        if (btnElement) btnElement.innerHTML = '🔊 Ouvir';
        ChatState.btnTocandoAtual = null;
      };

      audio.onerror = () => {
        fallbackNativoTTS(texto, btnElement);
      };

      await audio.play();
      return;
    }
  } catch (err) {
    console.warn('[Voz Zelda] Falha na voz neural, acionando fallback local:', err);
  }

  // Fallback nativo no navegador com as melhores vozes em pt-BR
  fallbackNativoTTS(texto, btnElement);
}

function fallbackNativoTTS(texto, btnElement) {
  if (!('speechSynthesis' in window)) {
    if (btnElement) btnElement.innerHTML = '🔊 Ouvir';
    return;
  }

  const limpo = texto
    .replace(/[\*_#`~>]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\[.*?\]/g, '');

  const utter = new SpeechSynthesisUtterance(limpo);
  utter.lang = 'pt-BR';
  utter.rate = 1.0;
  utter.pitch = 1.05;

  const vozes = window.speechSynthesis.getVoices();
  // Prioriza vozes femininas e naturais
  const melhorVoz = vozes.find(v => (v.lang.includes('pt') || v.lang.includes('BR')) && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Luciana') || v.name.includes('Francisca')))
    || vozes.find(v => v.lang.includes('pt') || v.lang.includes('BR'));

  if (melhorVoz) utter.voice = melhorVoz;

  utter.onstart = () => {
    if (btnElement) btnElement.innerHTML = '⏹️ Parar';
  };
  utter.onend = () => {
    if (btnElement) btnElement.innerHTML = '🔊 Ouvir';
  };
  utter.onerror = () => {
    if (btnElement) btnElement.innerHTML = '🔊 Ouvir';
  };

  window.speechSynthesis.speak(utter);
}

async function enviarMensagemParaZelda(texto) {
  const container = document.getElementById('chat-messages');

  adicionarBolha(texto, 'user');
  ChatState.historico.push({ papel: 'user', texto });

  const idDigitando = 'msg-typing-' + Date.now();
  const digitandoEl = document.createElement('div');
  digitandoEl.className = 'message msg-assistant nlm-msg nlm-loading-msg';
  digitandoEl.id = idDigitando;
  digitandoEl.innerHTML = `
    <div class="msg-avatar nlm-gemini-avatar">✨</div>
    <div class="msg-content nlm-loading-box">
      <div class="nlm-thinking-row">
        <span class="nlm-sparkle-icon">✨</span>
        <span class="nlm-thinking-label">Consultando fontes e sintetizando resposta...</span>
      </div>
    </div>
  `;
  container.appendChild(digitandoEl);
  container.scrollTop = container.scrollHeight;

  if (window.AppleAudio && window.AppleAudio.playPS1Cursor) {
    window.AppleAudio.playPS1Cursor();
  }

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensagem: texto,
        historico: ChatState.historico,
        cadernoId: window.AppState?.cadernoAtivo?.id || null
      })
    });

    const data = await res.json();
    digitandoEl.remove();

    if (data && data.texto) {
      if (window.AppleAudio && window.AppleAudio.playPS1Confirm) {
        window.AppleAudio.playPS1Confirm();
      }
      adicionarBolha(data.texto, 'assistant', data.motor);
      ChatState.historico.push({ papel: 'model', texto: data.texto });
    } else {
      adicionarBolha('Não foi possível gerar a resposta no momento. Por favor, tente novamente.', 'assistant');
    }
  } catch (err) {
    digitandoEl.remove();
    adicionarBolha('Erro de conexão com o servidor. Tente novamente.', 'assistant');
  }
}

function formatarMarkdown(texto) {
  let html = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/\x60(.*?)\x60/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-family:var(--font-mono); font-size:0.85em;">$1</code>');
  html = html.replace(/^\s*•\s*(.*)$/gm, '<li style="margin-left:18px;">$1</li>');
  html = html.replace(/^\s*-\s*(.*)$/gm, '<li style="margin-left:18px;">$1</li>');
  html = html.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');

  if (window.formatarCitacoesNotebookLM) {
    html = window.formatarCitacoesNotebookLM(html);
  }

  return html;
}

function adicionarBolha(texto, tipo, motor = null) {
  const container = document.getElementById('chat-messages');
  const msgEl = document.createElement('div');
  msgEl.className = tipo === 'assistant' ? 'message msg-assistant nlm-msg' : 'message msg-user nlm-msg';

  const avatar = tipo === 'assistant' ? '✨' : '👤';
  const speakerName = tipo === 'assistant' ? '<div class="nlm-speaker-label">✨ NotebookLM</div>' : '';
  const badgeMotor = (tipo === 'assistant') 
    ? `<div class="chat-bubble-actions-row">
        <span class="nlm-source-indicator">${motor ? '⚡ ' + motor : 'Grounded Engine'}</span>
        <div class="nlm-actions-group">
          <button class="btn-salvar-nota-bubble nlm-action-btn" title="Salvar esta resposta no Mural de Notas do Studio">📌 Salvar Nota</button>
          <button class="btn-copiar-bubble nlm-action-btn" title="Copiar resposta">📋 Copiar</button>
          <button class="btn-narrar-bubble nlm-action-btn" title="Ouvir leitura em áudio">🔊 Ouvir</button>
        </div>
       </div>` 
    : '';

  msgEl.innerHTML = `
    <div class="msg-avatar ${tipo === 'assistant' ? 'nlm-sparkle-avatar' : 'nlm-user-avatar'}">${avatar}</div>
    <div class="msg-content nlm-msg-content">
      ${speakerName}
      <div class="nlm-markdown-body">${formatarMarkdown(texto)}</div>
      ${badgeMotor}
    </div>
  `;

  const btnNarrar = msgEl.querySelector('.btn-narrar-bubble');
  if (btnNarrar) {
    btnNarrar.addEventListener('click', () => {
      narrarTexto(texto, btnNarrar);
    });
  }

  const btnSalvarNota = msgEl.querySelector('.btn-salvar-nota-bubble');
  if (btnSalvarNota) {
    btnSalvarNota.addEventListener('click', async () => {
      if (window.salvarNotaDiretaDoChat) {
        btnSalvarNota.textContent = '⏳ Salvando...';
        const ok = await window.salvarNotaDiretaDoChat(texto);
        if (ok) {
          btnSalvarNota.textContent = '✓ Salvo no Bloco';
          btnSalvarNota.classList.add('saved');
          if (window.AppleAudio && window.AppleAudio.playHapticClick) window.AppleAudio.playHapticClick();
        } else {
          btnSalvarNota.textContent = 'Erro ao salvar';
        }
      }
    });
  }

  const btnCopiar = msgEl.querySelector('.btn-copiar-bubble');
  if (btnCopiar) {
    btnCopiar.addEventListener('click', () => {
      navigator.clipboard.writeText(texto).then(() => {
        btnCopiar.textContent = '✓ Copiado';
        setTimeout(() => { btnCopiar.textContent = '📋 Copiar'; }, 2000);
      });
    });
  }

  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

window.enviarMensagemParaZelda = enviarMensagemParaZelda;
window.enviarMensagemNotebookLM = enviarMensagemParaZelda;
window.adicionarBolha = adicionarBolha;
window.narrarTexto = narrarTexto;
