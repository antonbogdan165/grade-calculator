/* ---------- state ---------- */
let so = [];
let sors = [];
const LOCAL_KEY = "grade_calculator_v1";

/* ---------- helpers for DOM animation creation ---------- */
function makeListItem(text, onDelete){
    const el = document.createElement("div");
    el.className = "list-item";
    el.innerHTML = `<span>${text}</span>`;
    const btn = document.createElement("button");
    btn.className = "btn delete";
    btn.innerText = "×";
    btn.style.marginLeft = "6px";
    btn.addEventListener("click", onDelete);
    el.appendChild(btn);
    // force reflow next tick to trigger enter transition
    requestAnimationFrame(()=> el.classList.add("enter"));
    return el;
}

/* ---------- renderers ---------- */
function renderSO(){
    const container = document.getElementById("soList");
    container.innerHTML = "";
    so.forEach((val, idx) => {
        const item = makeListItem(val, async ()=>{
            const capturedVal = val;
            item.classList.add("removing");
            await new Promise(r => setTimeout(r, 260));
            const currentIdx = so.lastIndexOf(capturedVal);
            if(currentIdx !== -1) so.splice(currentIdx, 1);
            saveState();
            renderSO();
            calculate();
            updateTrend();
        });
        container.appendChild(item);
    });

    if(so.length >= 2){
        toggleTrendVisibility(true);
        if(typeof Chart !== "undefined") updateTrend();
    } else {
        toggleTrendVisibility(false);
    }
}

function renderSORS(){
    const container = document.getElementById("sorList");
    container.innerHTML = "";
    sors.forEach((pair, idx) => {
        const [d, m] = pair;
        const text = `${d} / ${m}`;
        const item = makeListItem(text, async ()=>{
            const capturedIdx = idx;
            item.classList.add("removing");
            await new Promise(r => setTimeout(r, 260));
            sors.splice(capturedIdx, 1);
            saveState();
            renderSORS();
            calculate();
        });
        container.appendChild(item);
    });
}

/* ---------- persistence ---------- */
function saveState(){
    const sochDialed = document.getElementById("sochDialed").value;
    const sochMax = document.getElementById("sochMax").value;
    const soch = (sochMax && Number(sochMax) > 0) ? [Number(sochDialed||0), Number(sochMax)] : null;
    const payload = { so, sors, soch };
    try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(payload));
    } catch(e){
        console.warn("localStorage save failed", e);
    }
}

function loadState(){
    try{
        const raw = localStorage.getItem(LOCAL_KEY);
        if(!raw) return;
        const parsed = JSON.parse(raw);
        if(parsed.so && Array.isArray(parsed.so)) so = parsed.so.map(Number);
        if(parsed.sors && Array.isArray(parsed.sors)) sors = parsed.sors.map(p => [Number(p[0]), Number(p[1])]);
        if(parsed.soch && Array.isArray(parsed.soch)){
            document.getElementById("sochDialed").value = parsed.soch[0];
            document.getElementById("sochMax").value = parsed.soch[1];
        }
    }catch(e){
        console.warn("localStorage load failed", e);
    }
}

document.getElementById("sorForm").addEventListener("submit", function(e){
    e.preventDefault();

    const d = Number(document.getElementById("sorDialed").value);
    const m = Number(document.getElementById("sorMax").value);

    const sorDialedEl = document.getElementById("sorDialed");
    const sorMaxEl = document.getElementById("sorMax");

    clearInputError(sorDialedEl);
    clearInputError(sorMaxEl);

    if(!Number.isFinite(m) || m <= 0) return;

    if(d > m){
        sorDialedEl.style.borderColor = "var(--danger)";
        sorMaxEl.style.borderColor = "var(--danger)";
        // FIX 3: pass the form element so error banner appears below it
        showInputError(document.getElementById("sorForm"), "Максимум не может быть меньше набранного");
        return;
    }

    sors.push([Number(d||0), Number(m)]);
    sorDialedEl.value = "";
    sorMaxEl.value = "";
    saveState();
    renderSORS();
    calculate();
});
document.getElementById("clearSoBtn").addEventListener("click", ()=>{
    if(so.length===0) return;
    so = [];
    saveState();
    renderSO();
    calculate();
});
document.getElementById("clearSorsBtn").addEventListener("click", ()=>{
    sors = [];
    const sorDialedEl = document.getElementById("sorDialed");
    const sorMaxEl = document.getElementById("sorMax");
    sorDialedEl.value = "";
    sorMaxEl.value = "";
    clearInputError(sorDialedEl);
    clearInputError(sorMaxEl);
    saveState();
    renderSORS();
    calculate();
});
document.getElementById("clearSochBtn").addEventListener("click", ()=>{
    const dialedEl = document.getElementById("sochDialed");
    const maxEl = document.getElementById("sochMax");
    dialedEl.value = "";
    maxEl.value = "";
    clearInputError(dialedEl);
    clearInputError(maxEl);
    saveState();
    calculate();
});

