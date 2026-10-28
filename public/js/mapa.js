'use strict';

/**
 * ============================================================================
 *  public/js/mapa.js — Sistema Multi-Estilos de Mapas Mentais (Nexus Study)
 *  4 Estilos Visuais de Alta Retenção:
 *   1. 🏛️ Barroco Sketchnote (Editorial Ilustrado)
 *   2. 🎯 Fichamento Concurso (IMEF - "Tudo o que a Banca Cobra")
 *   3. 🌿 Radial Orgânico (História / Ramos Sinuosos Coloridos)
 *   4. ✏️ Minimalista Pop (Cartoon / Alfredo Vela)
 * ============================================================================
 */

const SketchnoteState = {
  dados: null,
  temaVisual: 'paper', // 'paper' ou 'dark'
  estiloVisual: 'barroco', // 'barroco' | 'concurso' | 'radial' | 'minimal'
  audioTocando: null,
  cadernoIdAtual: null
};

// ============================================================================
// BANCO DE DADOS DE DEMONSTRAÇÃO DE ALTA FIDELIDADE
// ============================================================================

// 1. ESTILO BARROCO EDITORIAL
const DADOS_ARTE_BARROCA = {
  tipo: "sketchnote_v1",
  estilo: "barroco",
  name: "ARTE BARROCA NO BRASIL",
  temaCentral: "ARTE BARROCA",
  temaCentralSub: "NO BRASIL",
  subtitulo: "FÉ, ARTE E IDENTIDADE COLONIAL",
  importancia: "A Arte Barroca no Brasil é símbolo da fé, da cultura e da identidade do povo colonial, deixando um patrimônio artístico que encanta até hoje!",
  historia: [
    "Surge no Brasil no final do século XVII e se desenvolve ao longo do século XVIII.",
    "Expressa a fé católica da época colonial e o poder da Igreja.",
    "Mistura influências europeias (portuguesas) com elementos locais.",
    "Forte ligação com o Ciclo do Ouro e o crescimento das cidades."
  ],
  caracteristicas: [
    { icone: "⛪", titulo: "Religiosidade intensa", desc: "Foco na transcendência e na salvação da alma." },
    { icone: "⚜️", titulo: "Ornamentação rica", desc: "Talha dourada exuberante e detalhes minuciosos." },
    { icone: "✨", titulo: "Uso abundante do ouro", desc: "Douramento de altares, tetos e imagens sacras." },
    { icone: "❤️", titulo: "Emoção, drama e movimento", desc: "Expressões faciais vivas, panejamento dinâmico." },
    { icone: "🏛️", titulo: "Formas curvas e contrastes", desc: "Volutas, arcos e jogo dramático de luz e sombra." }
  ],
  ondeSeDesenvolveu: [
    { local: "Minas Gerais", desc: "Principal centro do Barroco brasileiro, ligado ao Ciclo do Ouro." },
    { local: "Bahia", desc: "Grandes igrejas monumentais e produção artística marcante." },
    { local: "Pernambuco", desc: "Igrejas e obras de forte influência barroca e litorânea." }
  ],
  principaisArtistas: [
    {
      nome: "ALEIJADINHO",
      sub: "Antônio Francisco Lisboa",
      badge: "ESCULTOR E ARQUITETO",
      desc: "Maior nome do Barroco brasileiro.",
      obras: "Obras: Profetas de Congonhas, igrejas e projetos em Minas Gerais."
    },
    {
      nome: "MESTRE ATAÍDE",
      badge: "PINTOR",
      desc: "Pinturas de forte expressão religiosa e cores marcantes.",
      obras: "Obras: Igreja de São Francisco de Assis, em Ouro Preto."
    },
    {
      nome: "MANUEL DA COSTA ATAÍDE",
      badge: "ENTALHADOR E ESCULTOR",
      desc: "Irmão de Mestre Ataíde. Talento no entalhe e na escultura colonial."
    },
    {
      nome: "DOMINGOS DA CONCEIÇÃO",
      badge: "ESCULTOR",
      desc: "Criador de imagens sacras de grande expressividade e devoção."
    }
  ],
  expressoesArtisticas: [
    { titulo: "ARQUITETURA", icone: "⛪", desc: "Igrejas imponentes, fachadas elaboradas e interiores ricos em detalhes." },
    { titulo: "ESCULTURA", icone: "🗿", desc: "Imagens sacras cheias de expressão, dramaticidade e rocha-sabão." },
    { titulo: "PINTURA", icone: "🎨", desc: "Painéis, tetos e santos com cores intensas e cenas religiosas em perspectiva." }
  ],
  linhaDoTempo: [
    { fase: "Final do séc. XVII", desc: "Chegada e adaptação do Barroco em terras brasileiras." },
    { fase: "Século XVIII", desc: "Apogeu do Barroco, impulsionado pelo Ciclo do Ouro em Minas." },
    { fase: "Final do séc. XVIII", desc: "Início da transição para o Rococó e estilos neoclássicos." }
  ],
  obrasLocais: [
    { titulo: "SANTUÁRIO DE BOM JESUS DE MATOSINHOS", cidade: "Congonhas - MG", desc: "Conjunto de 12 profetas esculpidos em pedra-sabão por Aleijadinho." },
    { titulo: "IGREJA DE SÃO FRANCISCO DE ASSIS", cidade: "Ouro Preto - MG", desc: "Pinturas no teto de Mestre Ataíde e rica decoração interna." },
    { titulo: "IGREJA DE SÃO FRANCISCO", cidade: "Salvador - BA", desc: "Exemplo marcante da 'Igreja de Ouro' na Bahia colonial." }
  ],
  citacaoFinal: "A arte barroca brasileira é mais que beleza: é fé que se transforma em ouro, madeira e cor."
};

// 2. ESTILO FICHAMENTO CONCURSO (IMEF / RENASCIMENTO E CLASSICISMO)
const DADOS_RENASCIMENTO_IMEF = {
  tipo: "sketchnote_v1",
  estilo: "concurso",
  name: "RENASCIMENTO E CLASSICISMO",
  temaCentral: "RENASCIMENTO E CLASSICISMO",
  subtitulo: "TUDO O QUE A BANCA COBRA EM UM ÚNICO MAPA MENTAL",
  citacaoFinal: "A arte imita a natureza. — Horácio",
  contexto: [
    "Final da Idade Média e transição para a Idade Moderna.",
    "Renascimento Cultural e comercial italiano.",
    "Humanismo e valorização do potencial humano.",
    "Redescoberta da Antiguidade Clássica greco-latina."
  ],
  ideiasPrincipais: [
    { titulo: "ANTROPOCENTRISMO", desc: "O homem é o centro de todas as coisas.", icone: "🧠" },
    { titulo: "RACIONALISMO", desc: "Confiança na razão, na lógica e na ciência.", icone: "🏛️" },
    { titulo: "UNIVERSALISMO", desc: "Valores e verdades humanas universais.", icone: "🌍" },
    { titulo: "NEOPLATONISMO", desc: "Amor idealizado e busca da beleza pura.", icone: "💎" },
    { titulo: "MIMESE", desc: "Imitação fiel e aperfeiçoamento da natureza.", icone: "🎭" }
  ],
  caracteristicas: [
    "Mitologia pagã integrada à arte",
    "Beleza, proporção áurea e equilíbrio",
    "Perfeição formal e rigor métrico",
    "Razão e observação empírica",
    "Natureza como modelo estético",
    "Idealização do amor espiritual",
    "Arte equilibrada e harmoniosa"
  ],
  generosLiterarios: [
    { nome: "ODE", desc: "Tom solene, grandioso e declamatório.", icone: "🎻" },
    { nome: "ÉCLOGA", desc: "Bucólico (pastores, campo e vida simples).", icone: "🌳" },
    { nome: "IDÍLIO", desc: "Poema lírico curto de temas amorosos.", icone: "❤️" },
    { nome: "ELEGIA", desc: "Expressão de luto, tristeza e dor amorosa.", icone: "💧" },
    { nome: "EPIGRAMA", desc: "Poema breve, satírico ou sentencioso.", icone: "📜" },
    { nome: "EPITALÂMIO", desc: "Canto nupcial de exaltação aos noivos.", icone: "💍" }
  ],
  autorDestaque: {
    nome: "LUÍS DE CAMÕES",
    badge: "POETA MAIOR",
    desc: "Principal autor do Classicismo em Portugal. Mestre dos sonetos líricos e decassílabos.",
    obra: "OS LUSÍADAS: epopeia monumental que narra a viagem de Vasco da Gama às Índias."
  },
  quinhentismo: {
    titulo: "QUINHENTISMO (1500)",
    desc: "Produção escrita no Brasil quando os europeus chegaram.",
    informativa: "Literatura Informativa: A Carta de Pero Vaz de Caminha ('certidão de nascimento do Brasil').",
    jesuitica: "Literatura Jesuítica: Pe. José de Anchieta (autos religiosos, poemas pedagógicos e gramática tupi)."
  },
  caiNaProva: [
    "Antropocentrismo vs Teocentrismo Medieval",
    "Mimese: imitação e aperfeiçoamento da natureza",
    "Gêneros poéticos: Ode, Elegia e Epigrama",
    "Camões: Os Lusíadas e sonetos decassílabos",
    "Estrutura do Soneto: 14 versos (2 quartetos, 2 tercetos)",
    "Carta de Caminha: primeiro registro histórico",
    "Pe. José de Anchieta: teatro pedagógico de catequese"
  ],
  linhaDoTempo: [
    { fase: "Idade Média", periodo: "até séc. XIV", desc: "Teocentrismo e feudalismo" },
    { fase: "Renascimento", periodo: "séc. XIV ao XVI", desc: "Humanismo e grandes navegações" },
    { fase: "Classicismo", periodo: "séc. XVI ao XVII", desc: "Rigor métrico e racionalismo" },
    { fase: "Quinhentismo", periodo: "1500 em diante", desc: "Chegada dos portugueses ao Brasil" }
  ]
};

