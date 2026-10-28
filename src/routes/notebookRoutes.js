'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  listarCadernos,
  criarCaderno,
  adicionarFonte,
  adicionarPesquisa,
  listarFontes,
  listarArtefatos,
  obterQuiz,
  regenerarQuiz,
  obterMapaMental,
  regenerarMapaMental,
  obterAudio,
  dispararGeracao
} = require('../services/notebooklmService');

const {
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
  exportarParaObsidian,
  salvarDocumentoStudio,
  obterDocumentosStudio,
  salvarNotaStudio,
  listarNotasStudio,
  editarNotaStudio,
  converterNotaEmFonte,
  excluirNotaStudio,
  toggleFonteAtiva,
  obterFontesAtivas
} = require('../services/dataStore');

const {
  gerarGuiaDeEstudoComIA,
  gerarFAQComIA,
  gerarLinhaDoTempoComIA,
  gerarBriefingDocComIA,
  gerarAudioOverviewRoteiroComIA
} = require('../services/aiGenerator');

// Configuração de upload de arquivos (PDFs, TXTs)
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

/**
 * Listar todos os cadernos
 */
router.get('/', async (req, res) => {
  try {
    let cadernos = await listarCadernos();
    const db = carregarBanco();
    if (!cadernos || cadernos.length === 0) {
      cadernos = db.cadernos || [];
    } else {
      db.cadernos = cadernos;
      salvarBanco(db);
    }
    const srsPendentes = obterCardsParaRevisao().length;
    return res.json({
      cadernos,
      cadernoAtivoId: db.cadernoAtivoId || (cadernos[0] ? cadernos[0].id : null),
      estatisticas: {
        ...(db.estatisticas || {}),
        srsPendentes
      }
    });
  } catch (err) {
    console.error('[notebookRoutes] Erro ao listar:', err);
    return res.status(500).json({ erro: 'Falha ao buscar cadernos' });
  }
});

/**
 * Criar um novo caderno
 */
router.post('/criar', async (req, res) => {
  try {
    const { titulo } = req.body;
    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ erro: 'Título é obrigatório' });
    }
    const novo = await criarCaderno(titulo.trim());
    return res.json({ sucesso: true, caderno: novo });
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao criar caderno' });
  }
});

/**
 * Selecionar caderno ativo
 */
router.post('/selecionar', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ erro: 'ID obrigatório' });
  const db = carregarBanco();
  db.cadernoAtivoId = id;
  salvarBanco(db);
  return res.json({ sucesso: true, cadernoAtivoId: id });
});

/**
 * Listar Fontes do caderno
 */
router.get('/:id/fontes', async (req, res) => {
  try {
    const fontes = await listarFontes(req.params.id);
    return res.json({ fontes });
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao listar fontes' });
  }
});

/**
 * Obter Quiz do caderno
 */
router.get('/:id/quiz', async (req, res) => {
  try {
    const quizData = await obterQuiz(req.params.id);
    return res.json(quizData);
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao carregar quiz' });
  }
});

/**
 * Gerar novo Quiz com IA
 */
router.post('/:id/quiz/gerar', async (req, res) => {
  try {
    const quizData = await regenerarQuiz(req.params.id);
    return res.json({ sucesso: true, quiz: quizData });
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao gerar quiz com IA' });
  }
});

/**
 * Obter Mapa Mental estruturado em JSON
 */
router.get('/:id/mapa-mental', async (req, res) => {
  try {
    const mapaData = await obterMapaMental(req.params.id);
    return res.json(mapaData);
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao carregar mapa mental' });
  }
});

/**
 * Gerar / Recalcular Mapa Mental com IA
 */
router.post('/:id/mindmap/gerar', async (req, res) => {
  try {
    const mapaData = await regenerarMapaMental(req.params.id);
    return res.json({ sucesso: true, mapa: mapaData });
  } catch (err) {
    console.error('[notebookRoutes] Erro na geracao de mapa com IA, recuperando do cache/fallback:', err.message);
    try {
      const mapaFallback = await obterMapaMental(req.params.id);
      return res.json({ sucesso: true, mapa: mapaFallback });
    } catch (e) {
      return res.json({ sucesso: true, mapa: null });
    }
  }
});

/**
 * Obter Audio / Podcast do caderno
 */
router.get('/:id/audio', async (req, res) => {
  try {
    const audioData = await obterAudio(req.params.id);
    return res.json(audioData);
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao carregar áudio' });
  }
});

/**
 * Listar artefatos do caderno
 */
router.get('/:id/artefatos', async (req, res) => {
  try {
    const artefatos = await listarArtefatos(req.params.id);
    return res.json({ artefatos });
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao listar artefatos' });
  }
});