/* ---------- input error banner ---------- */
const _errorBanners = new Map();

// FIX 3: anchorEl can now be any element (form, input, etc.) — banner always inserts AFTER it
function showInputError(anchorEl, message){
    const card = anchorEl.closest(".card");
    if(!card) return;

    // clear existing banners in this card
    card.querySelectorAll(".input-error-banner").forEach(b => {
        clearTimeout(b._timer);
        b.classList.add("input-error-banner--hide");
        setTimeout(() => b.remove(), 250);
    });

    // shake the anchor element (keep existing behaviour)
    anchorEl.classList.add("shake");
    anchorEl.addEventListener("animationend", () => anchorEl.classList.remove("shake"), { once: true });

    const banner = document.createElement("div");
    banner.className = "input-error-banner";
    banner.innerHTML = `<span class="input-error-icon">!</span><span>${message}</span>`;

    // Найдем ближайшую строку с формой/инпутами (если есть) — иначе вставим в конец карточки.
    const row = anchorEl.closest(".so-row, .sor-row, .soch-row");

    // Сделаем баннер блочным и растянем по ширине карточки
    banner.style.width = "100%";
    banner.style.boxSizing = "border-box";

    // Вставляем баннер _после_ всей строки (row), чтобы он не ломал флекс внутри неё.
    if(row && row.parentNode){
        row.parentNode.insertBefore(banner, row.nextSibling);
    } else if (anchorEl.parentNode){
        // fallback: вставляем после элемента
        anchorEl.parentNode.insertBefore(banner, anchorEl.nextSibling);
    } else {
        card.appendChild(banner);
    }

    const timer = setTimeout(() => {
        banner.classList.add("input-error-banner--hide");
        setTimeout(() => banner.remove(), 250);
    }, 3000);
    banner._timer = timer;
}

function clearInputError(inputEl){
    const card = inputEl.closest(".card");
    if(card){
        card.querySelectorAll(".input-error-banner").forEach(b => {
            clearTimeout(b._timer);
            b.classList.add("input-error-banner--hide");
            setTimeout(() => b.remove(), 250);
        });
    }
    inputEl.style.borderColor = "";
}

/* ---------- debounce ---------- */
function debounce(fn, ms = 250) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
const debouncedCalculate = debounce(calculate, 250);

document.getElementById("sochDialed").addEventListener("input", ()=>{
    validateSoch();
    saveState(); debouncedCalculate();
});
document.getElementById("sochMax").addEventListener("input", ()=>{
    validateSoch();
    saveState(); debouncedCalculate();
});

// FIX 2: validateSoch now prevents calculation when dialed > max
function validateSoch(){
    const dialedEl = document.getElementById("sochDialed");
    const maxEl = document.getElementById("sochMax");
    const d = Number(dialedEl.value);
    const m = Number(maxEl.value);

    clearInputError(dialedEl);
    clearInputError(maxEl);

    if(dialedEl.value === "" || maxEl.value === "") return true;
    if(!Number.isFinite(m) || m <= 0) return true;

    if(d > m){
        dialedEl.style.borderColor = "var(--danger)";
        maxEl.style.borderColor = "var(--danger)";
        showInputError(dialedEl, "Максимум не может быть меньше набранного");
        return false; // invalid — caller can skip calculate
    }
    return true;
}

