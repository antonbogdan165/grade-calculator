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
            const capturedVal = val; // фиксируем значение, а не индекс
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

    // show/hide trend depending on number of SO
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
            const capturedIdx = idx; // фиксируем индекс до await
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
        // storage might be unavailable; ignore
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

    // Сброс ошибок
    clearInputError(sorDialedEl);
    clearInputError(sorMaxEl);

    if(!Number.isFinite(m) || m <= 0) return;

    if(d > m){
        sorDialedEl.style.borderColor = "var(--danger)";
        sorMaxEl.style.borderColor = "var(--danger)";
        showInputError(sorDialedEl, "Максимум не может быть меньше набранного");
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
// Каждая "группа" инпутов имеет свой контейнер ошибки
// inputEl → ключ для поиска banner-контейнера
const _errorBanners = new Map();

function showInputError(inputEl, message){
    // Найдём общий родитель (card) для баннера
    const card = inputEl.closest(".card");
    if(!card) return;

    const groupId = inputEl.closest("form")?.id || inputEl.closest(".row")?.dataset.group || inputEl.id;

    // Убираем старый баннер этой группы
    clearInputError(inputEl);

    inputEl.classList.add("shake");
    inputEl.addEventListener("animationend", () => inputEl.classList.remove("shake"), { once: true });

    // Создаём баннер
    const banner = document.createElement("div");
    banner.className = "input-error-banner";
    banner.innerHTML = `<span class="input-error-icon">!</span><span>${message}</span>`;

    // Вставляем сразу после .row внутри card
    const row = inputEl.closest(".row") || inputEl.closest("form");
    if(row && row.parentNode){
        row.parentNode.insertBefore(banner, row.nextSibling);
    } else {
        card.appendChild(banner);
    }

    _errorBanners.set(groupId, { banner, inputEl });

    const timer = setTimeout(() => clearInputError(inputEl), 3000);
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

/* SOCH с дебаунсом — не стреляем запрос на каждый символ */
document.getElementById("sochDialed").addEventListener("input", ()=>{
    validateSoch();
    saveState(); debouncedCalculate();
});
document.getElementById("sochMax").addEventListener("input", ()=>{
    validateSoch();
    saveState(); debouncedCalculate();
});

function validateSoch(){
    const dialedEl = document.getElementById("sochDialed");
    const maxEl = document.getElementById("sochMax");
    const d = Number(dialedEl.value);
    const m = Number(maxEl.value);

    // Сброс предыдущих ошибок
    clearInputError(dialedEl);
    clearInputError(maxEl);

    if(dialedEl.value === "" || maxEl.value === "") return;
    if(!Number.isFinite(m) || m <= 0) return;

    if(d > m){
        dialedEl.style.borderColor = "var(--danger)";
        maxEl.style.borderColor = "var(--danger)";
        showInputError(dialedEl, "Максимум не может быть меньше набранного");
    }
}

function animatePercentage(element, start, end, duration = 500){

    const startTime = performance.now();
    const difference = end - start;

    function update(currentTime){
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // ease-out
        const eased = 1 - Math.pow(1 - progress, 3);

        const current = start + difference * eased;

        element.innerText = current.toFixed(2) + "%";

        if(progress < 1){
            requestAnimationFrame(update);
        }
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

        let soch = null;
        if(Number.isFinite(sochMax) && sochMax > 0){
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

        // --- breakdown ---
        document.getElementById("breakSo").innerText =
            totalSo !== null ? totalSo.toFixed(2) + "%" : "—";

        document.getElementById("breakSors").innerText =
            totalSor !== null ? totalSor.toFixed(2) + "%" : "—";

        document.getElementById("breakSoch").innerText =
            totalSoch !== null ? totalSoch.toFixed(2) + "%" : "—";

        document.getElementById("breakSoDetails").innerText = "";
        document.getElementById("breakSorsDetails").innerText = "";
        document.getElementById("breakSochDetails").innerText = "";

        // --- result color logic ---
        finalEl.classList.remove(
            "result-danger",
            "result-warning",
            "result-good",
            "result-excellent"
        );

        if(final !== null && final !== undefined){

            const pct = Number(final);
            const currentText = finalEl.innerText.replace("%","") || "0";
            const currentValue = parseFloat(currentText) || 0;

            animatePercentage(finalEl, currentValue, pct, 500);

            fill.style.width = Math.min(Math.max(pct, 0), 100) + "%";

            if(pct < 40){
                finalEl.classList.add("result-danger");
                fill.style.background = "var(--danger)";
            }
            else if(pct < 65){
                finalEl.classList.add("result-warning");
                fill.style.background = "var(--warning)";
            }
            else if(pct < 85){
                finalEl.classList.add("result-good");
                fill.style.background = "var(--success)";
            }
            else{
                finalEl.classList.add("result-excellent");
                fill.style.background = "var(--gread_success)";
            }

        } else {
            finalEl.innerText = "—";
            fill.style.width = "0%";
        }

        saveState();

    } catch(e){
        console.error("calculate error", e);
    } finally {
        pending = false;
        if(pendingAgain) calculate(); // повторяем пропущенный запрос
    }
}

document.getElementById("addForm").addEventListener("submit", function(e){
    e.preventDefault();

    const v = Number(document.getElementById("soInput").value);
    if(Number.isFinite(v) && v >= 2 && v <= 10){
        so.push(v);
        document.getElementById("soInput").value = "";
        saveState();
        renderSO();   // updateTrend вызывается внутри renderSO
        calculate();
    }
});

const sorDialedInput = document.getElementById("sorDialed");
const sorMaxInput = document.getElementById("sorMax");

sorDialedInput.addEventListener("input", function(){
    if(this.value.length >= 2){
        sorMaxInput.focus();
    }
});

const sochDialedInput = document.getElementById("sochDialed");
const sochMaxInput = document.getElementById("sochMax");

sochDialedInput.addEventListener("input", function(){
    if(this.value.length >= 2){
        sochMaxInput.focus();
    }
});

function premiumAutoJump(fromInput, toInput, maxDigits = 2){

    // ИСПРАВЛЕНО: убрали обрезание значения — "100" больше не станет "10"
    fromInput.addEventListener("input", function(e){

        // Удаляем всё кроме цифр
        this.value = this.value.replace(/\D/g, "");

        // Только прыгаем на следующее поле, НЕ обрезаем значение
        if(
            this.value.length >= maxDigits &&
            this.selectionStart === this.value.length
        ){
            toInput.focus();
            toInput.select();
        }
    });

    // Если в следующем поле нажали backspace на пустом — вернуться назад
    toInput.addEventListener("keydown", function(e){
        if(e.key === "Backspace" && this.value.length === 0){
            fromInput.focus();
            fromInput.setSelectionRange(fromInput.value.length, fromInput.value.length);
        }
    });
}

premiumAutoJump(
    document.getElementById("sorDialed"),
    document.getElementById("sorMax"),
    2
);

premiumAutoJump(
    document.getElementById("sochDialed"),
    document.getElementById("sochMax"),
    2
);

let trendChart;

/* ---------- init ---------- */
(function init(){
    loadState();
    renderSO();
    renderSORS();
    // небольшая задержка, чтобы DOM успел отрисоваться
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

        if(trendChart){
            try{
                trendChart.destroy();
            }catch(e){}
            trendChart = null;
        }

        const acc = document.getElementById("aiAccuracy");
        if(acc) acc.textContent = "--%";

        const label = document.getElementById("trendLabel");
        if(label) label.textContent = "—";
    }
}

async function updateTrend(){

    if(so.length < 2){
        toggleTrendVisibility(false);
        return;
    }

    toggleTrendVisibility(true);

    try{

        const response = await fetch("/trend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                scores: so
            })
        });

        const data = await response.json();

        drawTrend(
            data.scores,
            data.predictions,
            data.accuracy
        );

        if(trendChart && typeof trendChart.resize === "function"){
            trendChart.resize();
        }

    }catch(e){
        console.error("trend error", e);
    }

}

