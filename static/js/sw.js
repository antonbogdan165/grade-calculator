/* =============================================
   BilimCalc Service Worker v1.2
   Файл: static/js/sw.js
   Отдаётся Flask по маршруту /sw.js
   ============================================= */

const CACHE_NAME = "bilimcalc-v1.2.01";

const STATIC_ASSETS = [
    "/",
    "/static/css/style.css",
    "/static/js/main.js"
    // Chart.js CDN кешируется динамически при первом запросе
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.allSettled(
                STATIC_ASSETS.map(url =>
                    cache.add(url).catch(() =>
                        console.warn("[SW] Не удалось закэшировать:", url)
                    )
                )
            )
        ).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const url = new URL(event.request.url);

    // API — Network-first, офлайн-заглушка
    if(url.pathname === "/calculate" || url.pathname === "/trend"){
        event.respondWith(
            fetch(event.request).catch(() => {
                if(url.pathname === "/calculate"){
                    return new Response(
                        JSON.stringify({ total_so: null, total_sor: null, total_soch: null, final_result: null }),
                        { headers: { "Content-Type": "application/json" } }
                    );
                }
                return new Response(
                    JSON.stringify({ error: "offline" }),
                    { headers: { "Content-Type": "application/json" } }
                );
            })
        );
        return;
    }

    // Статика — Cache-first
    event.respondWith(
        caches.match(event.request).then(cached => {
            if(cached) return cached;
            return fetch(event.request).then(response => {
                if(response.ok && event.request.method === "GET"){
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => new Response("Offline", { status: 503 }));
        })
    );
});