function animatePercentage(element, start, end, duration = 500){
    const startTime = performance.now();
    const difference = end - start;

    function update(currentTime){
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + difference * eased;
        element.innerText = current.toFixed(2) + "%";
        if(progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
}

/* ---------- calculate via backend ---------- */
let pending = false;
let pendingAgain = false;

async function calculate(){
    if(pending) {
        pendingAgain = true;
        return;
    }
    pending = true;
    pendingAgain = false;

    try {
        const sochDialed = Number(document.getElementById("sochDialed").value);
        const sochMax = Number(document.getElementById("sochMax").value);

        // FIX 2: skip soch if dialed > max (invalid state)
        let soch = null;
        if(Number.isFinite(sochMax) && sochMax > 0 && sochDialed <= sochMax){
            soch = [Number(sochDialed || 0), Number(sochMax)];
        }

        const response = await fetch("/calculate", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ so, sors, soch })
        });

        const data = await response.json();

        const finalEl = document.getElementById("finalResult");
        const fill = document.getElementById("progressFill");

        const totalSo = data.total_so;
        const totalSor = data.total_sor;
        const totalSoch = data.total_soch;
        const final = data.final_result;

        document.getElementById("breakSo").innerText =
            totalSo !== null ? totalSo.toFixed(2) + "%" : "—";
        document.getElementById("breakSors").innerText =
            totalSor !== null ? totalSor.toFixed(2) + "%" : "—";
        document.getElementById("breakSoch").innerText =
            totalSoch !== null ? totalSoch.toFixed(2) + "%" : "—";
        document.getElementById("breakSoDetails").innerText = "";
        document.getElementById("breakSorsDetails").innerText = "";
        document.getElementById("breakSochDetails").innerText = "";

        finalEl.classList.remove("result-danger","result-warning","result-good","result-excellent");

        const badge = document.getElementById("gradeBadge");

        if(final !== null && final !== undefined){
            const pct = Number(final);
            const currentText = finalEl.innerText.replace("%","") || "0";
            const currentValue = parseFloat(currentText) || 0;

            animatePercentage(finalEl, currentValue, pct, 500);
            fill.style.width = Math.min(Math.max(pct, 0), 100) + "%";

            // FIX 1: update chartColor AND immediately redraw trend if it's visible
            if(pct < 40){
                finalEl.classList.add("result-danger");
                fill.style.background = "var(--danger)";
                chartColor = "#da3633";
            } else if(pct < 65){
                finalEl.classList.add("result-warning");
                fill.style.background = "var(--warning)";
                chartColor = "#d29922";
            } else if(pct < 85){
                finalEl.classList.add("result-good");
                fill.style.background = "var(--success)";
                chartColor = "#2ea043";
            } else {
                finalEl.classList.add("result-excellent");
                fill.style.background = "#166534";
                chartColor = "#166534";
            }

            // FIX 1: redraw chart with updated color if trend is currently shown
            if(so.length >= 2 && trendChart){
                updateTrend();
            }

            if(badge){
                if(pct < 40)       { badge.textContent = "Неудовлетворительно"; badge.className = "grade-badge badge-danger"; }
                else if(pct < 65)  { badge.textContent = "Удовлетворительно";   badge.className = "grade-badge badge-warning"; }
                else if(pct < 85)  { badge.textContent = "Хорошо";              badge.className = "grade-badge badge-good"; }
                else               { badge.textContent = "Отлично 🎉";           badge.className = "grade-badge badge-excellent"; }
            }
        } else {
            finalEl.innerText = "—";
            fill.style.width = "0%";
            if(badge){ badge.textContent = "Нет данных"; badge.className = "grade-badge badge-empty"; }
        }

        saveState();

    } catch(e){
        console.error("calculate error", e);
    } finally {
        pending = false;
        if(pendingAgain) calculate();
    }
}

document.getElementById("addForm").addEventListener("submit", function(e){
    e.preventDefault();
    const v = Number(document.getElementById("soInput").value);
    if(Number.isFinite(v) && v >= 1 && v <= 10){
        so.push(v);
        document.getElementById("soInput").value = "";
        saveState();
        renderSO();
        calculate();
    }
});

const sorDialedInput = document.getElementById("sorDialed");
const sorMaxInput = document.getElementById("sorMax");

sorDialedInput.addEventListener("input", function(){
    if(this.value.length >= 2) sorMaxInput.focus();
});

const sochDialedInput = document.getElementById("sochDialed");
const sochMaxInput = document.getElementById("sochMax");

sochDialedInput.addEventListener("input", function(){
    if(this.value.length >= 2) sochMaxInput.focus();
});

function premiumAutoJump(fromInput, toInput, maxDigits = 2){
    fromInput.addEventListener("input", function(e){
        this.value = this.value.replace(/\D/g, "");
        if(this.value.length >= maxDigits && this.selectionStart === this.value.length){
            toInput.focus();
            toInput.select();
        }
    });
    toInput.addEventListener("keydown", function(e){
        if(e.key === "Backspace" && this.value.length === 0){
            fromInput.focus();
            fromInput.setSelectionRange(fromInput.value.length, fromInput.value.length);
        }
    });
}

premiumAutoJump(document.getElementById("sorDialed"), document.getElementById("sorMax"), 2);
premiumAutoJump(document.getElementById("sochDialed"), document.getElementById("sochMax"), 2);

let trendChart;
let chartColor = "#58a6ff";

/* ---------- init ---------- */
(function init(){
    loadState();
    renderSO();
    renderSORS();
    setTimeout(()=> {
        calculate();
        if(so.length >= 2) updateTrend();
        else toggleTrendVisibility(false);
    }, 120);
})();

document.getElementById('year').textContent = new Date().getFullYear();

function toggleTrendVisibility(show){
    const box = document.querySelector(".trend-box");
    if(!box) return;
    if(show){
        box.classList.remove("collapsed");
    } else {
        box.classList.add("collapsed");
        if(trendChart){ try{ trendChart.destroy(); }catch(e){} trendChart = null; }
        const acc = document.getElementById("aiAccuracy");
        if(acc) acc.textContent = "--%";
        const label = document.getElementById("trendLabel");
        if(label) label.textContent = "—";
    }
}

