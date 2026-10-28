'use strict';

/**
 * ============================================================================
 *  public/js/appleAudio.js — Sintetizador de Áudio e Haptics no Padrão Apple
 *  Gera feedback sonoro e tátil usando Web Audio API pura (zero latência).
 * ============================================================================
 */

const AppleAudio = {
  ctx: null,

  getContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  },

  // 1. Haptic Tap Instantâneo (Feedback de toque em botões e abas)
  playTap() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.015);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.02);

      if (navigator.vibrate) {
        navigator.vibrate(8);
      }
    } catch (e) {}
  },

  // 2. Chime de Resposta Correta (Harmônico, agradável e cristalino)
  playCorrect() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, t);
      gain1.gain.setValueAtTime(0.12, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.36);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(830.61, t + 0.07);
      gain2.gain.setValueAtTime(0.14, t + 0.07);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t + 0.07);
      osc2.stop(t + 0.46);

      if (navigator.vibrate) {
        navigator.vibrate([15, 40, 20]);
      }
    } catch (e) {}
  },

  // 3. Tom Suave de Erro (Acolhedor, sem tom de punição)
  playWrong() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.22);

      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.23);

      if (navigator.vibrate) {
        navigator.vibrate(35);
      }
    } catch (e) {}
  },

  // 4. Arpeggio de Level Up / Vitória
  playLevelUp() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const notas = [523.25, 659.25, 783.99, 1046.50];

      notas.forEach((freq, idx) => {
        const start = t + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.42);
      });

      if (navigator.vibrate) {
        navigator.vibrate([30, 50, 30, 50, 60]);
      }
    } catch (e) {}
  },

  // 5. Flip de Carta SRS (Som de deslize tátil)
  playCardFlip() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const t = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.06);

      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.08);
    } catch (e) {}
  }
};

window.AppleAudio = AppleAudio;