// 3. ESTILO RADIAL ORGÂNICO (BRASIL PERÍODO COLONIAL)
const DADOS_BRASIL_COLONIAL = {
  tipo: "sketchnote_v1",
  estilo: "radial",
  name: "BRASIL PERÍODO COLONIAL",
  temaCentral: "BRASIL",
  subtitulo: "PERÍODO COLONIAL (1500 - 1822)",
  resumoGeral: "O período colonial foi marcado pela exploração econômica, formação da sociedade brasileira, influência da cultura portuguesa e resistência indígena e negra.",
  ramos: [
    {
      id: 1,
      titulo: "1. CHEGADA E COLONIZAÇÃO",
      cor: "#1976D2",
      icone: "⚓",
      itens: [
        "Chegada dos portugueses em 1500.",
        "Exploração do pau-brasil com escambo indígena.",
        "Tratado de Tordesilhas (1494) dividindo terras com a Espanha.",
        "Capitanias Hereditárias (1534) como início da colonização efetiva.",
        "Governo Geral (1549) centralizado em Salvador."
      ]
    },
    {
      id: 2,
      titulo: "2. ECONOMIA COLONIAL",
      cor: "#2E7D32",
      icone: "🌾",
      itens: [
        "Pau-brasil (1500–1530): exploração florestal costeira.",
        "Cana-de-açúcar (1530–séc. XVII): latifúndio e engenhos no Nordeste.",
        "Ciclo do Ouro e Diamantes (séc. XVIII) na região de Minas Gerais.",
        "Mão de obra: escravizada africana predominante na lavoura e minas."
      ]
    },
    {
      id: 3,
      titulo: "3. SOCIEDADE COLONIAL",
      cor: "#E65100",
      icone: "👥",
      itens: [
        "Donatários e Senhores de Engenho: donos da terra e do poder.",
        "Colonos livres: agricultores, capatazes e artesãos.",
        "Clero: jesuítas responsáveis pela catequese e educação.",
        "Indígenas: expulsos, catequizados ou escravizados.",
        "Africanos escravizados: base motriz de toda a riqueza colonial."
      ]
    },
    {
      id: 4,
      titulo: "4. ADMINISTRAÇÃO E POLÍTICA",
      cor: "#6A1B9A",
      icone: "🏛️",
      itens: [
        "Capitanias Hereditárias: primeira divisão em 15 lotes.",
        "Governo Geral: centralização em Salvador e depois no Rio.",
        "Câmaras Municipais: homens-bons gerindo os interesses locais.",
        "Pacto Colonial: Portugal explorava as riquezas com monopólio."
      ]
    },
    {
      id: 5,
      titulo: "5. CULTURA E RELIGIÃO",
      cor: "#AD1457",
      icone: "✝️",
      itens: [
        "Predomínio absoluto da fé católica e atuação inquisitorial.",
        "Missões jesuíticas para aculturação e catequese indígena.",
        "Arquitetura e arte barroca nas igrejas de ouro de MG e Salvador.",
        "Mestiçagem cultural: mistura de influências indígena, africana e lusa."
      ]
    },
    {
      id: 6,
      titulo: "6. RESISTÊNCIAS E CONFLITOS",
      cor: "#C67D00",
      icone: "⚔️",
      itens: [
        "Resistência Indígena contra a invasão das terras natais.",
        "Quilombos: comunidades livres de fugitivos (Quilombo dos Palmares).",
        "Inconfidência Mineira (1789): movimento separatista de elite.",
        "Conjuração Baiana (1798): revolta popular por liberdade e igualdade."
      ]
    },
    {
      id: 7,
      titulo: "7. CONSEQUÊNCIAS",
      cor: "#00695C",
      icone: "🇧🇷",
      itens: [
        "Formação do povo brasileiro a partir da intensa miscigenação.",
        "Estrutura econômica dependente e agroexportadora voltada para fora.",
        "Desigualdade social e fundiária profunda e persistente.",
        "Base histórica para o processo de Independência em 1822."
      ]
    }
  ],
  linhaDoTempo: [
    { ano: "1500", evento: "Chegada dos portugueses" },
    { ano: "1534", evento: "Capitanias Hereditárias" },
    { ano: "1549", evento: "Governo Geral em Salvador" },
    { ano: "1530", evento: "Início do ciclo da cana-de-açúcar" },
    { ano: "1693", evento: "Descoberta do ouro em Minas Gerais" },
    { ano: "1789", evento: "Inconfidência Mineira" },
    { ano: "1822", evento: "Independência do Brasil" }
  ]
};

// 4. ESTILO MINIMALISTA POP / CARTOON (ALFREDO VELA)
const DADOS_MAPA_MENTAL_POP = {
  tipo: "sketchnote_v1",
  estilo: "minimal",
  name: "MAPA MENTAL - GUIA VISUAL",
  temaCentral: "MAPA MENTAL",
  oQueE: {
    titulo: "¿O QUE É?",
    cor: "#F39C12",
    desc: "É um diagrama visual que representa ideias, conexões e conceitos de forma orgânica, simples e altamente memorável."
  },
  usos: {
    titulo: "USOS PRINCIPAIS",
    cor: "#1ABC9C",
    itens: [
      { icone: "💡", titulo: "Gerar Ideias", desc: "Brainstorming rápido e fluxo de pensamentos criativos." },
      { icone: "📖", titulo: "Tomar Notas", desc: "Resumos de livros, aulas e apostilas extensas." },
      { icone: "🧠", titulo: "Memorização", desc: "Fixação duradoura para gabaritar simulados e provas." },
      { icone: "👥", titulo: "Apresentações", desc: "Explicar temas complexos com clareza instantânea." }
    ]
  },
  dicas: {
    titulo: "DICAS DE OURO",
    cor: "#E74C3C",
    itens: [
      { icone: "🎯", titulo: "Design Radial", desc: "Comece pelo centro e ramifique as ideias para fora." },
      { icone: "✏️", titulo: "Adicione Desenhos", desc: "Ícones ativam a memória visual com muito mais força." },
      { icone: "☁️", titulo: "Simplifique Sempre", desc: "Use apenas palavras-chave e tópicos curtos." },
      { icone: "🎨", titulo: "Empregue Cores", desc: "Destaque cada tema com uma cor única e vibrante." }
    ]
  },
  citacaoFinal: "Simplificar é a forma suprema de compreender e dominar qualquer assunto."
};