async function updateTrend(){
    if(so.length < 2){ toggleTrendVisibility(false); return; }
    toggleTrendVisibility(true);
    try{
        const response = await fetch("/trend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scores: so })
        });
        const data = await response.json();
        drawTrend(data.scores, data.predictions, data.accuracy);
        if(trendChart && typeof trendChart.resize === "function") trendChart.resize();
    }catch(e){
        console.error("trend error", e);
    }
}

function hexToRgba(hex, a){
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
}

function drawTrend(scores, predictions, accuracy){
    const canvas = document.getElementById("trendChart");
    if(!canvas) return;
    const ctx = canvas.getContext("2d");

    if(trendChart) trendChart.destroy();

    if(!Array.isArray(scores)) scores = [];
    if(!Array.isArray(predictions)) predictions = [];

    const len = Math.min(scores.length, predictions.length);
    if(len === 0) return;

    scores      = scores.slice(0,len).map(v=>Math.min(Math.max(Number(v)||2,2),10));
    predictions = predictions.slice(0,len).map(v=>Math.min(Math.max(Number(v)||2,2),10));

    const labels = Array.from({length:len}, (_,i)=>"Ур."+(i+1));
    const color  = chartColor; // FIX 1: uses current chartColor at draw time
    const h      = canvas.offsetHeight || 145;

    const scoreGrad = ctx.createLinearGradient(0,0,0,h);
    scoreGrad.addColorStop(0,   hexToRgba(color, 0.30));
    scoreGrad.addColorStop(0.65,hexToRgba(color, 0.06));
    scoreGrad.addColorStop(1,   hexToRgba(color, 0.00));

    const predGrad = ctx.createLinearGradient(0,0,0,h);
    predGrad.addColorStop(0, "rgba(139,148,158,0.12)");
    predGrad.addColorStop(1, "rgba(139,148,158,0.00)");

    trendChart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    data: scores,
                    borderColor: color,
                    backgroundColor: scoreGrad,
                    borderWidth: 2.5,
                    tension: 0.42,
                    fill: true,
                    pointBackgroundColor: color,
                    pointBorderColor: "#060a10",
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 5
                },
                {
                    data: predictions,
                    borderColor: "rgba(139,148,158,0.45)",
                    backgroundColor: predGrad,
                    borderWidth: 1.5,
                    borderDash: [5,4],
                    tension: 0.3,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top:8, right:6, bottom:2, left:2 } },
            animation: { duration:550, easing:"easeOutCubic" },
            events: [],
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: {
                    grid:   { color:"rgba(255,255,255,0.04)", drawBorder:false },
                    border: { display:false },
                    ticks:  { color:"#6e7681", font:{size:10}, maxRotation:0, maxTicksLimit:6 }
                },
                y: {
                    min:1, max:10,
                    grid:   { color:"rgba(255,255,255,0.05)", drawBorder:false },
                    border: { display:false },
                    ticks:  { color:"#6e7681", font:{size:10}, stepSize:3, maxTicksLimit:4 }
                }
            }
        }
    });

    document.getElementById("aiAccuracy").textContent = accuracy + "%";

    const trend = predictions[predictions.length-1] - predictions[0];
    let text;
    if      (trend >  0.6) text = "📈 Отличный рост! Продолжай в том же духе";
    else if (trend >  0.2) text = "📈 Небольшой рост";
    else if (trend < -0.6) text = "📉 Оценки снижаются — стоит уделить внимание";
    else if (trend < -0.2) text = "📉 Лёгкое снижение";
    else                   text = "📊 Стабильная динамика";
    document.getElementById("trendLabel").textContent = text;
}

/* ---------- FAQ Accordion ---------- */
(function initFAQ(){
    document.querySelectorAll(".faq-q").forEach(btn => {
        btn.addEventListener("click", function(){
            const item = this.closest(".faq-item");
            const isOpen = item.classList.contains("open");
            // Close all
            document.querySelectorAll(".faq-item.open").forEach(i => {
                i.classList.remove("open");
                i.querySelector(".faq-q").setAttribute("aria-expanded", "false");
            });
            // Open clicked if it was closed
            if(!isOpen){
                item.classList.add("open");
                this.setAttribute("aria-expanded", "true");
            }
        });
    });
})();
if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/sw.js')
            .then(reg => console.log('SW registered', reg.scope))
            .catch(err => console.warn('SW registration failed', err));
    });
}

/* ---------- Офлайн-баннер ---------- */
(function setupOfflineBanner(){
    const banner = document.getElementById("offlineBanner");
    if(!banner) return;
    function show(){ banner.style.display = "block"; }
    function hide(){ banner.style.display = "none"; }
    if(!navigator.onLine) show();
    window.addEventListener("offline", show);
    window.addEventListener("online",  hide);
})();