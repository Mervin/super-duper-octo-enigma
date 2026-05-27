const TRANSLATIONS = {
    en: { farmTitle: "Farm Idle", coins: "Coins", backToHub: "Back to Hub", shop: "Shop & Seeds", upgrades: "Upgrades", buyPlot: "Buy Plot", cost: "Cost", time: "Time", sell: "Sell", locked: "Locked" },
    cz: { farmTitle: "Farma Idle", coins: "Mince", backToHub: "Zpět do Hubu", shop: "Obchod a Semínka", upgrades: "Vylepšení", buyPlot: "Koupit Pozemek", cost: "Cena", time: "Čas", sell: "Prodat", locked: "Zamčeno" }
};
let lang = localStorage.getItem("hub_lang") || "en";
document.getElementById('lang-select').value = lang;

const CROPS = [
    { id: 'wheat', name: 'Wheat', icon: '🌾', cost: 2, sell: 5, timeSec: 10 },
    { id: 'carrot', name: 'Carrot', icon: '🥕', cost: 10, sell: 25, timeSec: 30 },
    { id: 'tomato', name: 'Tomato', icon: '🍅', cost: 50, sell: 120, timeSec: 60 },
    { id: 'corn', name: 'Corn', icon: '🌽', cost: 200, sell: 500, timeSec: 300 }
];

let state = {
    coins: 10,
    plots: Array(16).fill(null).map((_, i) => ({
        unlocked: i < 4,
        cropId: null,
        plantedAt: null
    })),
    lastSaveTime: Date.now()
};

let selectedSeed = CROPS[0].id;
const gridEl = document.getElementById('farm-grid');
const seedsEl = document.getElementById('seeds-container');
const coinsEl = document.getElementById('coins-display');
const btnBuyPlot = document.getElementById('btn-buy-plot');
const plotCostEl = document.getElementById('plot-cost');

function updateTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) el.textContent = TRANSLATIONS[lang][key];
    });
    renderSeeds();
    updatePlotCost();
}
document.getElementById('lang-select').addEventListener('change', (e) => {
    lang = e.target.value;
    localStorage.setItem("hub_lang", lang);
    updateTranslations();
});

function loadSave() {
    let saved = localStorage.getItem("hub_farmville_save");
    if (saved) {
        let parsed = JSON.parse(saved);
        // Merge missing fields
        state = { ...state, ...parsed };

        // Calculate offline progress
        let now = Date.now();
        state.plots.forEach(plot => {
            if (plot.cropId && plot.plantedAt) {
                // Time handled naturally in render loop using timestamps
            }
        });
        state.lastSaveTime = now;
    }
}

function saveGame() {
    state.lastSaveTime = Date.now();
    localStorage.setItem("hub_farmville_save", JSON.stringify(state));
}

function updateCoins() {
    coinsEl.textContent = state.coins;
    saveGame();
}

function renderSeeds() {
    seedsEl.innerHTML = '';
    CROPS.forEach(crop => {
        let div = document.createElement('div');
        div.className = `seed-btn ${selectedSeed === crop.id ? 'selected' : ''}`;
        div.onclick = () => {
            selectedSeed = crop.id;
            renderSeeds();
        };
        div.innerHTML = `
            <span>${crop.icon} ${crop.name}</span>
            <div style="text-align: right; font-size: 0.8rem;">
                <div>💰 -${crop.cost}</div>
                <div>⏱️ ${crop.timeSec}s</div>
                <div style="color: green;">💵 +${crop.sell}</div>
            </div>
        `;
        seedsEl.appendChild(div);
    });
}

function getNextPlotCost() {
    let unlocked = state.plots.filter(p => p.unlocked).length;
    return Math.floor(50 * Math.pow(1.5, unlocked - 4));
}

function updatePlotCost() {
    let cost = getNextPlotCost();
    let unlocked = state.plots.filter(p => p.unlocked).length;
    if (unlocked >= 16) {
        btnBuyPlot.disabled = true;
        btnBuyPlot.innerHTML = `<span data-i18n="upgrades">Max Plots Reached</span>`;
    } else {
        btnBuyPlot.disabled = state.coins < cost;
        plotCostEl.textContent = cost;
    }
}

btnBuyPlot.onclick = () => {
    let cost = getNextPlotCost();
    if (state.coins >= cost) {
        state.coins -= cost;
        let nextIdx = state.plots.findIndex(p => !p.unlocked);
        if (nextIdx !== -1) {
            state.plots[nextIdx].unlocked = true;
            updateCoins();
            renderFarm();
            updatePlotCost();
        }
    }
};

function renderFarm() {
    gridEl.innerHTML = '';
    state.plots.forEach((plot, i) => {
        let div = document.createElement('div');
        div.className = 'plot';

        if (!plot.unlocked) {
            div.classList.add('locked');
            div.innerHTML = '🔒';
        } else {
            if (plot.cropId) {
                let cropData = CROPS.find(c => c.id === plot.cropId);
                div.innerHTML = `${cropData.icon}<div class="progress"><div class="progress-fill" id="prog-${i}"></div></div>`;
            }
            div.onclick = () => handlePlotClick(i);
        }
        gridEl.appendChild(div);
    });
}

function handlePlotClick(idx) {
    let plot = state.plots[idx];
    if (!plot.unlocked) return;

    if (!plot.cropId) {
        // Plant
        let cropData = CROPS.find(c => c.id === selectedSeed);
        if (state.coins >= cropData.cost) {
            state.coins -= cropData.cost;
            plot.cropId = selectedSeed;
            plot.plantedAt = Date.now();
            updateCoins();
            renderFarm();
        }
    } else {
        // Harvest if ready
        let cropData = CROPS.find(c => c.id === plot.cropId);
        let elapsed = (Date.now() - plot.plantedAt) / 1000;
        if (elapsed >= cropData.timeSec) {
            state.coins += cropData.sell;
            plot.cropId = null;
            plot.plantedAt = null;
            updateCoins();
            renderFarm();
            updatePlotCost();
        }
    }
}

function gameLoop() {
    let now = Date.now();
    let needRender = false;

    state.plots.forEach((plot, i) => {
        if (plot.unlocked && plot.cropId && plot.plantedAt) {
            let cropData = CROPS.find(c => c.id === plot.cropId);
            let elapsed = (now - plot.plantedAt) / 1000;
            let progEl = document.getElementById(`prog-${i}`);

            if (progEl) {
                if (elapsed >= cropData.timeSec) {
                    progEl.style.width = '100%';
                    progEl.style.background = '#ffd700'; // Gold when ready
                } else {
                    let pct = (elapsed / cropData.timeSec) * 100;
                    progEl.style.width = `${pct}%`;
                }
            }
        }
    });

    updatePlotCost();
}

loadSave();
updateTranslations();
renderFarm();
updateCoins();
updatePlotCost();

setInterval(gameLoop, 1000); // 1 FPS UI update
setInterval(saveGame, 10000); // Save every 10s