// ============================================================================
// INICIALIZAÇÃO E CONTROLE
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initSketchnoteBoard();
});

function initSketchnoteBoard() {
  const btnAlternarTema = document.getElementById('btn-mapa-tema');
  const btnExemploBarroco = document.getElementById('btn-mapa-exemplo-barroco');
  const btnGerarNovo = document.getElementById('btn-gerar-novo-mapa');
  const btnOuvirAudio = document.getElementById('btn-mapa-ouvir-audio');
  const btnImprimir = document.getElementById('btn-mapa-imprimir');
  const btnVerExemplo = document.getElementById('btn-mapa-ver-exemplo');
  if (btnVerExemplo) btnVerExemplo.addEventListener('click', verExemploOficialDoEstilo);
  const selectEstilo = document.getElementById('select-estilo-mapa');

  if (selectEstilo) {
    selectEstilo.value = SketchnoteState.estiloVisual;
    selectEstilo.addEventListener('change', (e) => {
      trocarEstiloVisual(e.target.value);
    });
  }

  if (btnAlternarTema) {
    btnAlternarTema.addEventListener('click', toggleTemaVisual);
  }

  if (btnExemploBarroco) {
    btnExemploBarroco.addEventListener('click', () => {
      trocarEstiloVisual('barroco');
      if (selectEstilo) selectEstilo.value = 'barroco';
    });
  }

  if (btnGerarNovo) {
    btnGerarNovo.addEventListener('click', async () => {
      const caderno = window.AppState?.cadernoAtivo;
      if (!caderno) {
        alert('Selecione um caderno na barra lateral para recalcular o mapa!');
        return;
      }
      gerarNovoMapaMentalComIA(caderno.id);
    });
  }

  if (btnOuvirAudio) {
    btnOuvirAudio.addEventListener('click', narrarMapaMentalPorVoz);
  }

  if (btnImprimir) {
    btnImprimir.addEventListener('click', () => {
      window.print();
    });
  }

  // Renderiza imediatamente o modelo Barroco por padrão
  setTimeout(() => {
    if (!SketchnoteState.dados) {
      renderizarSketchnote(DADOS_ARTE_BARROCA);
      atualizarBadgeTema('Arte Barroca no Brasil (Exemplo)');
    }
  }, 100);
}

/**
 * Troca o estilo visual ativo entre os 4 templates
 */
function trocarEstiloVisual(novoEstilo) {
  SketchnoteState.estiloVisual = novoEstilo;

  // Carrega imediatamente o modelo emblemático de alta fidelidade do estilo selecionado
  if (novoEstilo === 'barroco') {
    renderizarSketchnote(DADOS_ARTE_BARROCA);
    atualizarBadgeTema('Arte Barroca no Brasil (Sketchnote)');
  } else if (novoEstilo === 'concurso') {
    renderizarSketchnote(DADOS_RENASCIMENTO_IMEF);
    atualizarBadgeTema('Renascimento & Classicismo (Fichamento IMEF)');
  } else if (novoEstilo === 'radial') {
    renderizarSketchnote(DADOS_BRASIL_COLONIAL);
    atualizarBadgeTema('Brasil Período Colonial (Radial Orgânico)');
  } else if (novoEstilo === 'minimal') {
    renderizarSketchnote(DADOS_MAPA_MENTAL_POP);
    atualizarBadgeTema('Mapa Mental (Cartoon Pop)');
  }
}

/**
 * Alterna entre Modo Papel Antigo e Modo Dark Chalkboard
 */
function toggleTemaVisual() {
  const canvas = document.getElementById('sketchnote-board-container');
  const btn = document.getElementById('btn-mapa-tema');
  if (!canvas) return;

  if (SketchnoteState.temaVisual === 'paper') {
    SketchnoteState.temaVisual = 'dark';
    canvas.classList.remove('theme-paper');
    canvas.classList.add('theme-dark');
    if (btn) btn.innerHTML = '📜 Modo Papel';
  } else {
    SketchnoteState.temaVisual = 'paper';
    canvas.classList.remove('theme-dark');
    canvas.classList.add('theme-paper');
    if (btn) btn.innerHTML = '🌙 Modo Dark';
  }
}

/**
 * Carrega mapa mental do caderno ativo ou abre modelo exemplar
 */
async function carregarMapaMentalDoCaderno(cadernoId) {
  SketchnoteState.cadernoIdAtual = cadernoId;
  const statusEl = document.getElementById('mapa-status-text');

  if (!cadernoId) {
    trocarEstiloVisual(SketchnoteState.estiloVisual);
    if (statusEl) statusEl.textContent = '💡 Toque em qualquer bloco para explicar com a Júlia (Feynman)';
    return;
  }

  if (statusEl) statusEl.textContent = 'Carregando resumo visual...';

  try {
    const res = await fetch(`/api/notebooks/${cadernoId}/mapa-mental`);
    const data = await res.json();

    if (data && (data.tipo === 'sketchnote_v1' || data.temaCentral || data.historia)) {
      SketchnoteState.dados = data;
      renderizarSketchnote(data);
    } else if (data && data.children) {
      const convertido = converterArvoreParaSketchnote(data);
      SketchnoteState.dados = convertido;
      renderizarSketchnote(convertido);
    } else {
      trocarEstiloVisual(SketchnoteState.estiloVisual);
    }

    if (statusEl) statusEl.textContent = '✅ Resumo Visual Infográfico Carregado';
  } catch (err) {
    console.warn('[mapa.js] Erro ao carregar mapa, exibindo modelo ilustrado:', err);
    trocarEstiloVisual(SketchnoteState.estiloVisual);
  }
}

/**
 * Gera novo mapa Sketchnote via IA
 */
