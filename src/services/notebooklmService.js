'use strict';

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const QUIZZES_DIR = path.join(DATA_DIR, 'quizzes');
const MINDMAPS_DIR = path.join(DATA_DIR, 'mindmaps');
const PODCASTS_DIR = path.join(__dirname, '..', '..', 'public', 'podcasts');

const {
  gerarMapaMentalComIA,
  gerarQuizComIA,
  obterCacheFontes,
  salvarCacheFontes
} = require('./aiGenerator');

const { carregarBanco } = require('./dataStore');

if (!fs.existsSync(MINDMAPS_DIR)) fs.mkdirSync(MINDMAPS_DIR, { recursive: true });
if (!fs.existsSync(QUIZZES_DIR)) fs.mkdirSync(QUIZZES_DIR, { recursive: true });
if (!fs.existsSync(PODCASTS_DIR)) fs.mkdirSync(PODCASTS_DIR, { recursive: true });

function executarComando(comando, timeoutMs = 60000) {
  return new Promise((resolve) => {
    exec(comando, { timeout: timeoutMs, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.warn(`[NotebookLM CLI] Alerta: ${comando} -> ${error.message}`);
      }
      resolve({ stdout: stdout || '', stderr: stderr || '', exitCode: error ? error.code : 0 });
    });
  });
}

function obterTituloCaderno(notebookId) {
  try {
    const db = carregarBanco();
    const cad = (db.cadernos || []).find(c => c.id === notebookId);
    if (cad && cad.title) return cad.title;
  } catch (e) {}
  return 'Caderno de Estudos';
}

/**
 * Lista todos os cadernos da conta NotebookLM
 */
async function listarCadernos() {
  const res = await executarComando('notebooklm list --json');
  try {
    const parsed = JSON.parse(res.stdout);
    return parsed.notebooks || [];
  } catch (err) {
    console.error('[NotebookLM CLI] Falha no parse de cadernos:', err.message);
    return [];
  }
}

/**
 * Cria um novo caderno
 */
