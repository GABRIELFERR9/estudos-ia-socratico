# estudos-ia-socratico

Plataforma de estudos com IA: mapas mentais, quizzes e tutor socrático a partir dos seus cadernos.

Plataforma de estudos que transforma os seus cadernos de anotação em mapas mentais e quizzes, com um tutor de IA que ensina por perguntas (método socrático) em vez de entregar a resposta.

## O que faz
- Mapas mentais e quizzes gerados por IA para cada caderno.
- Explicação de qualquer bloco do mapa com a tutora de IA.

## Stack
Node.js, Express e LLMs pela API da NVIDIA (variável `NVIDIA_API_KEY`), com frontend em JavaScript puro.

## Rodar
```bash
npm install
NVIDIA_API_KEY=... node server.js
```

---
Feito por [Gabriel Ferreira](https://github.com/GABRIELFERR9).
