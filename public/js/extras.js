'use strict';

/**
 * ============================================================================
 *  public/js/extras.js — Pomodoro, Áudio de Foco, Dashboard, Heatmap & Obsidian
 * ============================================================================
 */

const ExtrasState = {
  // Pomodoro
  pomodoroMinutos: 25,
  pomodoroSegundos: 0,
  pomodoroInterval: null,
  pomodoroRodando: false,
  pomodoroModo: 'foco', // 'foco' ou 'descanso'

  // Som Ambiente (Web Audio API)
  audioCtx: null,
  somAtivo: 'off',
  audioNodes: [],

  // Modo Prova Simulado
  modoProvaAtivo: false,
  provaTimerInterval: null,
  provaTempoRestante: 120
};

document.addEventListener('DOMContentLoaded', () => {
  initPomodoro();
  initAudioAmbiente();
  initDashboardEvents();
  initPWA();
});

/* ==========================================================================
   1. PWA SERVICE WORKER
   ========================================================================== */
function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration fallback:', err.message);
    });
  }
}

/* ==========================================================================
   2. POMODORO TIMER
   ========================================================================== */
function initPomodoro() {
  const btnToggle = document.getElementById('btn-pomodoro-toggle');
  const btnReset = document.getElementById('btn-pomodoro-reset');
  const display = document.getElementById('pomodoro-display');

  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      if (ExtrasState.pomodoroRodando) {
        pausarPomodoro();
      } else {
        iniciarPomodoro();
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', resetarPomodoro);
  }

  atualizarDisplayPomodoro();
}

function iniciarPomodoro() {
  ExtrasState.pomodoroRodando = true;
  const btnToggle = document.getElementById('btn-pomodoro-toggle');
  if (btnToggle) btnToggle.textContent = '⏸';

  ExtrasState.pomodoroInterval = setInterval(() => {
    if (ExtrasState.pomodoroSegundos === 0) {
      if (ExtrasState.pomodoroMinutos === 0) {
        concluirCicloPomodoro();
        return;
      }
      ExtrasState.pomodoroMinutos--;
      ExtrasState.pomodoroSegundos = 59;
    } else {
      ExtrasState.pomodoroSegundos--;
    }
    atualizarDisplayPomodoro();
  }, 1000);
}

function pausarPomodoro() {
  ExtrasState.pomodoroRodando = false;
  clearInterval(ExtrasState.pomodoroInterval);
  const btnToggle = document.getElementById('btn-pomodoro-toggle');
  if (btnToggle) btnToggle.textContent = '▶';
}

function resetarPomodoro() {
  pausarPomodoro();
  ExtrasState.pomodoroMinutos = ExtrasState.pomodoroModo === 'foco' ? 25 : 5;
  ExtrasState.pomodoroSegundos = 0;
  atualizarDisplayPomodoro();
}

function atualizarDisplayPomodoro() {
  const display = document.getElementById('pomodoro-display');
  if (!display) return;
  const m = String(ExtrasState.pomodoroMinutos).padStart(2, '0');
  const s = String(ExtrasState.pomodoroSegundos).padStart(2, '0');
  display.textContent = `${m}:${s}`;
}

function concluirCicloPomodoro() {
  pausarPomodoro();
  tocarAlarmeSino();

  if (ExtrasState.pomodoroModo === 'foco') {
    // Registra no backend
    fetch('/api/notebooks/pomodoro/concluir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutos: 25 })
    }).then(res => res.json()).then(data => {
      const statFoco = document.getElementById('stat-foco-hoje');
      if (statFoco && data.resultado) {
        statFoco.textContent = `${data.resultado.minutosHoje}m foco`;
      }
    }).catch(() => {});

    alert('🎉 Ciclo de Foco de 25 minutos concluído! Hora de uma pausa de 5 minutos.');
    if (window.AppleAudio) window.AppleAudio.playLevelUp();
    if (window.GameEngine) window.GameEngine.registrarAcao('pomodoro_foco');
    ExtrasState.pomodoroModo = 'descanso';
    ExtrasState.pomodoroMinutos = 5;
  } else {
    alert('☕ Pausa finalizada! Pronto para o próximo ciclo de foco?');
    ExtrasState.pomodoroModo = 'foco';
    ExtrasState.pomodoroMinutos = 25;
  }

  ExtrasState.pomodoroSegundos = 0;
  atualizarDisplayPomodoro();
}

/* ==========================================================================
   3. SINTETIZADOR DE SOM AMBIENTE (Web Audio API)
   ========================================================================== */
function initAudioAmbiente() {
  const selectSom = document.getElementById('select-som-ambiente');
  if (!selectSom) return;

  selectSom.addEventListener('change', (e) => {
    pararSomAmbiente();
    const tipo = e.target.value;
    ExtrasState.somAtivo = tipo;
    if (tipo !== 'off') {
      tocarSomAmbiente(tipo);
    }
  });
}

