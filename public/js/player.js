'use strict';

/**
 * player.js — Player de Podcast em Áudio (NotebookLM) & Gerenciamento de Fontes
 */

document.addEventListener('DOMContentLoaded', () => {
  initAudioPlayer();
  initUploadSources();
});

function initAudioPlayer() {
  const audio = document.getElementById('audio-player');
  const btnPlay = document.getElementById('btn-play-pause');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');
  const seekBar = document.getElementById('seek-bar');
  const currentTimeEl = document.getElementById('current-time');
  const durationTimeEl = document.getElementById('duration-time');
  const btnBack = document.getElementById('btn-skip-back');
  const btnFwd = document.getElementById('btn-skip-forward');
  const speedBtns = document.querySelectorAll('.speed-btn');
  const btnGerarAudio = document.getElementById('btn-gerar-novo-audio');
  const waves = document.querySelector('.sound-waves');

  if (!audio || !btnPlay) {
    console.warn('[player.js] Audio player ou botão de play não encontrado no DOM.');
    return;
  }

  const formatTime = (sec) => {
    if (isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  btnPlay.addEventListener('click', () => {
    if (!audio.src) {
      alert('Nenhum podcast disponível ainda neste caderno. Clique em "Gerar Novo Áudio no NotebookLM" abaixo!');
      return;
    }
    if (audio.paused) {
      audio.play().then(() => {
        if (iconPlay) iconPlay.style.display = 'none';
        if (iconPause) iconPause.style.display = 'block';
        if (waves) waves.classList.add('playing');
      }).catch(err => {
        console.error('Erro ao tocar áudio:', err);
      });
    } else {
      audio.pause();
      if (iconPlay) iconPlay.style.display = 'block';
      if (iconPause) iconPause.style.display = 'none';
      if (waves) waves.classList.remove('playing');
    }
  });

  audio.addEventListener('timeupdate', () => {
    if (!isNaN(audio.duration) && audio.duration > 0) {
      const prog = (audio.currentTime / audio.duration) * 100;
      if (seekBar) seekBar.value = prog;
      if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
      if (durationTimeEl) durationTimeEl.textContent = formatTime(audio.duration);
    }
  });

  audio.addEventListener('ended', () => {
    if (iconPlay) iconPlay.style.display = 'block';
    if (iconPause) iconPause.style.display = 'none';
    if (waves) waves.classList.remove('playing');
  });

  if (seekBar) {
    seekBar.addEventListener('input', () => {
      if (!isNaN(audio.duration)) {
        audio.currentTime = (seekBar.value / 100) * audio.duration;
      }
    });
  }

  if (btnBack) {
    btnBack.addEventListener('click', () => {
      audio.currentTime = Math.max(0, audio.currentTime - 10);
    });
  }

  if (btnFwd) {
    btnFwd.addEventListener('click', () => {
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
    });
  }

  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const spd = parseFloat(btn.getAttribute('data-speed'));
      audio.playbackRate = spd;
    });
  });

  if (btnGerarAudio) {
    btnGerarAudio.addEventListener('click', async () => {
      if (!window.AppState?.cadernoAtivo) {
        alert('Selecione um caderno primeiro!');
        return;
      }
      btnGerarAudio.textContent = '⏳ Solicitando ao NotebookLM...';
      btnGerarAudio.disabled = true;

      try {
        await fetch(`/api/notebooks/${window.AppState.cadernoAtivo.id}/gerar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo: 'audio' })
        });
        alert('Geração de Podcast iniciada no NotebookLM! O áudio é sintetizado em alta resolução com vozes naturais e leva alguns minutos para ser finalizado.');
      } catch (e) {
        alert('Erro ao disparar áudio.');
      } finally {
        btnGerarAudio.textContent = '🎙️ Gerar Novo Áudio no NotebookLM';
        btnGerarAudio.disabled = false;
      }
    });
  }
}

async function carregarAudioDoCaderno(notebookId) {
  const audio = document.getElementById('audio-player');
  const titleEl = document.getElementById('podcast-title');
  const subtitleEl = document.getElementById('podcast-subtitle');
  const btnDownload = document.getElementById('btn-download-audio');
  const waves = document.querySelector('.sound-waves');

  if (!audio) return;

  try {
    const res = await fetch(`/api/notebooks/${notebookId}/audio`);
    const data = await res.json();

    if (data.existe && data.url) {
      audio.src = data.url;
      if (titleEl) titleEl.textContent = `Podcast: ${window.AppState?.cadernoAtivo?.title || 'Caderno'}`;
      if (subtitleEl) subtitleEl.textContent = 'Audio Overview oficial gerado pelo NotebookLM com base nas suas fontes ativas';
      if (btnDownload) {
        btnDownload.href = data.url;
        btnDownload.style.display = 'inline-flex';
      }
    } else {
      audio.removeAttribute('src');
      if (titleEl) titleEl.textContent = 'Nenhum podcast gerado ainda para este caderno';
      if (subtitleEl) subtitleEl.textContent = 'Clique no botão abaixo para gerar uma discussão em áudio de alta qualidade';
      if (btnDownload) btnDownload.style.display = 'none';
      if (waves) waves.classList.remove('playing');
    }
  } catch (err) {
    console.error('Erro ao buscar áudio:', err);
  }
}

function initUploadSources() {
  const btnTrigger = document.getElementById('btn-trigger-upload');
  const fileInput = document.getElementById('file-upload-input');
  const uploadStatus = document.getElementById('upload-status');
  const btnAddUrl = document.getElementById('btn-add-url-fonte');
  const urlInput = document.getElementById('input-url-fonte');
  const urlStatus = document.getElementById('url-status');

  if (btnTrigger && fileInput) {
    btnTrigger.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      if (!fileInput.files || fileInput.files.length === 0) return;
      if (!window.AppState?.cadernoAtivo) {
        alert('Selecione um caderno primeiro!');
        return;
      }

      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append('arquivo', file);

      if (uploadStatus) {
        uploadStatus.textContent = `Enviando "${file.name}" para o NotebookLM...`;
        uploadStatus.style.color = 'var(--apple-amber)';
      }

      try {
        const res = await fetch(`/api/notebooks/${window.AppState.cadernoAtivo.id}/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (data.sucesso) {
          if (uploadStatus) {
            uploadStatus.textContent = `✅ "${file.name}" adicionado com sucesso!`;
            uploadStatus.style.color = 'var(--apple-green)';
          }
          if (typeof window.carregarFontes === 'function') {
            window.carregarFontes(window.AppState.cadernoAtivo.id);
          }
        } else {
          if (uploadStatus) {
            uploadStatus.textContent = `Falha ao adicionar arquivo.`;
            uploadStatus.style.color = 'var(--apple-red)';
          }
        }
      } catch (e) {
        if (uploadStatus) {
          uploadStatus.textContent = `Erro no envio do arquivo.`;
          uploadStatus.style.color = 'var(--apple-red)';
        }
      }
    });
  }

  if (btnAddUrl && urlInput) {
    btnAddUrl.addEventListener('click', async () => {
      const url = urlInput.value.trim();
      if (!url) return;
      if (!window.AppState?.cadernoAtivo) {
        alert('Selecione um caderno primeiro!');
        return;
      }

      if (urlStatus) {
        urlStatus.textContent = 'Adicionando e processando URL no NotebookLM...';
        urlStatus.style.color = 'var(--apple-amber)';
      }
      btnAddUrl.disabled = true;

      try {
        const res = await fetch(`/api/notebooks/${window.AppState.cadernoAtivo.id}/fonte-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await res.json();
        urlInput.value = '';
        if (urlStatus) {
          urlStatus.textContent = '✅ Fonte adicionada e pronta no NotebookLM!';
          urlStatus.style.color = 'var(--apple-green)';
        }
        if (typeof window.carregarFontes === 'function') {
          window.carregarFontes(window.AppState.cadernoAtivo.id);
        }
      } catch (e) {
        if (urlStatus) {
          urlStatus.textContent = 'Erro ao adicionar URL.';
          urlStatus.style.color = 'var(--apple-red)';
        }
      } finally {
        btnAddUrl.disabled = false;
      }
    });
  }
}

window.carregarAudioDoCaderno = carregarAudioDoCaderno;
