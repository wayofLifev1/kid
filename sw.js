const CACHE_NAME = 'supertube-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  // Add your game-engine.js and launcher.js here if they exist locally
  // './game-engine.js',
  // './launcher.js' 
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Fetch Event (Offline Capability)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
