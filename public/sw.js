'use strict';

const CACHE_NAME = 'nexus-study-notebooklm-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/appleAudio.js',
  '/js/game.js',
  '/js/extras.js',
  '/js/app.js',
  '/js/chat.js',
  '/js/studio.js',
  '/js/quiz.js',
  '/js/mapa.js',
  '/js/srs.js',
  '/js/player.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first para desenvolvimento e frescor imediato dos ativos
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/api/')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
