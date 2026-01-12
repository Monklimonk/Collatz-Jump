
const VERSION = "v3";                
const CACHE = "collatzjump-" + VERSION;

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-1024.PNG"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("collatzjump-") && k !== CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function cacheMatch(reqOrUrl) {
  const cache = await caches.open(CACHE);
  return cache.match(reqOrUrl, { ignoreSearch: true });
}

async function cachePut(reqOrUrl, res) {
  const cache = await caches.open(CACHE);
  await cache.put(reqOrUrl, res.clone());
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

 
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        if (net && net.ok) await cachePut("./index.html", net);
        return net;
      } catch (_) {
        return (await cacheMatch("./index.html")) || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cached = await cacheMatch(req);
    if (cached) {
      e.waitUntil(
        fetch(req).then((net) => {
          if (net && net.ok) return cachePut(req, net);
        }).catch(() => {})
      );
      return cached;
    }

    try {
      const net = await fetch(req);
      if (net && net.ok) await cachePut(req, net);
      return net;
    } catch (_) {
      return new Response("", { status: 503 });
    }
  })());
});