function drawTrend(scores, predictions, accuracy){
    const canvas = document.getElementById("trendChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (trendChart) trendChart.destroy();

    // --- защита от пустых массивов ---
    if(!Array.isArray(scores)) scores = [];
    if(!Array.isArray(predictions)) predictions = [];

    const len = Math.min(scores.length, predictions.length);
    if(len === 0) return; // нечего рисовать

    scores = scores.slice(0,len).map(v=>Math.min(Math.max(Number(v)||2,2),10));
    predictions = predictions.slice(0,len).map(v=>Math.min(Math.max(Number(v)||2,2),10));

    const labels = Array.from({length:len}, (_,i)=>i+1);

    const scoreGradient = ctx.createLinearGradient(0,0,0,140);
    scoreGradient.addColorStop(0,"rgba(88,166,255,0.9)");
    scoreGradient.addColorStop(1,"rgba(88,166,255,0.05)");

    const predictGradient = ctx.createLinearGradient(0,0,0,140);
    predictGradient.addColorStop(0,"rgba(46,160,67,0.9)");
    predictGradient.addColorStop(1,"rgba(46,160,67,0.05)");

    trendChart = new Chart(ctx,{
        type:"line",
        data:{
            labels,
            datasets:[
                {
                    data:scores,
                    borderColor:"#58a6ff",
                    backgroundColor:scoreGradient,
                    borderWidth:3,
                    tension:0.45,
                    fill:true,
                    pointRadius:4,
                    pointHoverRadius:6
                },
                {
                    data:predictions,
                    borderColor:"#2ea043",
                    backgroundColor:predictGradient,
                    borderWidth:2,
                    tension:0.45,
                    fill:true,
                    pointRadius:0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 6 },
            animation: {
                duration: 700,
                easing: "easeOutQuart"
            },
            plugins:{
                legend:{ display:false },
                tooltip:{
                    backgroundColor:"#161b22",
                    borderColor:"#30363d",
                    borderWidth:1,
                    titleColor:"#fff",
                    bodyColor:"#c9d1d9"
                }
            },
            scales:{
                x:{
                    grid:{ color:"rgba(255,255,255,0.04)" },
                    ticks:{ color:"#8b949e", maxRotation:0, autoSkip:true, maxTicksLimit:5 }
                },
                y:{
                    min:2,
                    max:10,
                    grid:{ color:"rgba(255,255,255,0.04)" },
                    ticks:{ color:"#8b949e", stepSize:2, maxTicksLimit:5 }
                }
            },
            elements: {
                point: { radius: 3, hoverRadius:5 },
                line: { tension: 0.36 }
            }
        }
    });

    document.getElementById("aiAccuracy").textContent = accuracy + "%";

    const trend = predictions[predictions.length-1] - predictions[0];
    let text = "Стабильно";
    if(trend > 0.3) text = "Тенденция роста (СО) 📈";
    if(trend < -0.3) text = "Тенденция падения (СО) 📉";
    document.getElementById("trendLabel").textContent = text;
}