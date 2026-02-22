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
            // animate removal
            item.classList.add("removing");
            await new Promise(r => setTimeout(r, 260));
            so.splice(idx,1);
            saveState();
            renderSO();
            calculate();
        });
        container.appendChild(item);
    });
}

function renderSORS(){
    const container = document.getElementById("sorList");
    container.innerHTML = "";
    sors.forEach((pair, idx) => {
        const [d, m] = pair;
        const text = `${d} / ${m}`;
        const item = makeListItem(text, async ()=>{
            item.classList.add("removing");
            await new Promise(r => setTimeout(r, 260));
            sors.splice(idx,1);
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

    if(Number.isFinite(m) && m > 0){
        sors.push([Number(d||0), Number(m)]);
        document.getElementById("sorDialed").value = "";
        document.getElementById("sorMax").value = "";
        saveState();
        renderSORS();
        calculate();
    }
});
document.getElementById("clearSoBtn").addEventListener("click", ()=>{
    if(so.length===0) return;
    so = [];
    saveState();
    renderSO();
    calculate();
});
document.getElementById("clearSorsBtn").addEventListener("click", ()=>{
    if(sors.length===0) return;
    sors = [];
    saveState();
    renderSORS();
    calculate();
});
document.getElementById("clearSochBtn").addEventListener("click", ()=>{
    document.getElementById("sochDialed").value = "";
    document.getElementById("sochMax").value = "";
    saveState();
    calculate();
});

/* trigger calculate when soch inputs change */
document.getElementById("sochDialed").addEventListener("input", ()=>{
    saveState(); calculate();
});
document.getElementById("sochMax").addEventListener("input", ()=>{
    saveState(); calculate();
});

/* ---------- calculate via backend ---------- */
let pending = false;
async function calculate(){
    // throttle: avoid concurrent requests
    if(pending) return;
    pending = true;
    try {
        const sochDialed = Number(document.getElementById("sochDialed").value);
        const sochMax = Number(document.getElementById("sochMax").value);
        let soch = null;
        if(Number.isFinite(sochMax) && sochMax > 0){
            soch = [Number(sochDialed||0), Number(sochMax)];
        }

        const response = await fetch("/calculate", {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ so, sors, soch })
        });
        const data = await response.json();

        // update UI breakdown
        const finalEl = document.getElementById("finalResult");
        const fill = document.getElementById("progressFill");

        const totalSo = data.total_so;
        const totalSor = data.total_sor;
        const totalSoch = data.total_soch;
        const final = data.final_result;

        // breakdown values (show — when null)
        document.getElementById("breakSo").innerText = totalSo !== null ? totalSo.toFixed(2) + "%" : "—";
        document.getElementById("breakSors").innerText = totalSor !== null ? totalSor.toFixed(2) + "%" : "—";
        document.getElementById("breakSoch").innerText = totalSoch !== null ? totalSoch.toFixed(2) + "%" : "—";

        document.getElementById("breakSoDetails").innerText = (Array.isArray(so) && so.length>0) ? `(${so.length} оценок)` : "";
        document.getElementById("breakSorsDetails").innerText = (Array.isArray(sors) && sors.length>0) ? `(${sors.length} СОР)` : "";
        document.getElementById("breakSochDetails").innerText = (totalSoch !== null) ? `макс ${document.getElementById("sochMax").value || 0}` : "";

        if(final !== null && final !== undefined){
            const pct = Number(final);
            const pctStr = pct.toFixed(2) + "%";
            finalEl.innerText = pctStr;
            fill.style.width = Math.min(Math.max(pct, 0), 100) + "%";
            if(pct < 40) fill.style.background = "var(--danger)";
            else if(pct < 65) fill.style.background = "var(--warning)";
            else if(pct < 85) fill.style.background = "var(--success)";
            else fill.style.background = "var(--gread_success)";
        } else {
            finalEl.innerText = "—";
            fill.style.width = "0%";
        }

        saveState();
    } catch(e){
        console.error("calculate error", e);
    } finally {
        pending = false;
    }
}

document.getElementById("addForm").addEventListener("submit", function(e){
    e.preventDefault();

    const v = Number(document.getElementById("soInput").value);
    if(Number.isFinite(v) && v >= 2 && v <= 10){
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

    // Ограничиваем до maxDigits
    fromInput.addEventListener("input", function(e){

        // Удаляем всё кроме цифр
        this.value = this.value.replace(/\D/g, "");

        // Обрезаем лишние цифры
        if(this.value.length > maxDigits){
            this.value = this.value.slice(0, maxDigits);
        }

        // Если достигли maxDigits
        if(
            this.value.length === maxDigits &&
            this.selectionStart === this.value.length // курсор в конце
        ){
            toInput.focus();
            toInput.select(); // сразу выделяет — удобно перезаписать
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

/* ---------- init ---------- */
(function init(){
    loadState();
    renderSO();
    renderSORS();
    // small delay to let DOM settle then calculate
    setTimeout(()=> calculate(), 120);
})();
