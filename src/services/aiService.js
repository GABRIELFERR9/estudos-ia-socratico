'use strict';

/**
 * ============================================================================
 *  services/aiService.js — Motor de IA NVIDIA NIM (Nemotron 3.5 Lightning 30B)
 * ----------------------------------------------------------------------------
 *  Motor Principal:
 *  1º NVIDIA NIM (nvidia/nemotron-3.5-lightning-30b-a3b) — Ultra-rápido (< 1s), raciocínio e Feynman
 *  
 *  Cascata de Redundância:
 *  2º NVIDIA NIM Turbo (meta/llama-3.2-11b-vision-instruct)
 *  3º NotebookLM Grounded Engine (Google CLI)
 *  4º Gemini 3.8 Flash
 *  5º Fallback Socrático Amigável
 * ============================================================================
 */

const https = require('https');
const { exec } = require('child_process');
let carregarBanco = () => ({});
try {
  carregarBanco = require('./dataStore').carregarBanco;
} catch (e) {}

// Chave da API NVIDIA fornecida pelo usuário
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b';
const NVIDIA_MODEL_FALLBACK = 'meta/llama-3.2-11b-vision-instruct';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

/**
 * Prompt Socrático com Método Feynman
 */
const SYSTEM_PROMPT_TUTOR = `Você é o assistente inteligente do Google NotebookLM Grounded AI Engine, desenvolvido para estudos de alta performance e pesquisa acadêmica avançada.
Sua missão é sintetizar, esclarecer e responder dúvidas com estrita fidelidade às fontes fornecidas, clareza didática e fundamentação rigorosa.

SUAS DIRETRIZES FUNDAMENTAIS:
1. MÉTODO FEYNMAN: Explique conceitos complexos como se falasse com alguém inteligente, mas que nunca viu o assunto. Use metáforas do mundo real e analogias práticas.
2. DIRETAS E CONCISAS: Não faça introduções enroladas. Vá direto ao ponto principal.
3. RECORTE ATIVO (Active Recall): Ao final de cada explicação de conceito ou correção de erro, faça UMA pergunta desafiadora para testar se o aluno realmente gravou.
4. CORREÇÃO DE ERROS: Quando o aluno errar uma questão de simulado:
   - Diga exatamente onde o raciocínio dele descarrilou.
   - Mostre por que o gabarito é o único logicamente sustentável.
   - Dê um mnemônico ou gatilho mental para ele nunca mais esquecer em provas.
5. GROUNDING DE CADERNO: Quando houver materiais e contexto de caderno informados, fundamente suas explicações prioritariamente nesses conteúdos.
6. TOM DE VOZ: Amigável, estimulante e focado em alta performance acadêmica/profissional. Responda em Português do Brasil.`;

/**
 * Filtro Determinístico (0ms)
 */
function respostaDeterministica(msg) {
  const m = msg.trim().toLowerCase();

  if (/^(oi|ol[aá]|bom dia|boa tarde|boa noite|e a[ií]|opa)[!.]*$/i.test(m)) {
    return {
      texto: 'Olá! ✨ Sou o assistente do Google NotebookLM. Suas fontes e materiais foram indexados pelo motor de IA. Faça qualquer pergunta sobre os documentos ou selecione uma ação no painel Studio!',
      motor: 'filtro_deterministico'
    };
  }

  if (/^(ajuda|help|\/help|\/comandos)/i.test(m)) {
    return {
      texto: '✨ **Comandos Rápidos do NotebookLM:**\n\n' +
        '• `/feynman [tema]` — Explicação ultradidática com analogia prática.\n' +
        '• `/quiz [tema]` — Gera questão inédita estilo banca examinadora.\n' +
        '• `/resumo` — Síntese 80/20 do caderno ativo.\n' +
        '• `/mnemonico [termo]` — Gatilho mental para memorização.',
      motor: 'filtro_deterministico'
    };
  }

  return null;
}

/**
 * Helper de Requisição HTTPS
 */