/**
 * Adicionar link ou YouTube como fonte
 */
router.post('/:id/fonte-link', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.trim()) return res.status(400).json({ erro: 'URL é obrigatória' });
    const resultado = await adicionarFonte(req.params.id, url.trim());
    return res.json(resultado);
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao adicionar link' });
  }
});

/**
 * Pesquisa autônoma na Web (Deep Research do NotebookLM)
 */
router.post('/:id/pesquisar', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) return res.status(400).json({ erro: 'Termo de pesquisa é obrigatório' });
    const resultado = await adicionarPesquisa(req.params.id, query.trim());
    return res.json(resultado);
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao executar pesquisa autônoma' });
  }
});

/**
 * Adicionar arquivo PDF/TXT como fonte
 */
router.post('/:id/upload', upload.single('arquivo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
    const resultado = await adicionarFonte(req.params.id, req.file.path);
    return res.json({ sucesso: true, arquivo: req.file.originalname, resultado });
  } catch (err) {
    return res.status(500).json({ erro: 'Falha no upload' });
  }
});

/**
 * Disparar geração de Quiz / Flashcards / Audio / Mind-Map
 */
router.post('/:id/gerar', async (req, res) => {
  try {
    const { tipo } = req.body; // 'quiz', 'audio', 'flashcards', 'mind-map'
    const resultado = await dispararGeracao(req.params.id, tipo || 'quiz');
    return res.json(resultado);
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao disparar geração' });
  }
});

/**
 * Registrar resposta de quiz para estatísticas
 */
router.post('/registrar-resposta', (req, res) => {
  const { acertou } = req.body;
  const db = carregarBanco();
  if (!db.estatisticas) db.estatisticas = { totalRespondidas: 0, acertos: 0, streakDias: 1 };
  db.estatisticas.totalRespondidas = (db.estatisticas.totalRespondidas || 0) + 1;
  if (acertou) db.estatisticas.acertos = (db.estatisticas.acertos || 0) + 1;
  salvarBanco(db);
  return res.json({ sucesso: true, estatisticas: db.estatisticas });
});

// ============================================================================
// ROTAS DE REPETIÇÃO ESPAÇADA (SRS / ANKI)
// ============================================================================

router.get('/srs/fila', (req, res) => {
  const cadernoId = req.query.cadernoId || null;
  const pendentes = obterCardsParaRevisao(cadernoId);
  const totalCards = listarTodosCardsSRS(cadernoId).length;
  const db = carregarBanco();

  return res.json({
    pendentes,
    totalCards,
    estatisticas: db.estatisticas || {}
  });
});

router.post('/srs/adicionar-erro', (req, res) => {
  try {
    const { questao, opcoes, gabarito, justificativa, explicacaoIA, cadernoId } = req.body;
    if (!questao) return res.status(400).json({ erro: 'Questão é obrigatória' });

    const card = adicionarCardSRS({
      questao,
      opcoes,
      gabarito,
      justificativa,
      explicacaoIA,
      cadernoId
    });

    return res.json({ sucesso: true, card });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao adicionar card SRS' });
  }
});

router.post('/srs/responder', (req, res) => {
  const { cardId, qualidade } = req.body;
  if (!cardId || qualidade === undefined) {
    return res.status(400).json({ erro: 'cardId e qualidade são obrigatórios' });
  }

  const atualizado = responderCardSRS(cardId, Number(qualidade));
  if (!atualizado) return res.status(404).json({ erro: 'Card não encontrado' });

  return res.json({ sucesso: true, card: atualizado });
});

// ============================================================================
// ROTAS PARA INTEGRAÇÃO COM BOTS (WhatsApp / Telegram / CBRO)
// ============================================================================

router.get('/:id/pergunta-aleatoria', async (req, res) => {
  try {
    const quiz = await obterQuiz(req.params.id);
    const questions = quiz.questions || [];
    if (questions.length === 0) {
      return res.status(404).json({ erro: 'Nenhuma questão disponível neste caderno' });
    }

    const idx = Math.floor(Math.random() * questions.length);
    const q = questions[idx];

    let textoFormatado = `📚 *SIMULADO DIÁRIO - NEXUS STUDY*\n\n`;
    textoFormatado += `❓ *${q.question}*\n\n`;

    const letras = ['A', 'B', 'C', 'D', 'E'];
    (q.options || []).forEach((opt, i) => {
      const letra = letras[i] || `${i + 1}`;
      textoFormatado += `*${letra})* ${opt.text}\n`;
    });

    textoFormatado += `\n💡 _Responda apenas com a letra correspondente!_`;

    return res.json({
      id: q.id || idx,
      pergunta: q.question,
      textoFormatado,
      opcoes: q.options,
      gabarito: q.answer
    });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao gerar pergunta aleatória' });
  }
});

