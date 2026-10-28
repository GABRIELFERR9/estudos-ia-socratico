'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const OBSIDIAN_ESTUDOS_DIR = process.env.OBSIDIAN_ESTUDOS_DIR || (process.platform === 'win32' ? 'C:\\Users\\CBRO\\Desktop\\contexto\\servidor\\Estudos' : path.join(__dirname, '..', '..', 'data', 'obsidian_export'));

function carregarBanco() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DB_FILE)) {
      const hoje = new Date().toISOString().split('T')[0];
      const inicial = {
        cadernoAtivoId: '37909462-6215-4304-a5cf-aea1e0d5dc35',
        cadernos: [],
        quizzes: {},
        flashcards: {},
        audios: {},
        srsCards: [],
        tempoFocoMinutosHoje: 0,
        historicoDias: [
          { data: hoje, minutosFoco: 25, totalRespondidas: 10, acertos: 8 }
        ],
        estatisticas: {
          totalRespondidas: 10,
          acertos: 8,
          streakDias: 3,
          cardsRevisados: 2,
          minutosFocoTotal: 75
        }
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(inicial, null, 2), 'utf8');
      return inicial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const dados = JSON.parse(raw);
    if (!dados.srsCards) dados.srsCards = [];
    if (!dados.historicoDias) dados.historicoDias = [];
    if (!dados.estatisticas) {
      dados.estatisticas = { totalRespondidas: 0, acertos: 0, streakDias: 1, cardsRevisados: 0, minutosFocoTotal: 0 };
    }
    return dados;
  } catch (err) {
    console.error('[DataStore] Erro ao carregar banco:', err.message);
    return { cadernos: [], quizzes: {}, flashcards: {}, audios: {}, srsCards: [], historicoDias: [], estatisticas: {} };
  }
}

function salvarBanco(dados) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dados, null, 2), 'utf8');
  } catch (err) {
    console.error('[DataStore] Erro ao salvar banco:', err.message);
  }
}

/**
 * Adiciona uma questão errada à fila de Repetição Espaçada (SRS / Anki)
 */
function adicionarCardSRS(dadosCard) {
  const db = carregarBanco();
  const id = 'srs_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

  const jaExiste = db.srsCards.find(c => c.questao === dadosCard.questao);
  if (jaExiste) {
    jaExiste.intervaloDias = 1;
    jaExiste.proximaRevisao = new Date().toISOString();
    salvarBanco(db);
    return jaExiste;
  }

  const novoCard = {
    id,
    cadernoId: dadosCard.cadernoId || db.cadernoAtivoId,
    questao: dadosCard.questao,
    opcoes: dadosCard.opcoes || [],
    gabarito: dadosCard.gabarito || '',
    justificativa: dadosCard.justificativa || '',
    explicacaoIA: dadosCard.explicacaoIA || '',
    criadoEm: new Date().toISOString(),
    proximaRevisao: new Date().toISOString(),
    intervaloDias: 1,
    repeticoes: 0,
    historicoRespostas: []
  };

  db.srsCards.unshift(novoCard);
  salvarBanco(db);
  return novoCard;
}

/**
 * Retorna os flashcards agendados para revisão (hoje ou pendentes)
 */
function obterCardsParaRevisao(cadernoId = null) {
  const db = carregarBanco();
  const agora = new Date();

  return db.srsCards.filter(card => {
    if (cadernoId && card.cadernoId !== cadernoId) return false;
    const dataRev = new Date(card.proximaRevisao || card.criadoEm);
    return dataRev <= agora;
  });
}

function listarTodosCardsSRS(cadernoId = null) {
  const db = carregarBanco();
  if (cadernoId) {
    return db.srsCards.filter(c => c.cadernoId === cadernoId);
  }
  return db.srsCards;
}

/**
 * Processa resposta do usuário no flashcard usando algoritmo SM-2
 */
function responderCardSRS(cardId, qualidade) {
  const db = carregarBanco();
  const card = db.srsCards.find(c => c.id === cardId);
  if (!card) return null;

  const hoje = new Date();
  let novoIntervalo = 1;

  if (qualidade === 0) {
    novoIntervalo = 1;
    card.repeticoes = 0;
  } else if (qualidade === 1) {
    novoIntervalo = card.intervaloDias <= 1 ? 3 : Math.round(card.intervaloDias * 2.2);
    card.repeticoes += 1;
  } else if (qualidade === 2) {
    novoIntervalo = card.intervaloDias <= 1 ? 7 : Math.round(card.intervaloDias * 3.5);
    card.repeticoes += 1;
  }

  card.intervaloDias = novoIntervalo;
  const prox = new Date(hoje.getTime() + novoIntervalo * 24 * 60 * 60 * 1000);
  card.proximaRevisao = prox.toISOString();
  card.ultimoResultado = qualidade === 0 ? 'errei' : (qualidade === 1 ? 'bom' : 'facil');
  card.historicoRespostas.push({ data: hoje.toISOString(), qualidade, proximoIntervaloDias: novoIntervalo });

  if (!db.estatisticas.cardsRevisados) db.estatisticas.cardsRevisados = 0;
  db.estatisticas.cardsRevisados += 1;

  salvarBanco(db);
  return card;
}

