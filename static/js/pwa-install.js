(function () {
    'use strict';

    const VISIT_KEY   = 'bc_visit_count';
    const DISMISS_KEY = 'bc_pwa_dismissed';
    const INSTALLED_KEY = 'bc_pwa_installed';

    // Считаем визиты
    let visits = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10) + 1;
    localStorage.setItem(VISIT_KEY, visits);

    // Не показываем если: первый визит / уже отклонено / уже установлено
    if (visits < 2) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (localStorage.getItem(INSTALLED_KEY)) return;
    // Если уже в standalone-режиме (установлено)
    if (window.matchMedia('(display-mode: standalone)').matches) {
        localStorage.setItem(INSTALLED_KEY, '1');
        return;
    }

    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        deferredPrompt = e;
        showBanner();
    });

    // Для iOS — показываем инструкцию (Safari не поддерживает beforeinstallprompt)
    function isIOS() {
        return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    }
    function isSafari() {
        return /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    }

    // Если iOS — показываем через небольшую задержку
    if (isIOS() && isSafari()) {
        setTimeout(function () {
            if (!localStorage.getItem(DISMISS_KEY) && !localStorage.getItem(INSTALLED_KEY)) {
                showBanner(true);
            }
        }, 1500);
    }

    function showBanner(isIos) {
        // Баннер уже есть?
        if (document.getElementById('pwa-banner')) return;

        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

        const banner = document.createElement('div');
        banner.id = 'pwa-banner';
        banner.setAttribute('role', 'banner');
        banner.innerHTML = isIos
            ? `<div class="pwa-banner__icon">📲</div>
               <div class="pwa-banner__body">
                 <div class="pwa-banner__title">Добавить на главный экран</div>
                 <div class="pwa-banner__sub">Нажмите <span class="pwa-banner__share">⎋</span> → «На экран Домой»</div>
               </div>
               <button class="pwa-banner__close" id="pwaBannerClose" aria-label="Закрыть">✕</button>`
            : `<div class="pwa-banner__icon">📲</div>
               <div class="pwa-banner__body">
                 <div class="pwa-banner__title">Добавить на главный экран</div>
                 <div class="pwa-banner__sub">Быстрый доступ без браузера</div>
               </div>
               <button class="pwa-banner__btn" id="pwaBannerInstall">Установить</button>
               <button class="pwa-banner__close" id="pwaBannerClose" aria-label="Закрыть">✕</button>`;

        document.body.appendChild(banner);

        // Небольшая задержка для анимации
        requestAnimationFrame(function () {
            banner.classList.add('pwa-banner--visible');
        });

        document.getElementById('pwaBannerClose').addEventListener('click', function () {
            dismissBanner(banner);
        });

        const installBtn = document.getElementById('pwaBannerInstall');
        if (installBtn) {
            installBtn.addEventListener('click', function () {
                if (!deferredPrompt) return;
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(function (choice) {
                    if (choice.outcome === 'accepted') {
                        localStorage.setItem(INSTALLED_KEY, '1');
                    }
                    dismissBanner(banner);
                    deferredPrompt = null;
                });
            });
        }

        // Автоматически убираем через 12 секунд
        setTimeout(function () {
            if (document.getElementById('pwa-banner')) {
                dismissBanner(banner);
            }
        }, 12000);
    }

    function dismissBanner(banner) {
        banner.classList.remove('pwa-banner--visible');
        localStorage.setItem(DISMISS_KEY, '1');
        setTimeout(function () {
            if (banner.parentNode) banner.parentNode.removeChild(banner);
        }, 350);
    }
})();