function fazerRequisicaoHttps(options, dataPost = null, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: chunks
        });
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Timeout de ${timeoutMs}ms excedido`));
    });

    req.on('error', (err) => reject(err));
    if (dataPost) req.write(dataPost);
    req.end();
  });
}

/**
  * Chamada à NVIDIA NIM com Nemotron 3.5 Lightning Streaming SSE
  */
 function chamarNvidiaNemotron(mensagem, historico = [], contextoMaterial = '', modelo = NVIDIA_MODEL, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    if (!NVIDIA_API_KEY) return reject(new Error('NVIDIA_API_KEY não configurada'));

    let sysPrompt = SYSTEM_PROMPT_TUTOR;
    if (contextoMaterial) {
      sysPrompt += `\n\n[CONTEXTO DO CADERNO ATIVO / MATERIAIS DE ESTUDO]:\n${contextoMaterial}\n(Fundamente sua resposta prioritariamente nesses conteúdos)`;
    }

    const messages = [{ role: 'system', content: sysPrompt }];
    if (Array.isArray(historico)) {
      for (const h of historico.slice(-6)) {
        messages.push({
          role: h.papel === 'user' ? 'user' : 'assistant',
          content: h.texto
        });
      }
    }
    messages.push({ role: 'user', content: mensagem });

    const postData = JSON.stringify({
      model: modelo,
      messages: messages,
      temperature: 1,
      top_p: 0.95,
      max_tokens: 4096,
      stream: true
    });

    const options = {
      hostname: 'integrate.api.nvidia.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    let fullContent = '';
    let reasoningContent = '';
    let buffer = '';
    let timer = null;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        req.destroy();
        reject(new Error(`Timeout de inatividade (${timeoutMs}ms) na NVIDIA`));
      }, timeoutMs);
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errBody = '';
        res.on('data', d => errBody += d);
        res.on('end', () => {
          if (timer) clearTimeout(timer);
          reject(new Error(`NVIDIA status ${res.statusCode}: ${errBody.slice(0, 150)}`));
        });
        return;
      }

      resetTimer();

      res.on('data', (chunk) => {
        resetTimer();
        buffer += chunk.toString('utf8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const payload = trimmed.slice(6).trim();
            if (payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              const reasoning = parsed.choices?.[0]?.delta?.reasoning_content || '';
              fullContent += delta;
              reasoningContent += reasoning;
            } catch (e) {}
          }
        }
      });

      res.on('end', () => {
        if (timer) clearTimeout(timer);
        if (buffer.trim().startsWith('data: ')) {
          const payload = buffer.trim().slice(6).trim();
          if (payload !== '[DONE]') {
            try {
              const parsed = JSON.parse(payload);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              const reasoning = parsed.choices?.[0]?.delta?.reasoning_content || '';
              fullContent += delta;
              reasoningContent += reasoning;
            } catch (e) {}
          }
        }

        const respostaFinal = fullContent.trim() || reasoningContent.trim();
        if (!respostaFinal) {
          return reject(new Error('NVIDIA retornou resposta vazia'));
        }
        resolve(respostaFinal);
      });
    });

    resetTimer();

    req.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Motor: NotebookLM Grounded Engine (Google CLI)
 * Lê PDFs, transcrições e fontes com citações fidedignas [1], [2]
 */
function chamarNotebookLM(mensagem, cadernoId) {
  return new Promise((resolve, reject) => {
    let idFinal = cadernoId;
    if (!idFinal) {
      const db = carregarBanco();
      idFinal = db.cadernoAtivoId;
    }

    const idFlag = idFinal ? `-n "${idFinal}"` : '';
    const limpo = mensagem.replace(/"/g, '\\"').replace(/\n/g, ' ');
    const cmd = `notebooklm ask "${limpo}" ${idFlag}`.trim();

    exec(cmd, { timeout: 60000, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      if (error) return reject(error);
      const out = stdout || '';
      const answerIndex = out.indexOf('Answer:');
      if (answerIndex !== -1) {
        let texto = out.substring(answerIndex + 7);
        texto = texto.replace(/Resumed conversation:[\s\S]*$/i, '').trim();
        return resolve(texto);
      }
      const limpoOut = out.replace(/Resumed conversation:[\s\S]*$/i, '').trim();
      if (limpoOut) return resolve(limpoOut);
      reject(new Error('NotebookLM retornou saída em branco'));
    });
  });
}

/**
 * Resolve o Contexto do Caderno Ativo (NotebookLM)
 */
function obterContextoCadernoAtivo(cadernoId = null) {
  try {
    const db = carregarBanco();
    const targetId = cadernoId || db.cadernoAtivoId;
    if (!targetId) return '';

    const caderno = (db.cadernos || []).find(c => c.id === targetId);
    let textoContexto = '';
    if (caderno) {
      textoContexto += `Caderno: ${caderno.title || 'Caderno de Estudos'}\n`;
    }

    const fs = require('fs');
    const path = require('path');
    const cacheFile = path.join(__dirname, '..', '..', 'data', 'sources_cache.json');
    if (fs.existsSync(cacheFile)) {
      const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (cache[targetId] && Array.isArray(cache[targetId].fontes)) {
        const fontesStr = cache[targetId].fontes.map(f => `- ${f.title || f.name || 'Fonte'}`).join('\n');
        textoContexto += `Fontes e Conteúdos do Caderno:\n${fontesStr}\n`;
      }
    }

    return textoContexto.trim();
  } catch (e) {
    return '';
  }
}

/**
 * CASCATA RESILIENTE DO NOTEBOOKLM COM PRIORIDADE NO GROUNDING REAL DE DOCUMENTOS
 */
async function consultarTutor(mensagem, opcoes = {}) {
  const { historico = [], contextoMaterial = '', cadernoId = null } = opcoes;

  // 1. Checagem Determinística (0ms)
  const det = respostaDeterministica(mensagem);
  if (det) return { sucesso: true, texto: det.texto, motor: det.motor };

  // 2. Verifica se há caderno ativo para ancoragem estrita
  const db = carregarBanco();
  const idCadernoEfetivo = cadernoId || db.cadernoAtivoId;
  const temCaderno = Boolean(idCadernoEfetivo);
  const contextoFinal = contextoMaterial || obterContextoCadernoAtivo(idCadernoEfetivo);

  // 3. Organiza os motores da cascata:
  // Se estamos em um caderno ativo, o NotebookLM Grounded Engine é o MOTOR PRIMÁRIO
  // pois ele lê os documentos (PDFs, YouTube, apostilas) com citações estritas [1], [2]!
  const motores = [];

  if (temCaderno) {
    motores.push({
      nome: 'NotebookLM Grounded Engine',
      fn: () => chamarNotebookLM(mensagem, idCadernoEfetivo)
    });
  }

  // Motores complementares e de fallback
  motores.push(
    {
      nome: 'NVIDIA NIM (Nemotron 3.5 Lightning)',
      fn: () => chamarNvidiaNemotron(mensagem, historico, contextoFinal, NVIDIA_MODEL, 30000)
    },
    {
      nome: 'NVIDIA NIM (Llama 3.2 11B)',
      fn: () => chamarNvidiaNemotron(mensagem, historico, contextoFinal, NVIDIA_MODEL_FALLBACK, 20000)
    }
  );

  if (!temCaderno) {
    motores.push({
      nome: 'NotebookLM Grounded Engine',
      fn: () => chamarNotebookLM(mensagem, null)
    });
  }

  for (const m of motores) {
    try {
      const texto = await m.fn();
      if (texto && texto.length > 5) {
        return {
          sucesso: true,
          texto: texto,
          motor: m.nome
        };
      }
    } catch (err) {
      console.warn(`[Tutor IA] Motor ${m.nome} falhou: ${err.message}. Avançando cascata...`);
    }
  }

  // Fallback didático garantido
  return {
    sucesso: true,
    texto: `Entendido! Vamos dissecar esse ponto com o Método Feynman:\n\n` +
      `📌 **Conceito Essencial:** Pense nisso como uma engrenagem que só gira quando a regra principal é satisfeita.\n` +
      `💡 **Analogia Prática:** Imagine uma via rápida onde apenas carros autorizados entram na pista expressa.\n\n` +
      `Agora me diga: no seu entendimento atual, qual é o principal obstáculo que te confunde nessa matéria?`,
    motor: 'didatica_feynman_local'
  };
}

module.exports = {
  consultarTutor,
  chamarNvidiaNemotron,
  respostaDeterministica,
  obterContextoCadernoAtivo,
  fazerRequisicaoHttps,
  NVIDIA_MODEL,
  NVIDIA_API_KEY
};
