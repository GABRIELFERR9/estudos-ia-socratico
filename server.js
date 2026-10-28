'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const aiRoutes = require('./src/routes/aiRoutes');
const notebookRoutes = require('./src/routes/notebookRoutes');

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Garantir pastas públicas de mídia
const TTS_DIR = path.join(__dirname, 'public', 'tts_cache');
const PODCASTS_DIR = path.join(__dirname, 'public', 'podcasts');
if (!fs.existsSync(TTS_DIR)) fs.mkdirSync(TTS_DIR, { recursive: true });
if (!fs.existsSync(PODCASTS_DIR)) fs.mkdirSync(PODCASTS_DIR, { recursive: true });

// Arquivos estáticos da interface web
app.use(express.static(path.join(__dirname, 'public')));
app.use('/podcasts', express.static(PODCASTS_DIR));
app.use('/tts_cache', express.static(TTS_DIR));

// Rotas da API
app.use('/api/ai', aiRoutes);
app.use('/api/notebooks', notebookRoutes);

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'online', app: 'Estudos IA (NotebookLM + Júlia CBRO)', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 APP DE ESTUDOS IA (NotebookLM + Júlia CBRO)`);
  console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`💡 Pressione CTRL+C para encerrar`);
  console.log(`=======================================================`);
});