/**
 * Registra ciclo de Pomodoro de foco concluído
 */
function registrarSessaoPomodoro(minutos = 25) {
  const db = carregarBanco();
  const hojeStr = new Date().toISOString().split('T')[0];

  if (!db.estatisticas.minutosFocoTotal) db.estatisticas.minutosFocoTotal = 0;
  db.estatisticas.minutosFocoTotal += minutos;

  if (!db.tempoFocoMinutosHoje) db.tempoFocoMinutosHoje = 0;
  db.tempoFocoMinutosHoje += minutos;

  let entradaHoje = db.historicoDias.find(h => h.data === hojeStr);
  if (!entradaHoje) {
    entradaHoje = { data: hojeStr, minutosFoco: minutos, totalRespondidas: 0, acertos: 0 };
    db.historicoDias.push(entradaHoje);
  } else {
    entradaHoje.minutosFoco = (entradaHoje.minutosFoco || 0) + minutos;
  }

  salvarBanco(db);
  return { minutosHoje: db.tempoFocoMinutosHoje, total: db.estatisticas.minutosFocoTotal };
}

/**
 * Gera os dados dos últimos 30 dias para o Heatmap de estudos
 */
function obterDadosHeatmap() {
  const db = carregarBanco();
  const resultado = [];
  const hoje = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const dataStr = d.toISOString().split('T')[0];

    const historico = db.historicoDias.find(h => h.data === dataStr);
    resultado.push({
      data: dataStr,
      minutosFoco: historico ? historico.minutosFoco : 0,
      questoes: historico ? historico.totalRespondidas : 0,
      acertos: historico ? historico.acertos : 0,
      nivel: historico && historico.minutosFoco > 0 ? (historico.minutosFoco >= 50 ? 3 : (historico.minutosFoco >= 25 ? 2 : 1)) : 0
    });
  }

  return resultado;
}

/**
 * Exporta caderno atual diretamente para nota Markdown no Cofre do Obsidian
 */
