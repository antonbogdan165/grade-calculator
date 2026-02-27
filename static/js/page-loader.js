(function () {

    /* ────────── Прогресс-бар ────────── */
    let _raf = null;

    const Progress = {
        _fill() { return document.getElementById('page-progress-fill'); },

        start() {
            const fill = this._fill();
            if (!fill) return;
            clearTimeout(_raf);
            fill.style.transition = 'none';
            fill.style.width = '0%';
            fill.style.opacity = '1';
            void fill.offsetWidth; // форсируем reflow
            this._animate(10);
        },

        _animate(target) {
            const fill = this._fill();
            if (!fill) return;
            const speed = target < 30 ? 800 : target < 60 ? 1200 : 2000;
            fill.style.transition = `width ${speed}ms cubic-bezier(.2,.9,.25,1)`;
            fill.style.width = target + '%';
            if (target < 85) {
                const next = Math.min(target + Math.random() * 12 + 5, 85);
                _raf = setTimeout(() => this._animate(next), speed * 0.7);
            }
        },

        finish() {
            clearTimeout(_raf);
            const fill = this._fill();
            if (!fill) return;
            fill.style.transition = 'width 220ms ease, opacity 300ms ease 220ms';
            fill.style.width = '100%';
            setTimeout(() => { fill.style.opacity = '0'; }, 260);
            setTimeout(() => {
                fill.style.transition = 'none';
                fill.style.width = '0%';
                fill.style.opacity = '1';
            }, 620);
        }
    };

    /* ────────── Создаём прогресс-бар ────────── */
    function createProgressBar() {
        if (document.getElementById('page-progress-bar')) return;
        const bar = document.createElement('div');
        bar.id = 'page-progress-bar';
        bar.innerHTML = '<div id="page-progress-fill"></div>';
        document.body.prepend(bar);
    }

    /* ────────── Splash — только если нет родного #splash ────────── */
    function createSplashIfNeeded() {
        // index.html уже имеет свой #splash — не создаём второй
        if (document.getElementById('splash')) return;
        // Остальные страницы — показываем только 1 раз за сессию
        if (sessionStorage.getItem('splash_shown')) return;
        sessionStorage.setItem('splash_shown', '1');

        const splash = document.createElement('div');
        splash.id = 'page-splash';
        splash.innerHTML = `
            <div class="splash-logo">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
                    <rect x="2"  y="2"  width="9" height="9" rx="2" fill="#3cb648"/>
                    <rect x="13" y="2"  width="9" height="9" rx="2" fill="#3cb648"/>
                    <rect x="2"  y="13" width="9" height="9" rx="2" fill="#3cb648"/>
                    <path d="M15 18h4M17 16v4" stroke="#3cb648" stroke-width="2.2" stroke-linecap="round"/>
                </svg>
                <span class="splash-name">Bilim<span>Calc</span></span>
            </div>
            <div class="splash-bar-wrap"><div class="splash-bar-fill"></div></div>
        `;
        document.body.prepend(splash);

        setTimeout(() => {
            const fill = splash.querySelector('.splash-bar-fill');
            if (fill) fill.style.width = '100%';
        }, 100);

        setTimeout(() => {
            splash.classList.add('splash--hide');
            setTimeout(() => splash.remove(), 500);
        }, 900);
    }

    /* ────────── Fade-in контента ────────── */
    function fadeInContent() {
        // #main-content — article-страницы через base.html
        // .container — index.html (самостоятельная страница)
        const main = document.getElementById('main-content') || document.querySelector('.container');
        if (!main) return;

        main.style.opacity = '0';
        main.style.transform = 'translateY(8px)';
        main.style.transition = 'none';

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                main.style.transition = 'opacity 320ms ease, transform 320ms ease';
                main.style.opacity = '1';
                main.style.transform = 'translateY(0)';
            });
        });
    }

    /* ────────── Перехват переходов по ссылкам ────────── */
    function interceptLinks() {
        document.addEventListener('click', function (e) {
            const a = e.target.closest('a[href]');
            if (!a) return;
            const href = a.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('#') ||
                href.startsWith('mailto') || a.target === '_blank') return;
            if (href === window.location.pathname) return;

            Progress.start();

            const main = document.getElementById('main-content') || document.querySelector('.container');
            if (main) {
                main.style.transition = 'opacity 160ms ease, transform 160ms ease';
                main.style.opacity = '0';
                main.style.transform = 'translateY(6px)';
            }
        });
    }

    /* ────────── Init ────────── */
    document.addEventListener('DOMContentLoaded', () => {
        createProgressBar();
        createSplashIfNeeded();
        interceptLinks();

        setTimeout(() => {
            Progress.start();
            Progress.finish();
        }, 50);

        fadeInContent();
    });

    window.addEventListener('load', () => Progress.finish());

})();