function getAudioContext() {
  if (!ExtrasState.audioCtx) {
    ExtrasState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ExtrasState.audioCtx.state === 'suspended') {
    ExtrasState.audioCtx.resume();
  }
  return ExtrasState.audioCtx;
}

function pararSomAmbiente() {
  ExtrasState.audioNodes.forEach(n => {
    try { if (n.stop) n.stop(); n.disconnect(); } catch (e) {}
  });
  ExtrasState.audioNodes = [];
}

function tocarSomAmbiente(tipo) {
  const ctx = getAudioContext();

  if (tipo === 'chuva' || tipo === 'ondas') {
    // Gerador de Ruído (Noise Buffer)
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Brown/Pink noise filtering
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    whiteNoise.loop = true;

    // Filtro Passa-Baixas
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = tipo === 'chuva' ? 800 : 380;

    // Ganho suave
    const gain = ctx.createGain();
    gain.gain.value = 0.12;

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start();
    ExtrasState.audioNodes.push(whiteNoise, filter, gain);
  } else if (tipo === 'lofi') {
    // Tom Cálido Lofi (Dois Osciladores Senoidais com modulação)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.value = 174; // Frequência de relaxamento solfeggio
    osc2.type = 'triangle';
    osc2.frequency.value = 216;

    gain.gain.value = 0.05;

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    ExtrasState.audioNodes.push(osc1, osc2, gain);
  }
}

function tocarAlarmeSino() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (e) {}
}

/* ==========================================================================
   4. DASHBOARD, HEATMAP & OBSIDIAN EXPORT
   ========================================================================== */
function initDashboardEvents() {
  const btnExportar = document.getElementById('btn-exportar-obsidian');
  if (btnExportar) {
    btnExportar.addEventListener('click', exportarCadernoParaObsidian);
  }
}

async function carregarDashboard() {
  try {
    const res = await fetch('/api/notebooks/dashboard/metricas');
    const data = await res.json();

    // Atualiza Heatmap
    renderizarHeatmap(data.heatmap || []);

    // Estatísticas Gerais
    const elFoco = document.getElementById('dash-tempo-foco');
    const elQuestoes = document.getElementById('dash-total-questoes');
    const elTaxa = document.getElementById('dash-taxa-acerto');
    const elSrsPendentes = document.getElementById('dash-srs-pendentes');

    const stats = data.estatisticas || {};
    if (elFoco) elFoco.textContent = `${data.tempoFocoMinutosHoje || 0} min`;
    if (elQuestoes) elQuestoes.textContent = stats.totalRespondidas || 0;

    if (elTaxa) {
      const taxa = stats.totalRespondidas > 0 
        ? Math.round((stats.acertos / stats.totalRespondidas) * 100) 
        : 100;
      elTaxa.textContent = `${taxa}%`;
    }

    if (elSrsPendentes && data.srs) {
      elSrsPendentes.textContent = data.srs.pendentesHoje;
    }
  } catch (err) {
    console.error('Erro ao carregar métricas do dashboard:', err);
  }
}

function renderizarHeatmap(dias) {
  const container = document.getElementById('heatmap-grid');
  if (!container) return;

  container.innerHTML = '';
  dias.forEach(d => {
    const box = document.createElement('div');
    box.className = `heatmap-box level-${d.nivel}`;
    box.title = `${d.data}: ${d.minutosFoco}m de foco, ${d.questoes} questões (${d.acertos} acertos)`;
    container.appendChild(box);
  });
}

async function exportarCadernoParaObsidian() {
  if (!window.AppState?.cadernoAtivo) {
    alert('Selecione um caderno primeiro.');
    return;
  }

  const btn = document.getElementById('btn-exportar-obsidian');
  const statusEl = document.getElementById('exportar-obsidian-status');

  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Exportando para o Obsidian...';
  }

  try {
    const nb = window.AppState.cadernoAtivo;
    const res = await fetch(`/api/notebooks/${nb.id}/exportar-obsidian`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: nb.title })
    });
    const data = await res.json();

    if (data.sucesso) {
      alert(`🎉 Nota exportada com sucesso para o seu Cofre do Obsidian!\nArquivo: ${data.nomeArquivo}\nPasta: contexto/servidor/Estudos/`);
      if (statusEl) statusEl.textContent = `✅ Sincronizado: ${data.nomeArquivo}`;
    } else {
      alert('Falha ao exportar nota: ' + (data.erro || 'Erro desconhecido'));
    }
  } catch (err) {
    alert('Erro de conexão ao exportar.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📂 Exportar para o Obsidian';
    }
  }
}

window.carregarDashboard = carregarDashboard;
window.exportarCadernoParaObsidian = exportarCadernoParaObsidian;