function exportarParaObsidian(cadernoId, cadernoTitulo, dadosExtras = {}) {
  try {
    if (!fs.existsSync(OBSIDIAN_ESTUDOS_DIR)) {
      fs.mkdirSync(OBSIDIAN_ESTUDOS_DIR, { recursive: true });
    }

    const nomeArquivo = (cadernoTitulo || 'Caderno de Estudo')
      .replace(/[/\\?%*:|"<>]/g, '-')
      .trim() + '.md';
    const filePath = path.join(OBSIDIAN_ESTUDOS_DIR, nomeArquivo);

    const hoje = new Date().toLocaleDateString('pt-BR');
    const { mapaMental, quiz, fontes } = dadosExtras;

    let md = `---\ntags: [estudos, notebooklm, nexus-study, ${(cadernoTitulo || 'materia').toLowerCase().replace(/\s+/g, '-')}]\natualizado: ${new Date().toISOString().split('T')[0]}\n---\n\n`;
    md += `# 📚 ${cadernoTitulo || 'Caderno de Estudos'}\n\n`;
    md += `> [!NOTE]\n> **Origem:** Gerado e sincronizado pelo **Nexus Study** (NotebookLM + Júlia CBRO) em ${hoje}.\n\n`;

    // 1. Fontes
    if (fontes && fontes.length > 0) {
      md += `## 📑 Fontes & Materiais Analisados\n`;
      fontes.forEach(f => {
        md += `- **${f.title || 'Material'}** (${f.type || 'documento'})${f.url ? ` — [Acessar Link](${f.url})` : ''}\n`;
      });
      md += `\n`;
    }

    // 2. Tópicos do Mapa Mental
    if (mapaMental && mapaMental.children) {
      md += `## 🗺️ Estrutura Conceitual (Mapa Mental)\n`;
      function formatarNoMd(no, nivel = 0) {
        let indent = '  '.repeat(nivel);
        let texto = `${indent}- **${no.name}**\n`;
        if (no.children) {
          no.children.forEach(c => { texto += formatarNoMd(c, nivel + 1); });
        }
        return texto;
      }
      mapaMental.children.forEach(c => {
        md += formatarNoMd(c, 0);
      });
      md += `\n`;
    }

    // 3. Simulado & Flashcards de Erros
    const db = carregarBanco();
    const errosCaderno = db.srsCards.filter(c => c.cadernoId === cadernoId);
    if (errosCaderno.length > 0) {
      md += `## 🗂️ Pontos de Atenção (Flashcards SRS & Erros Frequentes)\n`;
      errosCaderno.forEach((e, i) => {
        md += `### Questão ${i + 1}: ${e.questao}\n`;
        md += `- **Gabarito:** ${e.gabarito}\n`;
        md += `- **Justificativa:** ${e.justificativa}\n`;
        md += `- **Intervalo de Revisão:** a cada ${e.intervaloDias} dia(s)\n\n`;
      });
    }

    
    // 4. Notas do Studio do NotebookLM
    const notas = (db.studioNotas && db.studioNotas[cadernoId]) || [];
    if (notas.length > 0) {
      md += "\n## 📝 Anotações do Studio (NotebookLM)\n\n";
      notas.forEach(n => {
        md += `### ${n.titulo}\n${n.conteudo}\n\n`;
      });
    }

    // 5. Guia de Estudos e FAQ do Studio
    const docs = (db.studioDocumentos && db.studioDocumentos[cadernoId]) || {};
    if (docs['guia-estudo']) {
      const g = docs['guia-estudo'];
      md += "\n## 📖 Guia de Estudos (NotebookLM)\n\n";
      if (g.resumoExecutivo) md += `> ${g.resumoExecutivo}\n\n`;
      (g.topicosPrincipais || []).forEach(t => {
        md += `### ${t.titulo}\n${t.explicacao}\n\n`;
        if (t.pontosChave) {
          t.pontosChave.forEach(p => { md += `- ${p}\n`; });
          md += "\n";
        }
      });
    }

    if (docs['faq']) {
      const f = docs['faq'];
      md += "\n## ❓ FAQ de Prova (NotebookLM)\n\n";
      (f.faqs || []).forEach(item => {
        md += `- **P:** ${item.pergunta}\n  **R:** ${item.resposta}\n\n`;
      });
    }
  
    md += `---\n*Sincronizado automaticamente com o Cofre do Obsidian pelo Nexus Study.*\n`;

    fs.writeFileSync(filePath, md, 'utf8');
    return { sucesso: true, caminho: filePath, nomeArquivo };
  } catch (err) {
    console.error('[DataStore] Erro ao exportar para Obsidian:', err);
    return { sucesso: false, erro: err.message };
  }
}


/* ==========================================================================
   SISTEMA DE GAMIFICAÇÃO APPLE ACTIVITY RINGS & XP
   ========================================================================== */
function calcularNivel(xp) {
  if (xp >= 1500) return { nivel: 5, titulo: 'Titã da Aprovação', xpMin: 1500, proximoXP: 3000, pct: Math.min(100, Math.round(((xp - 1500) / 1500) * 100)) };
  if (xp >= 800)  return { nivel: 4, titulo: 'Mestre da Retenção', xpMin: 800, proximoXP: 1500, pct: Math.round(((xp - 800) / 700) * 100) };
  if (xp >= 400)  return { nivel: 3, titulo: 'Concurseiro Focado', xpMin: 400, proximoXP: 800, pct: Math.round(((xp - 400) / 400) * 100) };
  if (xp >= 150)  return { nivel: 2, titulo: 'Praticante Ativo', xpMin: 150, proximoXP: 400, pct: Math.round(((xp - 150) / 250) * 100) };
  return { nivel: 1, titulo: 'Aprendiz Curioso', xpMin: 0, proximoXP: 150, pct: Math.round((xp / 150) * 100) };
}

function obterGamificacao() {
  const db = carregarBanco();
  if (!db.gamificacao) {
    db.gamificacao = {
      xp: 140,
      streak: db.estatisticas?.streakDias || 3,
      combo: 0,
      melhorCombo: 3,
      metaFoco: 25,
      focoHoje: db.tempoFocoMinutosHoje || 0,
      metaQuestoes: 5,
      questoesHoje: db.estatisticas?.totalRespondidas || 1,
      metaSrs: 3,
      srsHoje: db.estatisticas?.cardsRevisados || 1
    };
    salvarBanco(db);
  }
  const levelInfo = calcularNivel(db.gamificacao.xp);
  return {
    ...db.gamificacao,
    ...levelInfo,
    aneis: {
      foco: { atual: db.gamificacao.focoHoje, meta: db.gamificacao.metaFoco, pct: Math.min(100, Math.round((db.gamificacao.focoHoje / db.gamificacao.metaFoco) * 100)) },
      questoes: { atual: db.gamificacao.questoesHoje, meta: db.gamificacao.metaQuestoes, pct: Math.min(100, Math.round((db.gamificacao.questoesHoje / db.gamificacao.metaQuestoes) * 100)) },
      srs: { atual: db.gamificacao.srsHoje, meta: db.gamificacao.metaSrs, pct: Math.min(100, Math.round((db.gamificacao.srsHoje / db.gamificacao.metaSrs) * 100)) }
    }
  };
}

function registrarAcaoGamificacao(tipo) {
  const db = carregarBanco();
  if (!db.gamificacao) {
    db.gamificacao = {
      xp: 140,
      streak: 3,
      combo: 0,
      melhorCombo: 3,
      metaFoco: 25,
      focoHoje: 0,
      metaQuestoes: 5,
      questoesHoje: 0,
      metaSrs: 3,
      srsHoje: 0
    };
  }

  let xpGanho = 0;
  let bonusCombo = 0;
  let subiuNivel = false;
  const nivelAntes = calcularNivel(db.gamificacao.xp).nivel;

  if (tipo === 'quiz_acerto') {
    db.gamificacao.combo = (db.gamificacao.combo || 0) + 1;
    if (db.gamificacao.combo > (db.gamificacao.melhorCombo || 0)) {
      db.gamificacao.melhorCombo = db.gamificacao.combo;
    }
    bonusCombo = Math.min(25, (db.gamificacao.combo - 1) * 5);
    xpGanho = 20 + bonusCombo;
    db.gamificacao.questoesHoje = (db.gamificacao.questoesHoje || 0) + 1;
  } else if (tipo === 'quiz_erro') {
    db.gamificacao.combo = 0;
    xpGanho = 5;
    db.gamificacao.questoesHoje = (db.gamificacao.questoesHoje || 0) + 1;
  } else if (tipo === 'srs_revisao') {
    xpGanho = 15;
    db.gamificacao.srsHoje = (db.gamificacao.srsHoje || 0) + 1;
  } else if (tipo === 'pomodoro_foco') {
    xpGanho = 50;
    db.gamificacao.focoHoje = (db.gamificacao.focoHoje || 0) + 25;
  }

  db.gamificacao.xp += xpGanho;
  const nivelDepois = calcularNivel(db.gamificacao.xp).nivel;
  if (nivelDepois > nivelAntes) {
    subiuNivel = true;
  }

  salvarBanco(db);
  const estadoAtual = obterGamificacao();
  return {
    ...estadoAtual,
    xpGanho,
    bonusCombo,
    subiuNivel
  };
}


/**
 * Salva um documento gerado pelo Studio (Guia, FAQ, Linha do Tempo, Briefing)
 */
function salvarDocumentoStudio(cadernoId, tipo, documento) {
  const db = carregarBanco();
  if (!db.studioDocumentos) db.studioDocumentos = {};
  if (!db.studioDocumentos[cadernoId]) db.studioDocumentos[cadernoId] = {};
  db.studioDocumentos[cadernoId][tipo] = {
    ...documento,
    atualizadoEm: new Date().toISOString()
  };
  salvarBanco(db);
  return db.studioDocumentos[cadernoId][tipo];
}

function obterDocumentosStudio(cadernoId) {
  const db = carregarBanco();
  if (!db.studioDocumentos || !db.studioDocumentos[cadernoId]) return {};
  return db.studioDocumentos[cadernoId];
}

/**
 * Salva uma anotação avulsa no Studio do Caderno
 */
function salvarNotaStudio(cadernoId, nota) {
  const db = carregarBanco();
  if (!db.studioNotas) db.studioNotas = {};
  if (!db.studioNotas[cadernoId]) db.studioNotas[cadernoId] = [];
  
  const novaNota = {
    id: 'nota_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    titulo: (nota.titulo || 'Nova Nota').trim(),
    conteudo: (nota.conteudo || '').trim(),
    tags: nota.tags || ['estudo'],
    criadaEm: new Date().toISOString()
  };
  
  db.studioNotas[cadernoId].unshift(novaNota);
  salvarBanco(db);
  return novaNota;
}

function listarNotasStudio(cadernoId) {
  const db = carregarBanco();
  if (!db.studioNotas || !db.studioNotas[cadernoId]) return [];
  return db.studioNotas[cadernoId];
}

function excluirNotaStudio(cadernoId, notaId) {
  const db = carregarBanco();
  if (!db.studioNotas || !db.studioNotas[cadernoId]) return false;
  const antes = db.studioNotas[cadernoId].length;
  db.studioNotas[cadernoId] = db.studioNotas[cadernoId].filter(n => n.id !== notaId);
  salvarBanco(db);
  return db.studioNotas[cadernoId].length < antes;
}

function toggleFonteAtiva(cadernoId, fonteId, ativa) {
  const db = carregarBanco();
  if (!db.fontesAtivas) db.fontesAtivas = {};
  if (!db.fontesAtivas[cadernoId]) db.fontesAtivas[cadernoId] = {};
  db.fontesAtivas[cadernoId][fonteId] = !!ativa;
  salvarBanco(db);
  return db.fontesAtivas[cadernoId];
}

function obterFontesAtivas(cadernoId) {
  const db = carregarBanco();
  if (!db.fontesAtivas || !db.fontesAtivas[cadernoId]) return {};
  return db.fontesAtivas[cadernoId];
}

/**
 * Atualiza o conteúdo/título de uma nota existente no Studio
 */
function editarNotaStudio(cadernoId, notaId, novosDados) {
  const db = carregarBanco();
  if (!db.studioNotas || !db.studioNotas[cadernoId]) return null;
  const nota = db.studioNotas[cadernoId].find(n => n.id === notaId);
  if (!nota) return null;
  if (novosDados.titulo !== undefined) nota.titulo = novosDados.titulo.trim();
  if (novosDados.conteudo !== undefined) nota.conteudo = novosDados.conteudo.trim();
  if (novosDados.tags !== undefined) nota.tags = novosDados.tags;
  nota.editadaEm = new Date().toISOString();
  salvarBanco(db);
  return nota;
}

/**
 * Converte uma nota pessoal em Fonte Oficial do caderno para grounding do chat e estúdio
 */
function converterNotaEmFonte(cadernoId, notaId) {
  const db = carregarBanco();
  if (!db.studioNotas || !db.studioNotas[cadernoId]) return null;
  const nota = db.studioNotas[cadernoId].find(n => n.id === notaId);
  if (!nota) return null;

  if (!db.fontesCache) db.fontesCache = {};
  if (!db.fontesCache[cadernoId]) db.fontesCache[cadernoId] = { fontes: [], atualizadoEm: new Date().toISOString() };
  if (!Array.isArray(db.fontesCache[cadernoId].fontes)) db.fontesCache[cadernoId].fontes = [];

  const fonteId = 'nota_' + nota.id;
  // Verifica se já existe fonte com esse ID
  let fonteExistente = db.fontesCache[cadernoId].fontes.find(f => f.id === fonteId);
  const palavras = (nota.conteudo || '').trim().split(/\s+/).filter(Boolean).length;

  if (!fonteExistente) {
    const novaFonte = {
      id: fonteId,
      title: 'Nota: ' + (nota.titulo || 'Sem Título'),
      type: 'user_note',
      snippet: nota.conteudo.length > 250 ? nota.conteudo.slice(0, 250) + '...' : nota.conteudo,
      fullText: nota.conteudo,
      wordCount: palavras,
      criadaEm: new Date().toISOString()
    };
    db.fontesCache[cadernoId].fontes.unshift(novaFonte);
    fonteExistente = novaFonte;
  } else {
    fonteExistente.title = 'Nota: ' + (nota.titulo || 'Sem Título');
    fonteExistente.snippet = nota.conteudo.length > 250 ? nota.conteudo.slice(0, 250) + '...' : nota.conteudo;
    fonteExistente.fullText = nota.conteudo;
    fonteExistente.wordCount = palavras;
  }

  if (!db.fontesAtivas) db.fontesAtivas = {};
  if (!db.fontesAtivas[cadernoId]) db.fontesAtivas[cadernoId] = {};
  db.fontesAtivas[cadernoId][fonteId] = true;

  salvarBanco(db);
  return fonteExistente;
}

module.exports = {
  salvarDocumentoStudio,
  obterDocumentosStudio,
  salvarNotaStudio,
  listarNotasStudio,
  editarNotaStudio,
  converterNotaEmFonte,
  excluirNotaStudio,
  toggleFonteAtiva,
  obterFontesAtivas,
  obterGamificacao,
  registrarAcaoGamificacao,
  carregarBanco,
  salvarBanco,
  adicionarCardSRS,
  obterCardsParaRevisao,
  listarTodosCardsSRS,
  responderCardSRS,
  registrarSessaoPomodoro,
  obterDadosHeatmap,
  exportarParaObsidian
};
