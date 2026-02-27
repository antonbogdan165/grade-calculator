(function () {
    const KEY = 'bilimcalc_theme';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const saved = localStorage.getItem(KEY);
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);

    window.ThemeToggle = {
        get() {
            return document.documentElement.getAttribute('data-theme') || 'dark';
        },
        set(t) {
            document.documentElement.setAttribute('data-theme', t);
            localStorage.setItem(KEY, t);
            this._updateBtn();
        },
        toggle() {
            this.set(this.get() === 'dark' ? 'light' : 'dark');
        },
        _updateBtn() {
            const t = this.get();
            const icon = document.getElementById('themeIcon');
            const btn  = document.getElementById('themeBtn');
            if (icon) icon.textContent = t === 'dark' ? '☀️' : '🌙';
            if (btn)  btn.title = t === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему';
        },
        init() { this._updateBtn(); }
    };
})();