async function gerarNovoMapaMentalComIA(cadernoId) {
  const btn = document.getElementById('btn-gerar-novo-mapa');
  const statusEl = document.getElementById('mapa-status-text');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '✨ Criando Infográfico...';
  }
  if (statusEl) statusEl.textContent = '🧠 A IA está ilustrando e estruturando os conceitos pedagógicos...';

  try {
    const res = await fetch(`/api/notebooks/${cadernoId}/mindmap/gerar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();

    if (data.mapa) {
      SketchnoteState.dados = data.mapa;
      renderizarSketchnote(data.mapa);
      if (statusEl) statusEl.textContent = '✅ Infográfico gerado com sucesso pela IA!';
    } else {
      await carregarMapaMentalDoCaderno(cadernoId);
    }
  } catch (err) {
    console.error('Erro ao gerar mapa:', err);
    alert('Erro ao gerar mapa mental. Tente novamente.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '✨ Recalcular com IA';
    }
  }
}

// ============================================================================
// DESPACHANTE CENTRAL DE RENDERIZAÇÃO
// ============================================================================

function renderizarSketchnote(dados) {
  SketchnoteState.dados = dados;
  const container = document.getElementById('mindmap-canvas-container');
  if (!container) return;

  const estilo = dados.estilo || SketchnoteState.estiloVisual || 'barroco';

  if (estilo === 'concurso') {
    renderizarEstiloConcurso(dados, container);
  } else if (estilo === 'radial') {
    renderizarEstiloRadial(dados, container);
  } else if (estilo === 'minimal') {
    renderizarEstiloMinimal(dados, container);
  } else {
    renderizarEstiloBarroco(dados, container);
  }
}

// ============================================================================
// 1. RENDERIZADOR: ESTILO BARROCO SKETCHNOTE (EDITORIAL CLÁSSICO)
// ============================================================================

function renderizarEstiloBarroco(dados, container) {
  const titleEl = document.getElementById('mapa-title-text');
  if (titleEl) titleEl.textContent = dados.temaCentral || dados.name || 'Arte Barroca no Brasil';

  const linhaDoTempo = (dados.linhaDoTempo && dados.linhaDoTempo.length) ? dados.linhaDoTempo : [
    { fase: '1. Identificação', desc: 'Localizar as palavras-chave no comando da questão.' },
    { fase: '2. Aplicação da Regra', desc: 'Testar o conceito teórico e verificar exceções.' },
    { fase: '3. Gabarito Seguro', desc: 'Eliminar alternativas e marcar com confiança.' }
  ];

  const svgIgrejaHistorica = `
    <svg viewBox="0 0 160 140" class="sk-sketch-church" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <line x1="80" y1="6" x2="80" y2="24" stroke-width="2.4"/>
      <line x1="73" y1="12" x2="87" y2="12" stroke-width="2.4"/>
      <path d="M70,30 Q80,24 90,30 L90,44 L70,44 Z" />
      <circle cx="80" cy="38" r="4" fill="currentColor"/>
      <line x1="32" y1="16" x2="32" y2="28" stroke-width="2"/>
      <line x1="27" y1="20" x2="37" y2="20" stroke-width="2"/>
      <path d="M22,34 Q32,28 42,34 L44,60 L20,60 Z"/>
      <rect x="26" y="42" width="12" height="14" rx="6"/>
      <line x1="128" y1="16" x2="128" y2="28" stroke-width="2"/>
      <line x1="123" y1="20" x2="133" y2="20" stroke-width="2"/>
      <path d="M118,34 Q128,28 138,34 L140,60 L116,60 Z"/>
      <rect x="122" y="42" width="12" height="14" rx="6"/>
      <path d="M44,58 C52,48 64,48 70,52 C76,46 84,46 90,52 C96,48 108,48 116,58 L116,134 L44,134 Z" fill="rgba(255,255,255,0.06)"/>
      <path d="M48,58 C58,52 64,64 70,60"/>
      <path d="M112,58 C102,52 96,64 90,60"/>
      <rect x="58" y="72" width="14" height="20" rx="7"/>
      <rect x="88" y="72" width="14" height="20" rx="7"/>
      <circle cx="80" cy="74" r="5"/>
      <path d="M68,134 L68,106 Q80,98 92,106 L92,134 Z" fill="currentColor" fill-opacity="0.15"/>
      <line x1="80" y1="102" x2="80" y2="134"/>
      <path d="M64,106 Q80,94 96,106" stroke-width="2.2"/>
      <line x1="14" y1="134" x2="146" y2="134" stroke-width="2.5"/>
      <line x1="22" y1="138" x2="138" y2="138" stroke-width="2"/>
    </svg>
  `;

  const html = `
    <div id="sketchnote-board-container" class="sketchnote-board layout-barroco theme-${SketchnoteState.temaVisual}">
      
      <div class="sk-board-header">
        <div class="sk-board-tag">🏛️ SKETCHNOTE • RESUMO VISUAL EDITORIAL</div>
      </div>

      <div class="sk-grid-container">

        <!-- COLUNA ESQUERDA -->
        <div class="sk-column sk-col-left">

          <!-- 1. HISTÓRIA -->
          <div class="sk-card sk-card-historia" onclick="explicarBlocoComJulia('HISTÓRIA', '${escaparTexto((dados.historia || []).join(' '))}')">
            <div class="sk-banner">
              <span class="sk-banner-text">HISTÓRIA</span>
              <span class="sk-banner-icon">🪶</span>
            </div>
            <ul class="sk-bullet-list">
              ${(dados.historia || []).map(item => `
                <li><span class="sk-dot">•</span> <span>${item}</span></li>
              `).join('')}
            </ul>
          </div>

          <!-- 2. ONDE SE DESENVOLVEU -->
          <div class="sk-card sk-card-locais" onclick="explicarBlocoComJulia('ONDE SE DESENVOLVEU', '${escaparTexto(JSON.stringify(dados.ondeSeDesenvolveu || []))}')">
            <div class="sk-banner">
              <span class="sk-banner-text">ONDE SE DESENVOLVEU?</span>
              <span class="sk-banner-icon">📍</span>
            </div>
            <div class="sk-locais-list">
              ${(dados.ondeSeDesenvolveu || []).map(item => `
                <div class="sk-local-item">
                  <div class="sk-local-pin">📍 <strong>${item.local}</strong></div>
                  <p class="sk-local-desc">${item.desc}</p>
                </div>
              `).join('')}
            </div>
            <div class="sk-sketch-footer-ill">
              <svg viewBox="0 0 120 40" class="sk-casario-ill" fill="none" stroke="currentColor" stroke-width="1.3">
                <path d="M10,36 L10,20 L24,12 L38,20 L38,36 Z"/>
                <rect x="18" y="22" width="6" height="8"/>
                <path d="M42,36 L42,16 L58,8 L74,16 L74,36 Z"/>
                <rect x="52" y="20" width="8" height="10"/>
                <path d="M78,36 L78,22 L92,14 L106,22 L106,36 Z"/>
                <rect x="86" y="24" width="6" height="8"/>
                <line x1="2" y1="36" x2="118" y2="36" stroke-width="1.8"/>
              </svg>
            </div>
          </div>

          <!-- 3. EXPRESSÕES ARTÍSTICAS -->
          <div class="sk-card sk-card-expressoes" onclick="explicarBlocoComJulia('EXPRESSÕES ARTÍSTICAS', '${escaparTexto(JSON.stringify(dados.expressoesArtisticas || []))}')">
            <div class="sk-banner">
              <span class="sk-banner-text">EXPRESSÕES ARTÍSTICAS</span>
              <span class="sk-banner-icon">🎨</span>
            </div>
            <div class="sk-expressoes-grid">
              ${(dados.expressoesArtisticas || []).map(exp => `
                <div class="sk-expressao-item">
                  <div class="sk-exp-ico">${exp.icone}</div>
                  <div class="sk-exp-content">
                    <strong>${exp.titulo}</strong>
                    <p>${exp.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

        <!-- COLUNA CENTRAL -->
        <div class="sk-column sk-col-center">

          <div class="sk-church-wrap">
            ${svgIgrejaHistorica}
          </div>

          <div class="sk-core-emblem" onclick="explicarBlocoComJulia('${escaparTexto(dados.temaCentral)}', '${escaparTexto(dados.importancia || '')}')">
            <div class="sk-rays-decor sk-ray-left">✦ ✧ ✦</div>
            <div class="sk-emblem-inner">
              <h1 class="sk-title-main">${dados.temaCentral || dados.name}</h1>
              ${dados.temaCentralSub ? `<span class="sk-title-sub">${dados.temaCentralSub}</span>` : ''}
            </div>
            <div class="sk-rays-decor sk-ray-right">✦ ✧ ✦</div>
          </div>

          <div class="sk-ribbon-banner">
            <div class="sk-ribbon-tail left"></div>
            <div class="sk-ribbon-content">
              <span>${dados.subtitulo || 'FÉ, ARTE E IDENTIDADE'}</span>
            </div>
            <div class="sk-ribbon-tail right"></div>
          </div>

          <div class="sk-connect-arrow">
            <svg viewBox="0 0 24 30" width="24" height="30" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="2" x2="12" y2="24" stroke-dasharray="3,3"/>
              <polyline points="6,18 12,24 18,18"/>
            </svg>
          </div>

          <div class="sk-card sk-card-importancia" onclick="explicarBlocoComJulia('IMPORTÂNCIA', '${escaparTexto(dados.importancia)}')">
            <div class="sk-imp-header">
              <span class="sk-heart-icon">♡</span>
              <h3>IMPORTÂNCIA</h3>
              <span class="sk-heart-icon">♡</span>
            </div>
            <p class="sk-imp-text">
              ${dados.importancia || 'Resumo essencial de alto impacto pedagógico.'}
            </p>
            <div class="sk-imp-brushes">🖌️ 🎨</div>
          </div>

          <div class="sk-card sk-card-timeline" onclick="explicarBlocoComJulia('LINHA DO TEMPO', '${escaparTexto(JSON.stringify(linhaDoTempo))}')">
            <div class="sk-banner">
              <span class="sk-banner-text">LINHA DO TEMPO</span>
              <span class="sk-banner-icon">⏱️</span>
            </div>
            <div class="sk-timeline-steps">
              ${linhaDoTempo.map((step, idx) => `
                <div class="sk-time-step">
                  <div class="sk-step-title">★ <strong>${step.fase}</strong></div>
                  <p class="sk-step-desc">${step.desc}</p>
                </div>
                ${idx < (linhaDoTempo.length - 1) ? `
                  <div class="sk-step-arrow">↓</div>
                ` : ''}
              `).join('')}
            </div>
          </div>

        </div>

        <!-- COLUNA DIREITA -->
        <div class="sk-column sk-col-right">

          <!-- 4. CARACTERÍSTICAS -->
          <div class="sk-card sk-card-caracteristicas" onclick="explicarBlocoComJulia('CARACTERÍSTICAS', '${escaparTexto(JSON.stringify(dados.caracteristicas || []))}')">
            <div class="sk-banner">
              <span class="sk-banner-text">CARACTERÍSTICAS</span>
              <span class="sk-banner-icon">✨</span>
            </div>
            <div class="sk-caract-list">
              ${(dados.caracteristicas || []).map(car => `
                <div class="sk-caract-row">
                  <div class="sk-caract-ico">${car.icone || '✨'}</div>
                  <div class="sk-caract-text">
                    <strong>${car.titulo || car}</strong>
                    ${car.desc ? `<p>${car.desc}</p>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 5. PRINCIPAIS ARTISTAS -->
          <div class="sk-card sk-card-artistas" onclick="explicarBlocoComJulia('PRINCIPAIS ARTISTAS', '${escaparTexto(JSON.stringify(dados.principaisArtistas || []))}')">
            <div class="sk-banner">
              <span class="sk-banner-text">PRINCIPAIS ARTISTAS</span>
              <span class="sk-banner-icon">👤</span>
            </div>
            <div class="sk-artistas-list">
              ${(dados.principaisArtistas || []).map((art, idx) => `
                <div class="sk-artista-item">
                  <div class="sk-avatar-circle">
                    ${['👨‍🎨', '🎨', '🗿', '🏛️'][idx % 4]}
                  </div>
                  <div class="sk-art-info">
                    <strong>${art.nome}</strong>
                    ${art.sub ? `<span class="sk-art-sub">(${art.sub})</span>` : ''}
                    ${art.badge ? `<span class="sk-art-badge">${art.badge}</span>` : ''}
                    <p class="sk-art-desc">${art.desc}</p>
                    ${art.obras ? `<span class="sk-art-obras">• ${art.obras}</span>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 6. OBRAS E LOCAIS FAMOSOS -->
          <div class="sk-card sk-card-obras" onclick="explicarBlocoComJulia('OBRAS E LOCAIS', '${escaparTexto(JSON.stringify(dados.obrasLocais || []))}')">
            <div class="sk-banner">
              <span class="sk-banner-text">OBRAS E LOCAIS FAMOSOS</span>
              <span class="sk-banner-icon">📷</span>
            </div>
            <div class="sk-obras-list">
              ${(dados.obrasLocais || []).map(obra => `
                <div class="sk-obra-card">
                  <div class="sk-obra-thumb">
                    <span class="sk-thumb-ico">🏛️</span>
                  </div>
                  <div class="sk-obra-info">
                    <strong>${obra.titulo}</strong>
                    <span class="sk-obra-cidade">${obra.cidade || obra.sub || ''}</span>
                    <p class="sk-obra-desc">${obra.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

      </div>

      <!-- RODAPÉ: CITAÇÃO -->
      <div class="sk-quote-footer" onclick="explicarBlocoComJulia('CITAÇÃO DO RESUMO', '${escaparTexto(dados.citacaoFinal)}')">
        <span class="sk-quote-mark left">“</span>
        <blockquote class="sk-quote-body">
          ${dados.citacaoFinal || 'A arte é a expressão máxima da alma humana.'}
        </blockquote>
        <span class="sk-quote-mark right">”</span>
      </div>

    </div>
  `;

  container.innerHTML = html;
}

// ============================================================================
// 2. RENDERIZADOR: ESTILO FICHAMENTO CONCURSO (IMEF / RENASCIMENTO)
// ============================================================================

function renderizarEstiloConcurso(dados, container) {
  const titleEl = document.getElementById('mapa-title-text');
  if (titleEl) titleEl.textContent = dados.temaCentral || dados.name || 'Fichamento de Elite';

  const html = `
    <div id="sketchnote-board-container" class="sketchnote-board layout-concurso theme-${SketchnoteState.temaVisual}">
      
      <!-- TOPO COM EMBLEMA E SLOGAN DA BANCA -->
      <div class="imef-top-banner">
        <div class="imef-crest">
          <span class="imef-crown">👑</span>
          <span class="imef-title">NEXUS CONCURSOS</span>
          <span class="imef-subtitle">IMERSÃO EM ESTUDOS • RETENÇÃO MÁXIMA</span>
        </div>
        <h1 class="imef-headline">${dados.temaCentral || dados.name}</h1>
        <div class="imef-slogan-pill">
          <span>🎯 ${dados.subtitulo || 'TUDO O QUE A BANCA COBRA EM UM ÚNICO MAPA MENTAL'}</span>
        </div>
      </div>

      <!-- GRID DE CONTEÚDO PRINCIPAL -->
      <div class="imef-grid-container">

        <!-- COLUNA 1 -->
        <div class="imef-col">

          <!-- 1. CONTEXTO HISTÓRICO -->
          <div class="imef-card border-gold" onclick="explicarBlocoComJulia('CONTEXTO HISTÓRICO', '${escaparTexto((dados.contexto || dados.historia || []).join(' '))}')">
            <div class="imef-pill-header gold">
              <span class="imef-num">1</span>
              <span>CONTEXTO HISTÓRICO</span>
            </div>
            <div class="imef-sketch-box">
              <span class="sketch-castelo">🏰 🏛️</span>
            </div>
            <ul class="imef-list">
              ${(dados.contexto || dados.historia || []).map(item => `
                <li><span class="imef-check">📜</span> <span>${item}</span></li>
              `).join('')}
            </ul>
          </div>

          <!-- 3. CARACTERÍSTICAS -->
          <div class="imef-card border-green" onclick="explicarBlocoComJulia('CARACTERÍSTICAS', '${escaparTexto(JSON.stringify(dados.caracteristicas || []))}')">
            <div class="imef-pill-header green">
              <span class="imef-num">3</span>
              <span>CARACTERÍSTICAS</span>
            </div>
            <ul class="imef-features-list">
              ${(dados.caracteristicas || []).map(c => `
                <li>
                  <span class="imef-check-circle">✔</span>
                  <strong>${c.titulo || c}</strong>
                </li>
              `).join('')}
            </ul>
          </div>

          <!-- CARAVELA / EXPANSÃO -->
          <div class="imef-caravela-card" onclick="explicarBlocoComJulia('EXPANSÃO E CONQUISTAS', 'Grandes Navegações e difusão das ideias clássicas.')">
            <div class="caravela-ill">⛵ 🌊</div>
            <strong>EXPANSÃO MARÍTIMA & CULTURAL</strong>
            <p>Comunicação e difusão de novas ideias pelo mundo.</p>
          </div>

        </div>

        <!-- COLUNA 2 (HERO CENTRAL: ESTÁTUA + LIVRO ABERTO) -->
        <div class="imef-col imef-col-center">

          <!-- HERO MEDALLION -->
          <div class="imef-hero-niche" onclick="explicarBlocoComJulia('CLÁSSICO IDEAL', '${escaparTexto(dados.citacaoFinal)}')">
            <div class="hero-arch-bg">🏛️</div>
            <div class="hero-sculpture">🗿</div>
            <div class="imef-open-book">
              <div class="book-page left">
                <span class="book-quote">“${dados.citacaoFinal || 'A arte imita a natureza.'}”</span>
              </div>
              <div class="book-feather">🪶 🖋️</div>
            </div>
          </div>

          <!-- 5. AUTOR DESTAQUE / CAMÕES -->
          ${dados.autorDestaque ? `
            <div class="imef-card border-blue imef-author-card" onclick="explicarBlocoComJulia('${dados.autorDestaque.nome}', '${escaparTexto(dados.autorDestaque.obra)}')">
              <div class="imef-pill-header blue">
                <span class="imef-num">5</span>
                <span>${dados.autorDestaque.nome}</span>
              </div>
              <div class="imef-author-body">
                <div class="author-portrait">👨‍🏫</div>
                <div class="author-text">
                  <span class="author-badge">★ ${dados.autorDestaque.badge}</span>
                  <p>${dados.autorDestaque.desc}</p>
                  <small><strong>${dados.autorDestaque.obra}</strong></small>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- 6. MOVIMENTO / QUINHENTISMO -->
          ${dados.quinhentismo ? `
            <div class="imef-card border-teal imef-quinhentismo-card" onclick="explicarBlocoComJulia('QUINHENTISMO', '${escaparTexto(JSON.stringify(dados.quinhentismo))}')">
              <div class="imef-pill-header teal">
                <span class="imef-num">6</span>
                <span>${dados.quinhentismo.titulo}</span>
              </div>
              <p class="quin-desc">${dados.quinhentismo.desc}</p>
              <div class="quin-subgrid">
                <div class="quin-sub-item">
                  <span>📜 <strong>Informativa:</strong></span>
                  <p>${dados.quinhentismo.informativa}</p>
                </div>
                <div class="quin-sub-item">
                  <span>✝️ <strong>Jesuítica:</strong></span>
                  <p>${dados.quinhentismo.jesuitica}</p>
                </div>
              </div>
            </div>
          ` : ''}

        </div>

        <!-- COLUNA 3 -->
        <div class="imef-col">

          <!-- 2. IDEIAS PRINCIPAIS -->
          <div class="imef-card border-cyan" onclick="explicarBlocoComJulia('IDEIAS PRINCIPAIS', '${escaparTexto(JSON.stringify(dados.ideiasPrincipais || []))}')">
            <div class="imef-pill-header cyan">
              <span class="imef-num">2</span>
              <span>IDEIAS PRINCIPAIS</span>
            </div>
            <div class="imef-concepts-list">
              ${(dados.ideiasPrincipais || []).map(ideia => `
                <div class="concept-row">
                  <span class="concept-ico">${ideia.icone}</span>
                  <div class="concept-desc">
                    <strong>${ideia.titulo}</strong>
                    <p>${ideia.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 4. GÊNEROS LITERÁRIOS / FORMAS -->
          ${dados.generosLiterarios ? `
            <div class="imef-card border-purple" onclick="explicarBlocoComJulia('GÊNEROS LITERÁRIOS', '${escaparTexto(JSON.stringify(dados.generosLiterarios || []))}')">
              <div class="imef-pill-header purple">
                <span class="imef-num">4</span>
                <span>GÊNEROS LITERÁRIOS</span>
              </div>
              <div class="generos-list">
                ${(dados.generosLiterarios || []).map(g => `
                  <div class="genero-item">
                    <span class="g-ico">${g.icone}</span>
                    <div class="g-text">
                      <strong>${g.nome}</strong>: <span>${g.desc}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- BLOCO POST-IT AMARELO: "📌 CAI NA PROVA!" -->
          <div class="sk-postit-cai-na-prova" onclick="explicarBlocoComJulia('MACETES CAI NA PROVA', '${escaparTexto((dados.caiNaProva || []).join(' | '))}')">
            <div class="postit-pin">📌</div>
            <h3 class="postit-title">CAI NA PROVA!</h3>
            <ul class="postit-list">
              ${(dados.caiNaProva || []).map(ponto => `
                <li>${ponto.startsWith('★') ? ponto : '★ ' + ponto}</li>
              `).join('')}
            </ul>
          </div>

        </div>

      </div>

      <!-- RÉGUA DA LINHA DO TEMPO HORIZONTAL -->
      <div class="imef-timeline-ruler">
        <div class="ruler-title">LINHA DO TEMPO HISTÓRICA</div>
        <div class="ruler-track">
          ${linhaDoTempo.map((step, idx) => `
            <div class="ruler-step">
              <div class="ruler-step-ill">${['🏰', '🏛️', '📜', '⛵'][idx % 4]}</div>
              <strong>${step.fase}</strong>
              <span>${step.periodo || step.data || ''}</span>
            </div>
            ${idx < (dados.linhaDoTempo.length - 1) ? `<div class="ruler-arrow">➔</div>` : ''}
          `).join('')}
        </div>
      </div>

    </div>
  `;

  container.innerHTML = html;
}

// ============================================================================
// 3. RENDERIZADOR: ESTILO RADIAL ORGÂNICO (BRASIL COLONIAL / RAMOS)
// ============================================================================

function renderizarEstiloRadial(dados, container) {
  const titleEl = document.getElementById('mapa-title-text');
  if (titleEl) titleEl.textContent = dados.temaCentral || dados.name || 'Mapa Radial Orgânico';

  // Adaptador universal para qualquer caderno de estudos
  const ramos = (dados.ramos && dados.ramos.length) ? dados.ramos : [
    {
      id: 1,
      titulo: "1. CONCEITOS BASILARES",
      cor: "#1976D2",
      icone: "🎯",
      itens: (dados.historia && dados.historia.length) ? dados.historia : [
        "Fundamentos essenciais da matéria.",
        "Critérios de incidência e identificação.",
        "Definições teóricas basilares."
      ]
    },
    {
      id: 2,
      titulo: "2. REGRAS E APLICAÇÃO",
      cor: "#2E7D32",
      icone: "⚖️",
      itens: (dados.caracteristicas || []).map(c => typeof c === 'object' ? `${c.titulo}: ${c.desc || ''}` : c)
    },
    {
      id: 3,
      titulo: "3. CRITÉRIOS DE PROVA",
      cor: "#E65100",
      icone: "🔍",
      itens: (dados.principaisArtistas || []).map(a => typeof a === 'object' ? `${a.nome} (${a.badge || 'DESTAQUE'}): ${a.desc || ''}` : a)
    },
    {
      id: 4,
      titulo: "4. CASOS PRÁTICOS & QUESTÕES",
      cor: "#6A1B9A",
      icone: "📖",
      itens: (dados.expressoesArtisticas || []).map(e => typeof e === 'object' ? `${e.titulo}: ${e.desc || ''}` : e)
    },
    {
      id: 5,
      titulo: "5. CAMPOS DE INCIDÊNCIA",
      cor: "#AD1457",
      icone: "📍",
      itens: (dados.ondeSeDesenvolveu || []).map(l => typeof l === 'object' ? `${l.local}: ${l.desc || ''}` : l)
    },
    {
      id: 6,
      titulo: "6. DICAS & MACETES FEYNMAN",
      cor: "#00695C",
      icone: "💡",
      itens: (dados.obrasLocais || []).map(o => typeof o === 'object' ? `${o.titulo}: ${o.desc || ''}` : o)
    }
  ];

  const linhaDoTempo = (dados.linhaDoTempo && dados.linhaDoTempo.length) ? dados.linhaDoTempo : [
    { ano: "Fase 1", evento: "Identificação das palavras-chave no comando da questão" },
    { ano: "Fase 2", evento: "Aplicação da regra geral e eliminação de distratores" },
    { ano: "Fase 3", evento: "Conferência de exceções e gabarito seguro" }
  ];

  const html = `
    <div id="sketchnote-board-container" class="sketchnote-board layout-radial theme-${SketchnoteState.temaVisual}">
      
      <!-- PERGAMINHO DE RESUMO GERAL TOPO -->
      <div class="radial-scroll-summary" onclick="explicarBlocoComJulia('RESUMO GERAL', '${escaparTexto(dados.resumoGeral || '')}')">
        <div class="scroll-edge top"></div>
        <div class="scroll-content">
          <h3>RESUMO GERAL</h3>
          <p>${dados.resumoGeral || 'Visão sistêmica e ramificada de todas as forças estruturantes do tema.'}</p>
        </div>
        <div class="scroll-edge bottom"></div>
      </div>

      <!-- NÚCLEO CENTRAL RADIAL -->
      <div class="radial-center-seal" onclick="explicarBlocoComJulia('${escaparTexto(dados.temaCentral)}', '${escaparTexto(dados.subtitulo || '')}')">
        <div class="seal-inner-circle">
          <div class="seal-illustration">⚓ ⛵ 🏛️</div>
          <h1 class="seal-title">${dados.temaCentral}</h1>
          <span class="seal-subtitle">${dados.subtitulo || ''}</span>
        </div>
      </div>

      <!-- GRADE DOS RAMOS COLORIDOS COM BORDAS VIBRANTES -->
      <div class="radial-branches-grid">
        ${ramos.map((ramo) => `
          <div class="radial-branch-card" style="--branch-color: ${ramo.cor};" onclick="explicarBlocoComJulia('${escaparTexto(ramo.titulo)}', '${escaparTexto(ramo.itens.join(' '))}')">
            
            <div class="branch-card-header" style="background-color: ${ramo.cor};">
              <span class="branch-icon">${ramo.icone}</span>
              <h3 class="branch-title">${ramo.titulo}</h3>
            </div>

            <div class="branch-card-body">
              <ul class="branch-items-list">
                ${ramo.itens.map(item => `
                  <li>
                    <span class="branch-bullet" style="color: ${ramo.cor};">•</span>
                    <span>${item}</span>
                  </li>
                `).join('')}
              </ul>
            </div>

          </div>
        `).join('')}
      </div>

      <!-- PAINEL DUPLO INFERIOR: MAPA / TRATADO & LINHA DO TEMPO EM PERGAMINHO -->
      <div class="radial-bottom-panels">
        
        <div class="radial-map-box">
          <div class="map-badge">MAPA DE INCIDÊNCIA TERRITORIAL</div>
          <div class="map-placeholder">
            <span>🗺️ Linha de Demarcação & Território Brasileiro</span>
          </div>
        </div>

        <div class="radial-timeline-parchment">
          <div class="parchment-header">LINHA DO TEMPO CRONOLÓGICA</div>
          <div class="parchment-timeline-list">
            ${linhaDoTempo.map(item => `
              <div class="parchment-time-row">
                <span class="time-year">★ ${item.ano || item.fase}</span>
                <span class="time-event">${item.evento || item.desc}</span>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

    </div>
  `;

  container.innerHTML = html;
}

// ============================================================================
// 4. RENDERIZADOR: ESTILO MINIMALISTA POP / CARTOON (ALFREDO VELA)
// ============================================================================

function renderizarEstiloMinimal(dados, container) {
  const titleEl = document.getElementById('mapa-title-text');
  if (titleEl) titleEl.textContent = dados.temaCentral || dados.name || 'Mapa Mental Pop';

  const oQueE = dados.oQueE || {
    titulo: "O QUE É?",
    cor: "#F39C12",
    desc: dados.importancia || `Diagrama visual estruturado sobre ${dados.temaCentral || dados.name}.`
  };

  const usos = usos || {
    titulo: "APLICAÇÕES PRINCIPAIS",
    cor: "#1ABC9C",
    itens: (dados.caracteristicas && dados.caracteristicas.length) ? (dados.caracteristicas || []).map(c => ({
      icone: c.icone || "💡",
      titulo: c.titulo || c,
      desc: c.desc || "Ponto de diferenciação e acerto em prova."
    })) : [
      { icone: "💡", titulo: "Regra Fundamental", desc: "Aplicação direta em enunciados conceituais." },
      { icone: "📖", titulo: "Interpretação", desc: "Compreensão rápida da intenção da banca examinadora." },
      { icone: "🧠", titulo: "Gatilho de Memória", desc: "Associação mental rápida para lembrar no dia da prova." },
      { icone: "🎯", titulo: "Eliminação", desc: "Critério de eliminação das 4 alternativas incorretas." }
    ]
  };

  const dicas = dicas || {
    titulo: "DICAS & MACETES DE PROVA",
    cor: "#E74C3C",
    itens: (dados.principaisArtistas && dados.principaisArtistas.length) ? (dados.principaisArtistas || []).map(a => ({
      icone: "⚡",
      titulo: a.nome || a,
      desc: a.desc || a.obras || "Ponto crítico de diferenciação."
    })) : [
      { icone: "⚡", titulo: "Atenção a Pegadinhas", desc: "Palavras absolutistas como 'sempre', 'nunca' e 'exclusivamente'." },
      { icone: "✏️", titulo: "Palavras-Chave", desc: "Destaque os termos nucleares do enunciado antes de ler as opções." },
      { icone: "🔍", titulo: "Comando da Questão", desc: "Cuidado para não marcar a incorreta quando se pede a correta!" },
      { icone: "💎", titulo: "Analogia Feynman", desc: "Explique a regra com suas próprias palavras para reter para sempre." }
    ]
  };

  const html = `
    <div id="sketchnote-board-container" class="sketchnote-board layout-minimal theme-${SketchnoteState.temaVisual}">
      
      <div class="pop-main-header">
        <h1 class="pop-page-title">${dados.temaCentral || 'MAPA MENTAL'}</h1>
      </div>

      <div class="pop-layout-wrapper">
        
        <!-- NUVEM CENTRAL VIBRANTE -->
        <div class="pop-cloud-container">
          <div class="pop-cloud-shape" style="background-color: ${dados.nuvemCor || '#F38235'};" onclick="explicarBlocoComJulia('${escaparTexto(dados.temaCentral)}', 'Conceito central do mapa mental.')">
            <span class="cloud-text-top">MAPA</span>
            <span class="cloud-text-bottom">MENTAL</span>
          </div>
        </div>

        <!-- BLOCOS AO REDOR -->
        <div class="pop-cards-grid">

          <!-- 1. O QUE É -->
          ${`
            <div class="pop-card pop-card-what" onclick="explicarBlocoComJulia('${escaparTexto(oQueE.titulo)}', '${escaparTexto(oQueE.desc)}')">
              <div class="pop-header-pill" style="background-color: ${oQueE.cor || '#F4A228'};">
                ${oQueE.titulo}
              </div>
              <div class="pop-body-bubble">
                <p>${oQueE.desc}</p>
              </div>
            </div>
          `}

          <!-- 2. USOS -->
          ${`
            <div class="pop-card pop-card-uses" onclick="explicarBlocoComJulia('${escaparTexto(usos.titulo)}', '${escaparTexto(JSON.stringify(usos.itens))}')">
              <div class="pop-header-pill" style="background-color: ${usos.cor || '#20A39E'};">
                ${usos.titulo}
              </div>
              <div class="pop-body-bubble">
                <div class="pop-icons-list">
                  ${usos.itens.map(item => `
                    <div class="pop-item-row">
                      <span class="pop-ico">${item.icone}</span>
                      <div class="pop-item-info">
                        <strong>${item.titulo || ''}</strong>
                        <p>${item.desc || item.texto || item}</p>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `}

          <!-- 3. DICAS / MACETES -->
          ${`
            <div class="pop-card pop-card-tips" onclick="explicarBlocoComJulia('${escaparTexto(dicas.titulo)}', '${escaparTexto(JSON.stringify(dicas.itens))}')">
              <div class="pop-header-pill" style="background-color: ${dicas.cor || '#E75A47'};">
                ${dicas.titulo}
              </div>
              <div class="pop-body-bubble">
                <div class="pop-icons-list">
                  ${dicas.itens.map(item => `
                    <div class="pop-item-row">
                      <span class="pop-ico">${item.icone}</span>
                      <div class="pop-item-info">
                        <strong>${item.titulo || ''}</strong>
                        <p>${item.desc || item.texto || item}</p>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `}

        </div>

      </div>

      ${dados.citacaoFinal ? `
        <div class="pop-footer-quote" onclick="explicarBlocoComJulia('CITAÇÃO', '${escaparTexto(dados.citacaoFinal)}')">
          <p>“${dados.citacaoFinal}”</p>
        </div>
      ` : ''}

    </div>
  `;

  container.innerHTML = html;
}

// ============================================================================
// AUXILIARES E INTEGRAÇÃO SOCRÁTICA
// ============================================================================

function converterArvoreParaSketchnote(arvore) {
  const tema = arvore.name || 'Resumo de Estudos';
  const ramos = arvore.children || [];

  return {
    tipo: "sketchnote_v1",
    temaCentral: tema.toUpperCase(),
    subtitulo: "MAPA DE ALTA RETENÇÃO • MÉTODO FEYNMAN",
    importancia: `Resumo esquemático essencial para dominar ${tema} e gabaritar as questões da sua prova.`,
    historia: ramos[0]?.children ? ramos[0].children.map(c => c.name) : [
      `Fundamentos e conceitos basilares de ${tema}.`,
      "Origem dos critérios exigidos em bancas recentes.",
      "Conexões lógicas indispensáveis para resolução rápida."
    ],
    caracteristicas: (ramos[1]?.children || []).slice(0, 5).map((c, i) => ({
      icone: ['🎯', '⚖️', '⚠️', '💡', '📐'][i] || '✨',
      titulo: c.name,
      desc: "Ponto crítico de diferenciação e fixação."
    })),
    ondeSeDesenvolveu: (ramos[2]?.children || []).slice(0, 3).map(c => ({
      local: c.name,
      desc: "Campo de incidência comum em bancas examinadoras."
    })),
    principaisArtistas: (ramos[3]?.children || []).slice(0, 4).map((c, i) => ({
      nome: c.name,
      badge: ['REGRA', 'EXCEÇÃO', 'ATENÇÃO', 'MNEMÔNICO'][i] || 'DESTAQUE',
      desc: "Aplicação indispensável nos enunciados."
    })),
    expressoesArtisticas: [
      { titulo: "CONCEITOS", icone: "📖", desc: "Definições fundamentais e escopo." },
      { titulo: "APLICAÇÕES", icone: "⚡", desc: "Exemplos práticos e exercícios." },
      { titulo: "PEGADINHAS", icone: "⚠️", desc: "Distratores clássicos de banca." }
    ],
    linhaDoTempo: [
      { fase: "1. Identificação", desc: "Localizar as palavras-chave no comando da questão." },
      { fase: "2. Aplicação da Regra", desc: "Testar o conceito teórico e verificar exceções." },
      { fase: "3. Gabarito Seguro", desc: "Eliminar alternativas e marcar com confiança." }
    ],
    obrasLocais: [
      { titulo: "CASO TÍPICO", sub: "Questão Padrão", desc: "Aplicação clássica do tema em concurso." },
      { titulo: "EXCEÇÃO FREQUENTE", sub: "Atenção", desc: "Ponto onde candidatos desatentos perdem pontos." },
      { titulo: "MACETE FEYNMAN", sub: "Memorização", desc: "Analogia simples para reter para sempre." }
    ],
    citacaoFinal: `A verdadeira retenção nasce de compreender o porquê de cada regra de ${tema}.`
  };
}

function explicarBlocoComJulia(tituloBloco, conteudo) {
  if (typeof window.ativarAba === 'function') {
    window.ativarAba('tab-chat');
  }

  const prompt = `Júlia, acabei de clicar no bloco "${tituloBloco}" do nosso Mapa Mental. Me ensine detalhadamente esse conceito usando o Método Feynman e uma analogia prática do dia a dia! Conteúdo do bloco: ${conteudo}`;

  if (typeof window.enviarMensagemParaJulia === 'function') {
    window.enviarMensagemParaJulia(prompt);
  }
}

async function narrarMapaMentalPorVoz() {
  const dados = SketchnoteState.dados;
  if (!dados) return;

  const btn = document.getElementById('btn-mapa-ouvir-audio');
  if (SketchnoteState.audioTocando && !SketchnoteState.audioTocando.paused) {
    SketchnoteState.audioTocando.pause();
    SketchnoteState.audioTocando.currentTime = 0;
    if (btn) btn.innerHTML = '🔊 Narrar Mapa';
    return;
  }

  if (btn) btn.innerHTML = '⏳ Gerando voz...';

  const textoParaNarrar = `Resumo esquemático sobre ${dados.temaCentral || dados.name}. ` +
    (dados.importancia ? `Importância: ${dados.importancia}. ` : '') +
    (dados.subtitulo ? `Lema: ${dados.subtitulo}. ` : '') +
    (dados.citacaoFinal ? `Conclusão: ${dados.citacaoFinal}` : '');

  try {
    const res = await fetch('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: textoParaNarrar, voz: 'pt-BR-FranciscaNeural' })
    });
    const data = await res.json();
    if (data && data.audioUrl) {
      const audio = new Audio(data.audioUrl);
      SketchnoteState.audioTocando = audio;
      if (btn) btn.innerHTML = '⏹️ Parar Voz';
      audio.onended = () => {
        if (btn) btn.innerHTML = '🔊 Narrar Mapa';
      };
      await audio.play();
    }
  } catch (err) {
    console.error('Erro na narração:', err);
    if (btn) btn.innerHTML = '🔊 Narrar Mapa';
  }
}

function atualizarBadgeTema(texto) {
  const badge = document.querySelector('.mapa-badge');
  if (badge) badge.textContent = texto;
}

function escaparTexto(str) {
  if (!str) return '';
  return String(str)
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/\n/g, ' ');
}

// Expõe globalmente
window.carregarMapaMentalDoCaderno = carregarMapaMentalDoCaderno;
window.explicarBlocoComJulia = explicarBlocoComJulia;
window.trocarEstiloVisual = trocarEstiloVisual;


/**
 * Força a exibição da obra de arte de referência oficial do estilo ativo
 */
function verExemploOficialDoEstilo() {
  const estilo = SketchnoteState.estiloVisual;
  if (estilo === 'barroco') {
    renderizarSketchnote(DADOS_ARTE_BARROCA);
    atualizarBadgeTema('Arte Barroca no Brasil (Exemplo Oficial)');
  } else if (estilo === 'concurso') {
    renderizarSketchnote(DADOS_RENASCIMENTO_IMEF);
    atualizarBadgeTema('Renascimento & Classicismo (Exemplo Oficial IMEF)');
  } else if (estilo === 'radial') {
    renderizarSketchnote(DADOS_BRASIL_COLONIAL);
    atualizarBadgeTema('Brasil Período Colonial (Exemplo Oficial)');
  } else if (estilo === 'minimal') {
    renderizarSketchnote(DADOS_MAPA_MENTAL_POP);
    atualizarBadgeTema('Mapa Mental (Exemplo Oficial Cartoon)');
  }
}

window.verExemploOficialDoEstilo = verExemploOficialDoEstilo;
