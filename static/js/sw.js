const CACHE_NAME = "bilimcalc-__BUILD_TIME__";

// Всё что нужно для работы офлайн
const STATIC_ASSETS = [
    "/",
    "/kak-rasschitat-so",
    "/kak-rasschitat-sor",
    "/kak-rasschitat-soch",
    "/itogovaya-ocenka-za-chetvert",
    "/metodika-rascheta-mon-rk",

    "/static/css/style.css",
    "/static/css/article.css",
    "/static/css/page-loader.css",
    "/static/css/pwa-banner.css",

    "/static/js/main.js",
    "/static/js/theme.js",
    "/static/js/page-loader.js",
    "/static/js/pwa-install.js",

    "/site.webmanifest",
    "/static/icons/favicon-32x32.png",
    "/static/icons/web-app-manifest-192x192.png",
    "/static/icons/web-app-manifest-512x512.png",
    "/static/icons/apple-touch-icon.png",
];

const CDN_PATTERN = /cdn\.jsdelivr\.net/;

/* ── Install: кэшируем всё статичное ── */
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.allSettled(
                STATIC_ASSETS.map(url =>
                    cache.add(url).catch(err =>
                        console.warn("[SW] Не удалось закэшировать:", url, err)
                    )
                )
            )
        ).then(() => self.skipWaiting())
    );
});

/* ── Activate: удаляем старые кэши ── */
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => {
                    console.log("[SW] Удаляем старый кэш:", k);
                    return caches.delete(k);
                })
            )
        ).then(() => self.clients.claim())
    );
});

/* ── Fetch ── */
self.addEventListener("fetch", event => {
    const url = new URL(event.request.url);

    // 1. API /calculate — Network-first, офлайн-заглушка
    if (url.pathname === "/calculate") {
        event.respondWith(
            fetch(event.request.clone()).then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache =>
                        cache.put("/calculate-last", clone)
                    );
                }
                return response;
            }).catch(async () => {
                const cached = await caches.match("/calculate-last");
                if (cached) return cached;
                return new Response(
                    JSON.stringify({
                        total_so: null, total_sor: null,
                        total_soch: null, final_result: null, offline: true
                    }),
                    { headers: { "Content-Type": "application/json" } }
                );
            })
        );
        return;
    }

    // 2. API /trend — офлайн пропускаем
    if (url.pathname === "/trend") {
        event.respondWith(
            fetch(event.request).catch(() =>
                new Response(
                    JSON.stringify({ error: "offline" }),
                    { headers: { "Content-Type": "application/json" } }
                )
            )
        );
        return;
    }

    // 3. CDN (Chart.js) — Cache-first
    if (CDN_PATTERN.test(url.hostname)) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache =>
                            cache.put(event.request, clone)
                        );
                    }
                    return response;
                });
            })
        );
        return;
    }

    // 4. Статика и страницы — Cache-first с ignoreSearch
    // ignoreSearch: true позволяет найти /static/css/style.css
    // даже если в запросе есть ?v=1.4.1
    if (event.request.method !== "GET") return;

    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(cached => {
            if (cached) return cached;

            return fetch(event.request).then(response => {
                if (response.ok && url.origin === self.location.origin) {
                    const clone = response.clone();
                    // Сохраняем по пути БЕЗ query string — чтобы ignoreSearch работал
                    const cacheKey = new Request(url.pathname);
                    caches.open(CACHE_NAME).then(cache =>
                        cache.put(cacheKey, clone)
                    );
                }
                return response;
            }).catch(() => {
                return caches.match("/") || new Response("Offline", { status: 503 });
            });
        })
    );
});