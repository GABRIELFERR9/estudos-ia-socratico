'use strict';

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const { consultarTutor } = require('../services/aiService');

const TTS_CACHE_DIR = path.join(__dirname, '..', '..', 'public', 'tts_cache');
if (!fs.existsSync(TTS_CACHE_DIR)) fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });

/**
 * Chat socrático com a Zelda (NVIDIA NIM Moonshot Kimi-k3)
 */
router.post('/chat', async (req, res) => {
  try {
    const { mensagem, historico = [], contextoMaterial = '', cadernoId = null } = req.body;

    if (!mensagem || !mensagem.trim()) {
      return res.status(400).json({ erro: 'Mensagem vazia' });
    }

    const resposta = await consultarTutor(mensagem, {
      historico,
      contextoMaterial,
      cadernoId
    });

    return res.json(resposta);
  } catch (err) {
    console.error('[aiRoutes] Erro na rota de chat:', err);
    return res.status(500).json({
      sucesso: false,
      texto: 'Erro interno ao consultar o Tutor. Tente novamente.',
      motor: 'erro'
    });
  }
});

/**
 * Informações do Motor de IA Ativo
 */
router.get('/motor', (req, res) => {
  res.json({
    motor: 'NVIDIA NIM',
    modelo: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    role: 'Tutor Socrático Feynman e Gerador de Questões'
  });
});

/**
 * Síntese de Voz Neural Ultra-Realista (Edge-TTS)
 * Voz padrão: pt-BR-FranciscaNeural (humana, didática e expressiva)
 */
router.post('/tts', async (req, res) => {
  try {
    const { texto, voz = 'pt-BR-FranciscaNeural' } = req.body;
    if (!texto || !texto.trim()) {
      return res.status(400).json({ erro: 'Texto vazio para síntese de voz' });
    }

    // Limpa marcações markdown, pontuações estranhas e emojis para fala natural
    const textoLimpo = texto
      .replace(/[\*_#`~>]/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1000);

    const hash = crypto.createHash('md5').update(`${voz}_${textoLimpo}`).digest('hex');
    const fileName = `${hash}.mp3`;
    const filePath = path.join(TTS_CACHE_DIR, fileName);
    const audioUrl = `/tts_cache/${fileName}`;

    // Retorna do cache se já sintetizado
    if (fs.existsSync(filePath)) {
      return res.json({ sucesso: true, audioUrl, cache: true });
    }

    // Executa edge-tts para gerar o arquivo MP3 com voz neural
    const vozSegura = voz.replace(/[^a-zA-Z0-9-]/g, '') || 'pt-BR-FranciscaNeural';
    const textoEscapado = textoLimpo.replace(/"/g, '\\"');
    const cmd = `edge-tts --voice ${vozSegura} --text "${textoEscapado}" --write-media "${filePath}"`;

    exec(cmd, { timeout: 20000 }, (error) => {
      if (error) {
        console.error('[TTS] Falha no comando edge-tts:', error.message);
        return res.status(500).json({ sucesso: false, erro: 'Falha na sintetização de voz' });
      }
      return res.json({ sucesso: true, audioUrl, cache: false });
    });
  } catch (err) {
    console.error('[TTS] Erro no servidor:', err);
    return res.status(500).json({ sucesso: false, erro: 'Erro interno na rota TTS' });
  }
});

/**
 * Explicação imediata de um erro no simulado usando método Feynman
 */
router.post('/explicar-erro', async (req, res) => {
  try {
    const { questao, respostaUsuario, gabarito, justificativa } = req.body;

    const mensagem = `Acabei de errar uma questão no meu simulado. Me ensine usando o Método Feynman e uma analogia prática!\n\n` +
      `📌 **Pergunta:** ${questao}\n` +
      `❌ **O que eu marquei:** ${respostaUsuario}\n` +
      `✅ **Gabarito correto:** ${gabarito}\n` +
      `📖 **Justificativa teórica:** ${justificativa || 'Não informada'}\n\n` +
      `Por favor, me explique por que a minha linha de raciocínio falhou, qual é a analogia para eu nunca mais esquecer, e termine com uma pergunta teste rápida para eu provar que entendi.`;

    const resposta = await consultarTutor(mensagem);
    return res.json(resposta);
  } catch (err) {
    return res.status(500).json({ sucesso: false, texto: 'Não consegui processar a explicação agora.' });
  }
});

/**
 * Explicação rápida de conceito no Método Feynman
 */
router.post('/feynman', async (req, res) => {
  try {
    const { conceito } = req.body;
    const mensagem = `/feynman ${conceito}`;
    const resposta = await consultarTutor(mensagem);
    return res.json(resposta);
  } catch (err) {
    return res.status(500).json({ sucesso: false, texto: 'Erro ao gerar explicação Feynman.' });
  }
});

module.exports = router;