router.post('/validar-resposta-bot', (req, res) => {
  const { respostaAluno, gabarito, questao, opcoes, justificativa, cadernoId } = req.body;
  const normalizada = (respostaAluno || '').trim().toUpperCase();
  const gabaritoNormalizado = (gabarito || '').trim().toUpperCase();

  const acertou = normalizada === gabaritoNormalizado;

  if (!acertou && questao) {
    adicionarCardSRS({
      questao,
      opcoes,
      gabarito,
      justificativa,
      cadernoId
    });
  }

  return res.json({
    acertou,
    gabarito,
    mensagemRetorno: acertou
      ? '🎉 *Parabéns! Resposta correta!* Continue assim!'
      : `❌ *Ops, resposta incorreta.* O gabarito correto era *${gabarito}*. Essa questão foi adicionada aos seus Flashcards de Repetição Espaçada!`
  });
});

// ============================================================================
// POMODORO, DASHBOARD & OBSIDIAN EXPORT
// ============================================================================

router.post('/pomodoro/concluir', (req, res) => {
  const { minutos = 25 } = req.body;
  const resultado = registrarSessaoPomodoro(Number(minutos));
  return res.json({ sucesso: true, resultado });
});

router.get('/dashboard/metricas', (req, res) => {
  const db = carregarBanco();
  const heatmap = obterDadosHeatmap();
  const totalCards = (db.srsCards || []).length;
  const cardsParaRevisarHoje = obterCardsParaRevisao().length;

  return res.json({
    estatisticas: db.estatisticas || {},
    tempoFocoMinutosHoje: db.tempoFocoMinutosHoje || 0,
    heatmap,
    srs: {
      totalCards,
      pendentesHoje: cardsParaRevisarHoje
    }
  });
});

router.post('/:id/exportar-obsidian', async (req, res) => {
  try {
    const notebookId = req.params.id;
    const { titulo } = req.body;

    const fontes = await listarFontes(notebookId);
    const mapaMental = await obterMapaMental(notebookId);
    const quiz = await obterQuiz(notebookId);

    const resultado = exportarParaObsidian(notebookId, titulo, {
      fontes,
      mapaMental,
      quiz
    });

    return res.json(resultado);
  } catch (err) {
    console.error('[notebookRoutes] Erro na exportação Obsidian:', err);
    return res.status(500).json({ sucesso: false, erro: 'Falha ao exportar nota para o Obsidian' });
  }
});

router.get('/gamificacao/status', (req, res) => {
  try {
    const dados = obterGamificacao();
    return res.json(dados);
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao buscar gamificação' });
  }
});

router.post('/gamificacao/acao', (req, res) => {
  try {
    const { tipo } = req.body;
    const resultado = registrarAcaoGamificacao(tipo);
    return res.json({ sucesso: true, ...resultado });
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao processar ação gamificada' });
  }
});


// ============================================================================
// ROTAS DO STUDIO NOTEBOOKLM (Guia de Estudos, FAQ, Timeline, Notas)
// ============================================================================

/**
 * Obter todos os documentos e notas do Studio para o caderno
 */
router.get('/:id/studio', async (req, res) => {
  try {
    const cadernoId = req.params.id;
    const documentos = obterDocumentosStudio(cadernoId);
    const notas = listarNotasStudio(cadernoId);
    const fontesAtivas = obterFontesAtivas(cadernoId);
    return res.json({ documentos, notas, fontesAtivas });
  } catch (err) {
    console.error('[notebookRoutes] Erro ao carregar studio:', err.message);
    return res.status(500).json({ erro: 'Falha ao carregar studio' });
  }
});

/**
 * Obter texto completo de uma fonte específica para leitura no modal
 */
router.get('/:id/fontes/:fonteId/texto', async (req, res) => {
  try {
    const { id, fonteId } = req.params;
    const { obterTextoFonte } = require('../services/notebooklmService');
    const texto = await obterTextoFonte(id, fonteId);
    return res.json({ sucesso: true, texto });
  } catch (err) {
    console.error('[notebookRoutes] Erro ao extrair texto da fonte:', err);
    return res.status(500).json({ erro: 'Falha ao buscar conteúdo da fonte' });
  }
});

/**
 * Disparar geração de documento do Studio (guia-estudo, faq, timeline)
 */
