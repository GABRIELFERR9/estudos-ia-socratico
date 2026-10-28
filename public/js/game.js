'use strict';

/**
 * ============================================================================
 *  public/js/game.js — Motor de Gamificação Apple (Activity Rings, XP & Confetes)
 * ============================================================================
 */

const GameState = {
  xp: 140,
  nivel: 1,
  titulo: 'Aprendiz Curioso',
  proximoXP: 150,
  pct: 0,
  streak: 3,
  combo: 0,
  aneis: {
    foco: { atual: 0, meta: 25, pct: 0 },
    questoes: { atual: 1, meta: 5, pct: 20 },
    srs: { atual: 1, meta: 3, pct: 33 }
  }
};

const GameEngine = {
  async init() {
    await this.carregarStatus();
    this.renderizarHUD();
    this.renderizarAneis();
  },

  async carregarStatus() {
    try {
      const res = await fetch('/api/notebooks/gamificacao/status');
      const data = await res.json();
      Object.assign(GameState, data);
    } catch (e) {
      console.warn('[GameEngine] Fallback status:', e);
    }
  },

  async registrarAcao(tipo, targetEl = null) {
    try {
      const res = await fetch('/api/notebooks/gamificacao/acao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo })
      });
      const data = await res.json();
      if (data.sucesso) {
        Object.assign(GameState, data);
        this.renderizarHUD();
        this.renderizarAneis();

        // Efeitos visuais
        if (data.xpGanho) {
          let texto = `+${data.xpGanho} XP`;
          if (data.bonusCombo > 0) {
            texto += ` (🔥 ${data.combo}x Combo!)`;
          }
          this.mostrarXPFloating(texto, targetEl);
        }

        if (data.subiuNivel) {
          this.celebrarLevelUp(data.nivel, data.titulo);
        }
        return data;
      }
    } catch (e) {
      console.error('[GameEngine] Erro ao registrar:', e);
    }
  },

  renderizarHUD() {
    // 1. XP Pill e Nível no Topo
    const elXP = document.getElementById('stat-xp-val');
    const elNivel = document.getElementById('stat-nivel-badge');
    const elXpBar = document.getElementById('stat-xp-progress');
    const elStreak = document.getElementById('stat-streak-val');

    if (elXP) elXP.textContent = `${GameState.xp} XP`;
    if (elNivel) elNivel.textContent = `Nvl ${GameState.nivel} • ${GameState.titulo}`;
    if (elXpBar) elXpBar.style.width = `${Math.min(100, GameState.pct)}%`;
    if (elStreak) elStreak.textContent = `${GameState.streak} dias`;

    // 2. Elementos na aba Progresso
    const elProgNivel = document.getElementById('dash-player-level');
    const elProgTitulo = document.getElementById('dash-player-title');
    const elProgXpTxt = document.getElementById('dash-player-xp-text');
    const elProgXpFill = document.getElementById('dash-player-xp-fill');

    if (elProgNivel) elProgNivel.textContent = `Nível ${GameState.nivel}`;
    if (elProgTitulo) elProgTitulo.textContent = GameState.titulo;
    if (elProgXpTxt) elProgXpTxt.textContent = `${GameState.xp} / ${GameState.proximoXP} XP`;
    if (elProgXpFill) elProgXpFill.style.width = `${Math.min(100, GameState.pct)}%`;
  },

  renderizarAneis() {
    // Anéis SVG (Vermelho = Foco, Verde = Questões, Azul = SRS)
    const updateRing = (circleId, pct) => {
      const circle = document.getElementById(circleId);
      if (!circle) return;
      const radius = circle.r.baseVal.value;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (Math.min(100, pct) / 100) * circumference;
      circle.style.strokeDasharray = `${circumference} ${circumference}`;
      circle.style.strokeDashoffset = offset;
    };

    // Header mini-rings
    updateRing('mini-ring-foco', GameState.aneis.foco.pct);
    updateRing('mini-ring-questoes', GameState.aneis.questoes.pct);
    updateRing('mini-ring-srs', GameState.aneis.srs.pct);

    // Dashboard big rings
    updateRing('dash-ring-foco', GameState.aneis.foco.pct);
    updateRing('dash-ring-questoes', GameState.aneis.questoes.pct);
    updateRing('dash-ring-srs', GameState.aneis.srs.pct);

    // Labels de metas
    const lblFoco = document.getElementById('lbl-ring-foco');
    const lblQuestoes = document.getElementById('lbl-ring-questoes');
    const lblSrs = document.getElementById('lbl-ring-srs');

    if (lblFoco) lblFoco.textContent = `${GameState.aneis.foco.atual}/${GameState.aneis.foco.meta} min`;
    if (lblQuestoes) lblQuestoes.textContent = `${GameState.aneis.questoes.atual}/${GameState.aneis.questoes.meta} feitas`;
    if (lblSrs) lblSrs.textContent = `${GameState.aneis.srs.atual}/${GameState.aneis.srs.meta} revisados`;
  },

  mostrarXPFloating(texto, targetEl) {
    const pop = document.createElement('div');
    pop.className = 'xp-floating-pill';
    pop.textContent = texto;

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      pop.style.left = `${rect.left + rect.width / 2}px`;
      pop.style.top = `${rect.top}px`;
    } else {
      pop.style.left = '50%';
      pop.style.top = '120px';
    }

    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 1400);
  },

  celebrarLevelUp(nivel, titulo) {
    if (window.AppleAudio) window.AppleAudio.playLevelUp();
    this.lancarConfetes();

    const banner = document.createElement('div');
    banner.className = 'apple-levelup-modal';
    banner.innerHTML = `
      <div class="apple-levelup-card">
        <div class="levelup-badge">🏆 LEVEL UP!</div>
        <div class="levelup-stars">⭐⭐⭐⭐⭐</div>
        <h2>Você subiu para o Nível ${nivel}!</h2>
        <p class="levelup-title">${titulo}</p>
        <p class="levelup-sub">Seu cérebro está consolidando padrões com maestria Feynman.</p>
        <button class="btn-pri levelup-btn" onclick="this.closest('.apple-levelup-modal').remove()">Continuar Aprendendo</button>
      </div>
    `;
    document.body.appendChild(banner);
  },

  lancarConfetes() {
    const colors = ['#0A84FF', '#30D158', '#FF9F0A', '#FF453A', '#BF5AF2', '#FFD60A'];
    for (let i = 0; i < 45; i++) {
      const c = document.createElement('div');
      c.className = 'apple-confetti-particle';
      c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      c.style.left = Math.random() * 100 + 'vw';
      c.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
      c.style.transform = `scale(${0.6 + Math.random() * 0.8}) rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3000);
    }
  }
};

window.GameEngine = GameEngine;
document.addEventListener('DOMContentLoaded', () => {
  GameEngine.init();
});
