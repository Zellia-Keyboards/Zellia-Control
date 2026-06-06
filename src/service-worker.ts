/// <reference lib="webworker" />
import { build, files, version } from '$service-worker';

const worker = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `zellia-control-${version}`;
const ASSETS = [...build, ...files];
const ASSET_PATHS = new Set(ASSETS);

worker.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => worker.skipWaiting())
  );
});

worker.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => worker.clients.claim())
  );
});

worker.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== worker.location.origin) return;

  if (ASSET_PATHS.has(url.pathname)) {
    event.respondWith(
      caches.match(url.pathname).then(response => response ?? fetch(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then(response => response ?? Response.error())
    )
  );
});

worker.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    worker.skipWaiting();
  }
});