router.post('/:id/studio/gerar', async (req, res) => {
  try {
    const cadernoId = req.params.id;
    const { tipo, titulo } = req.body; // 'guia-estudo' | 'faq' | 'timeline'
    
    // Obter contexto detalhado das fontes via NotebookLM Grounded Engine
    let contexto = '';
    try {
      const { obterSinteseCaderno } = require('../services/notebooklmService');
      contexto = await obterSinteseCaderno(cadernoId, `Elabore uma síntese detalhada de todos os conceitos, regras, classificações e pontos principais destes materiais para compor um ${tipo}.`);
    } catch (e) {
      console.warn('[notebookRoutes] Falha na síntese do NotebookLM:', e.message);
    }

    if (!contexto) {
      const fontes = await listarFontes(cadernoId);
      contexto = fontes.map(f => f.title + ': ' + (f.snippet || '')).join('\n');
    }

    const nomeCaderno = titulo || 'Caderno de Estudo';

    let documento = null;
    if (tipo === 'faq') {
      documento = await gerarFAQComIA(cadernoId, nomeCaderno, contexto);
    } else if (tipo === 'timeline') {
      documento = await gerarLinhaDoTempoComIA(cadernoId, nomeCaderno, contexto);
    } else if (tipo === 'briefing-doc') {
      documento = await gerarBriefingDocComIA(cadernoId, nomeCaderno, contexto);
    } else if (tipo === 'audio-overview') {
      documento = await gerarAudioOverviewRoteiroComIA(cadernoId, nomeCaderno, contexto);
    } else {
      documento = await gerarGuiaDeEstudoComIA(cadernoId, nomeCaderno, contexto);
    }

    return res.json({ sucesso: true, tipo, documento });
  } catch (err) {
    console.error('[notebookRoutes] Erro na geração do studio:', err.message);
    return res.status(500).json({ erro: 'Falha ao gerar documento do studio' });
  }
});

/**
 * Adicionar nota avulsa no Studio
 */
router.post('/:id/studio/notas', (req, res) => {
  try {
    const cadernoId = req.params.id;
    const { titulo, conteudo, tags } = req.body;
    if (!conteudo || !conteudo.trim()) {
      return res.status(400).json({ erro: 'Conteúdo da nota é obrigatório' });
    }
    const nota = salvarNotaStudio(cadernoId, { titulo, conteudo, tags });
    return res.json({ sucesso: true, nota });
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao salvar nota' });
  }
});

/**
 * Editar nota existente no Studio
 */
router.put('/:id/studio/notas/:notaId', (req, res) => {
  try {
    const { id, notaId } = req.params;
    const { titulo, conteudo, tags } = req.body;
    const notaAtualizada = editarNotaStudio(id, notaId, { titulo, conteudo, tags });
    if (!notaAtualizada) {
      return res.status(404).json({ erro: 'Nota não encontrada' });
    }
    return res.json({ sucesso: true, nota: notaAtualizada });
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao editar nota' });
  }
});

/**
 * Converter uma nota do Studio em Fonte Oficial do Caderno (grounding ativo)
 */
router.post('/:id/studio/notas/:notaId/converter-em-fonte', (req, res) => {
  try {
    const { id, notaId } = req.params;
    const fonteCriada = converterNotaEmFonte(id, notaId);
    if (!fonteCriada) {
      return res.status(404).json({ erro: 'Nota não encontrada para conversão' });
    }
    return res.json({ sucesso: true, fonte: fonteCriada });
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao converter nota em fonte' });
  }
});

/**
 * Excluir nota do Studio
 */
router.delete('/:id/studio/notas/:notaId', (req, res) => {
  try {
    const { id, notaId } = req.params;
    const sucesso = excluirNotaStudio(id, notaId);
    return res.json({ sucesso });
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao excluir nota' });
  }
});

/**
 * Toggle de fonte ativa/inativa no caderno
 */
router.post('/:id/fontes/toggle', (req, res) => {
  try {
    const cadernoId = req.params.id;
    const { fonteId, ativa } = req.body;
    const fontesAtivas = toggleFonteAtiva(cadernoId, fonteId, ativa);
    return res.json({ sucesso: true, fontesAtivas });
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao alternar fonte' });
  }
});

/**
 * Selecionar ou Desmarcar todas as fontes do caderno em lote
 */
router.post('/:id/fontes/toggle-todas', async (req, res) => {
  try {
    const cadernoId = req.params.id;
    const { ativarTodas } = req.body;
    const fontes = await listarFontes(cadernoId);
    let fontesAtivas = {};
    for (const f of fontes) {
      fontesAtivas = toggleFonteAtiva(cadernoId, f.id, !!ativarTodas);
    }
    return res.json({ sucesso: true, fontesAtivas });
  } catch (err) {
    return res.status(500).json({ erro: 'Falha ao alternar fontes em lote' });
  }
});

module.exports = router;