async function criarCaderno(titulo) {
  const limpo = titulo.replace(/"/g, '\\"');
  const res = await executarComando(`notebooklm create "${limpo}" --json`);
  try {
    return JSON.parse(res.stdout);
  } catch (e) {
    return { titulo, status: 'criado' };
  }
}

/**
 * Adiciona uma fonte (PDF local, TXT ou URL/YouTube) a um caderno no NotebookLM
 */
async function adicionarFonte(notebookId, fonte) {
  const limpo = fonte.replace(/"/g, '\\"');
  const cmd = `notebooklm source add "${limpo}" -n "${notebookId}"`;
  const res = await executarComando(cmd, 120000);
  
  // Atualiza cache de fontes
  setTimeout(() => {
    listarFontes(notebookId).catch(() => {});
  }, 2000);

  return { status: res.exitCode === 0 ? 'sucesso' : 'erro', output: res.stdout || res.stderr };
}

/**
 * Pesquisa Autônoma na Web e anexa fontes encontradas (Deep Research do NotebookLM)
 */
async function adicionarPesquisa(notebookId, query) {
  const limpa = query.replace(/"/g, '\\"');
  const cmd = `notebooklm source add-research "${limpa}" -n "${notebookId}" --from web --mode fast --import-all`;
  console.log(`[NotebookLM Research] Disparando: ${cmd}`);
  const res = await executarComando(cmd, 180000);

  setTimeout(() => {
    listarFontes(notebookId).catch(() => {});
  }, 3000);

  return {
    sucesso: res.exitCode === 0,
    saida: res.stdout || res.stderr
  };
}

/**
 * Lista as fontes (materiais) do caderno com resiliência de cache
 */
async function listarFontes(notebookId) {
  const cmd = `notebooklm source list -n "${notebookId}" --json`;
  const res = await executarComando(cmd, 30000);
  
  try {
    const parsed = JSON.parse(res.stdout);
    const fontes = parsed.sources || [];
    if (fontes.length > 0) {
      salvarCacheFontes(notebookId, fontes);
      return fontes;
    }
  } catch (err) {}

  // Fallback em Cache local se NotebookLM estiver ocupado
  const cache = obterCacheFontes();
  if (cache[notebookId] && Array.isArray(cache[notebookId].fontes) && cache[notebookId].fontes.length > 0) {
    return cache[notebookId].fontes;
  }

  return [];
}

/**
 * Extrai o texto completo de uma fonte do caderno (PDFs, YouTube transcrito, Textos)
 */
async function obterTextoFonte(notebookId, fonteId) {
  const limpo = fonteId.replace(/"/g, '\\"');
  const cmd = `notebooklm source fulltext "${limpo}" -n "${notebookId}"`;
  const res = await executarComando(cmd, 45000);
  if (res.exitCode === 0 && res.stdout) {
    const match = res.stdout.match(/Content:\s*([\s\S]*)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return res.stdout.trim();
  }
  return 'Conteúdo textual não disponível para esta fonte.';
}

/**
 * Consulta o NotebookLM para obter síntese rica fundamentada nos documentos reais
 */
async function obterSinteseCaderno(notebookId, promptEspecifico = null) {
  const pergunta = promptEspecifico || 'Com base estrita nos documentos e materiais deste caderno, faça um detalhamento abrangente de todos os conceitos, regras, exceções e termos técnicos fundamentais.';
  const limpo = pergunta.replace(/"/g, '\\"').replace(/\n/g, ' ');
  const cmd = `notebooklm ask "${limpo}" -n "${notebookId}"`;
  const res = await executarComando(cmd, 60000);
  if (res.exitCode === 0 && res.stdout) {
    const out = res.stdout;
    const answerIndex = out.indexOf('Answer:');
    if (answerIndex !== -1) {
      return out.substring(answerIndex + 7).replace(/Resumed conversation:[\s\S]*$/i, '').trim();
    }
    return out.replace(/Resumed conversation:[\s\S]*$/i, '').trim();
  }
  return null;
}

/**
 * Lista os artefatos gerados para o caderno
 */
async function listarArtefatos(notebookId) {
  const cmd = `notebooklm artifact list -n "${notebookId}" --json`;
  const res = await executarComando(cmd, 25000);
  try {
    const parsed = JSON.parse(res.stdout);
    return parsed.artifacts || [];
  } catch (err) {
    return [];
  }
}

/**
 * Carrega ou gera o Quiz do caderno
 * Gera via NVIDIA NIM (moonshotai/kimi-k3) usando o contexto e fontes do caderno!
 */
async function obterQuiz(notebookId) {
  const filePath = path.join(QUIZZES_DIR, `${notebookId}_quiz.json`);

  // 1. Se já existe simulado salvo para este caderno, retorna imediatamente
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        return data;
      }
    } catch (e) {}
  }

  // 2. Geração sob demanda via NVIDIA NIM com os conteúdos do caderno
  const titulo = obterTituloCaderno(notebookId);
  const fontes = await listarFontes(notebookId);
  return await gerarQuizComIA(notebookId, titulo, fontes);
}

/**
 * Força a regeneração de Quiz por IA (NVIDIA NIM) com os conteúdos atualizados do caderno
 */
async function regenerarQuiz(notebookId) {
  const titulo = obterTituloCaderno(notebookId);
  const fontes = await listarFontes(notebookId);
  return await gerarQuizComIA(notebookId, titulo, fontes);
}

/**
 * Obtém ou gera o Mapa Mental estruturado em JSON
 */
async function obterMapaMental(notebookId) {
  const filePath = path.join(MINDMAPS_DIR, `${notebookId}_mindmap.json`);

  // 1. Se já existe o arquivo deste caderno específico
  if (fs.existsSync(filePath)) {
    try {
      const mapData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (mapData && mapData.name) {
        return mapData;
      }
    } catch (e) {}
  }

  // 2. Geração Automática com NVIDIA NIM sob medida
  const titulo = obterTituloCaderno(notebookId);
  const fontes = await listarFontes(notebookId);
  return await gerarMapaMentalComIA(notebookId, titulo, fontes);
}

/**
 * Força a regeneração de Mapa Mental por IA
 */
async function regenerarMapaMental(notebookId) {
  const titulo = obterTituloCaderno(notebookId);
  const fontes = await listarFontes(notebookId);
  return await gerarMapaMentalComIA(notebookId, titulo, fontes);
}

/**
 * Obtém ou baixa o Podcast em áudio do caderno
 */
async function obterAudio(notebookId) {
  const fileName = `${notebookId}.mp3`;
  const filePath = path.join(PODCASTS_DIR, fileName);

  if (fs.existsSync(filePath)) {
    return { url: `/podcasts/${fileName}`, existe: true };
  }

  // Tenta baixar do NotebookLM
  const cmd = `notebooklm download audio "${filePath}" -n "${notebookId}" --force`;
  await executarComando(cmd, 60000);

  if (fs.existsSync(filePath)) {
    return { url: `/podcasts/${fileName}`, existe: true };
  }

  // Fallback para o audio já baixado de teste se existir
  const testAudio = path.join(PODCASTS_DIR, 'cronograma_audio.mp3');
  if (fs.existsSync(testAudio)) {
    return { url: '/podcasts/cronograma_audio.mp3', existe: true };
  }

  return { url: null, existe: false };
}

/**
 * Dispara geração de artefato
 */
async function dispararGeracao(notebookId, tipo) {
  if (tipo === 'mind-map') {
    const mapa = await regenerarMapaMental(notebookId);
    return { status: 'concluido', tipo: 'mind-map', mapa };
  }

  if (tipo === 'quiz') {
    const quiz = await regenerarQuiz(notebookId);
    return { status: 'concluido', tipo: 'quiz', quiz };
  }

  const flagLang = tipo === 'audio' ? '--language pt_BR' : '';
  const cmd = `notebooklm generate ${tipo} -n "${notebookId}" ${flagLang}`.trim();
  executarComando(cmd, 600000).catch(() => {});
  return { status: 'gerando', tipo };
}

module.exports = {
  listarCadernos,
  criarCaderno,
  adicionarFonte,
  adicionarPesquisa,
  listarFontes,
  obterTextoFonte,
  obterSinteseCaderno,
  listarArtefatos,
  obterQuiz,
  regenerarQuiz,
  obterMapaMental,
  regenerarMapaMental,
  obterAudio,
  dispararGeracao
};
