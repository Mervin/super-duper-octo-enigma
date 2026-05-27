const TRANSLATIONS = {
    en: { farmTitle: "Harvest Idle", coins: "Coins", backToHub: "Back to Hub", shop: "Shop & Seeds", upgrades: "Tools & Upgrades", buyPlot: "Buy Plot", cost: "Cost", time: "Time", sell: "Sell", locked: "Locked", inventory: "Inventory", kitchen: "Kitchen", recipes: "Recipes", collect: "Collect", harvestAll: "Harvest All", requires: "Req" },
    cz: { farmTitle: "Sklizeň Idle", coins: "Mince", backToHub: "Zpět do Hubu", shop: "Obchod a Semínka", upgrades: "Nástroje a Vylepšení", buyPlot: "Koupit Pozemek", cost: "Cena", time: "Čas", sell: "Prodat", locked: "Zamčeno", inventory: "Inventář", kitchen: "Kuchyně", recipes: "Recepty", collect: "Vyzvednout", harvestAll: "Sklidit Vše", requires: "Pož" }
};
let lang = localStorage.getItem("hub_lang") || "en";
document.getElementById('lang-select').value = lang;

const CROPS = [
    { id: 'wheat', name: 'Wheat', icon: '🌾', cost: 2, sell: 3, timeSec: 10 },
    { id: 'potato', name: 'Potato', icon: '🥔', cost: 5, sell: 8, timeSec: 20 },
    { id: 'carrot', name: 'Carrot', icon: '🥕', cost: 10, sell: 18, timeSec: 30 },
    { id: 'tomato', name: 'Tomato', icon: '🍅', cost: 25, sell: 50, timeSec: 60 },
    { id: 'strawberry', name: 'Strawberry', icon: '🍓', cost: 50, sell: 110, timeSec: 120 },
    { id: 'pumpkin', name: 'Pumpkin', icon: '🎃', cost: 100, sell: 250, timeSec: 300 },
    { id: 'watermelon', name: 'Watermelon', icon: '🍉', cost: 250, sell: 650, timeSec: 600 }
];

const RECIPES = [
    { id: 'bread', name: 'Bread', icon: '🍞', req: { wheat: 3 }, sell: 15, timeSec: 30 },
    { id: 'soup', name: 'Veggie Soup', icon: '🍲', req: { potato: 2, carrot: 1, tomato: 1 }, sell: 100, timeSec: 120 },
    { id: 'jam', name: 'Strawberry Jam', icon: '🍯', req: { strawberry: 3 }, sell: 400, timeSec: 300 },
    { id: 'pie', name: 'Pumpkin Pie', icon: '🥧', req: { wheat: 2, pumpkin: 1 }, sell: 500, timeSec: 600 }
];

const UPGRADES = [
    { id: 'rake', name: 'Rake', desc: 'Crops grow 10% faster', cost: 100, icon: '🪒', max: 5 },
    { id: 'shovel', name: 'Shovel', desc: '10% chance for double crop yield', cost: 250, icon: '⛏️', max: 5 },
    { id: 'tractor', name: 'Tractor', desc: 'Unlocks "Harvest All" button', cost: 1000, icon: '🚜', max: 1 },
    { id: 'oven2', name: 'Extra Oven', desc: 'Unlocks a second kitchen slot', cost: 2000, icon: '🔥', max: 1 }
];

let state = {
    coins: 10,
    inventory: {}, // item_id -> amount
    plots: Array(16).fill(null).map((_, i) => ({ unlocked: i < 4, cropId: null, plantedAt: null })),
    kitchen: [
        { recipeId: null, startedAt: null }
    ], // array of slots
    upgrades: {}, // upgrade_id -> level
    lastSaveTime: Date.now()
};

let selectedSeed = CROPS[0].id;
const gridEl = document.getElementById('farm-grid');
const seedsEl = document.getElementById('seeds-container');
const coinsEl = document.getElementById('coins-display');
const btnBuyPlot = document.getElementById('btn-buy-plot');
const plotCostEl = document.getElementById('plot-cost');
const invEl = document.getElementById('inventory-container');
const recipesEl = document.getElementById('recipes-container');
const upgEl = document.getElementById('upgrades-container');
const actionsEl = document.getElementById('farm-actions-container');

function updateTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) el.textContent = TRANSLATIONS[lang][key];
    });
    renderSeeds();
    renderRecipes();
    renderUpgrades();
    updatePlotCost();
}
document.getElementById('lang-select').addEventListener('change', (e) => {
    lang = e.target.value;
    localStorage.setItem("hub_lang", lang);
    updateTranslations();
});

function loadSave() {
    let saved = localStorage.getItem("hub_harvest_idle_save");
    if (saved) {
        let parsed = JSON.parse(saved);
        state = { ...state, ...parsed };

        // Ensure inventory init
        CROPS.forEach(c => { if(state.inventory[c.id] === undefined) state.inventory[c.id] = 0; });
        RECIPES.forEach(r => { if(state.inventory[r.id] === undefined) state.inventory[r.id] = 0; });

        // Kitchen backwards compat
        if (!state.kitchen) state.kitchen = [{ recipeId: null, startedAt: null }];

        state.lastSaveTime = Date.now();
    } else {
        CROPS.forEach(c => state.inventory[c.id] = 0);
        RECIPES.forEach(r => state.inventory[r.id] = 0);
    }
}

function saveGame() {
    state.lastSaveTime = Date.now();
    localStorage.setItem("hub_harvest_idle_save", JSON.stringify(state));
}

function updateCoins() {
    coinsEl.textContent = state.coins;
    saveGame();
}

function getNextPlotCost() {
    let unlocked = state.plots.filter(p => p.unlocked).length;
    return Math.floor(50 * Math.pow(1.6, unlocked - 4));
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

/* Rendering UI */

function renderSeeds() {
    seedsEl.innerHTML = '';
    CROPS.forEach(crop => {
        let div = document.createElement('div');
        div.className = `list-item interactive ${selectedSeed === crop.id ? 'selected' : ''}`;
        div.onclick = () => { selectedSeed = crop.id; renderSeeds(); };
        div.innerHTML = `
            <div>
                <span class="title">${crop.icon} ${crop.name}</span>
            </div>
            <div class="details">
                <div>💰 -${crop.cost}</div>
                <div>⏱️ ${crop.timeSec}s</div>
            </div>
        `;
        seedsEl.appendChild(div);
    });
}

function renderInventory() {
    invEl.innerHTML = '';

    // Render Crops
    CROPS.forEach(c => {
        if (state.inventory[c.id] > 0) {
            let div = document.createElement('div');
            div.className = 'inv-item';
            div.innerHTML = `
                <div class="inv-icon">${c.icon}</div>
                <div class="inv-amt">${state.inventory[c.id]}</div>
                <button class="btn-small btn-sell" onclick="sellItem('${c.id}', 1, ${c.sell})">Sell (💰${c.sell})</button>
            `;
            invEl.appendChild(div);
        }
    });

    // Render Processed Food
    RECIPES.forEach(r => {
        if (state.inventory[r.id] > 0) {
            let div = document.createElement('div');
            div.className = 'inv-item';
            div.innerHTML = `
                <div class="inv-icon">${r.icon}</div>
                <div class="inv-amt">${state.inventory[r.id]}</div>
                <button class="btn-small btn-sell" onclick="sellItem('${r.id}', 1, ${r.sell})">Sell (💰${r.sell})</button>
            `;
            invEl.appendChild(div);
        }
    });
}

window.sellItem = function(id, amt, price) {
    if (state.inventory[id] >= amt) {
        state.inventory[id] -= amt;
        state.coins += price * amt;
        updateCoins();
        renderInventory();
    }
};

function renderUpgrades() {
    upgEl.innerHTML = '';
    UPGRADES.forEach(u => {
        let level = state.upgrades[u.id] || 0;
        let cost = u.cost * Math.pow(2, level);
        let maxed = level >= u.max;

        let div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div style="flex:1;">
                <span class="title">${u.icon} ${u.name} (Lvl ${level}/${u.max})</span>
                <div style="font-size:0.8rem; color:#666;">${u.desc}</div>
            </div>
            <div style="margin-left: 10px;">
                <button class="btn-small" ${state.coins < cost || maxed ? 'disabled' : ''} onclick="buyUpgrade('${u.id}', ${cost})">
                    ${maxed ? 'MAX' : 'Buy 💰' + cost}
                </button>
            </div>
        `;
        upgEl.appendChild(div);
    });

    // Check actions UI
    actionsEl.innerHTML = '';
    if (state.upgrades['tractor']) {
        let btn = document.createElement('button');
        btn.textContent = TRANSLATIONS[lang]['harvestAll'] || 'Harvest All';
        btn.onclick = harvestAll;
        btn.style.width = '200px';
        btn.style.fontSize = '1.2rem';
        actionsEl.appendChild(btn);
    }
}

window.buyUpgrade = function(id, cost) {
    if (state.coins >= cost) {
        state.coins -= cost;
        state.upgrades[id] = (state.upgrades[id] || 0) + 1;

        if (id === 'oven2' && state.kitchen.length < 2) {
            state.kitchen.push({ recipeId: null, startedAt: null });
            renderKitchenSlots();
        }

        updateCoins();
        renderUpgrades();
    }
};

/* Kitchen Logic */

function renderKitchenSlots() {
    const cont = document.getElementById('kitchen-slots-container');
    cont.innerHTML = '';
    state.kitchen.forEach((slot, idx) => {
        let div = document.createElement('div');
        div.className = `kitchen-slot ${slot.recipeId ? 'active' : ''}`;
        div.id = `oven-${idx}`;

        let content = "Idle";
        if (slot.recipeId) {
            let r = RECIPES.find(x => x.id === slot.recipeId);
            content = `Baking: ${r.icon} ${r.name}`;
        }

        div.innerHTML = `
            <div id="oven-${idx}-content">${content}</div>
            <div class="kitchen-bar"><div class="kitchen-fill" id="oven-${idx}-fill"></div></div>
            <button class="btn-small" id="btn-collect-oven-${idx}" style="display:none; width:100%; margin-top:10px;" onclick="collectOven(${idx})">Collect</button>
        `;
        cont.appendChild(div);
    });
}

function renderRecipes() {
    recipesEl.innerHTML = '';
    RECIPES.forEach(r => {
        let reqStr = Object.keys(r.req).map(k => {
            let c = CROPS.find(x => x.id === k);
            return `${c.icon}x${r.req[k]}`;
        }).join(', ');

        let canAfford = Object.keys(r.req).every(k => state.inventory[k] >= r.req[k]);
        let idleSlotIdx = state.kitchen.findIndex(s => s.recipeId === null);
        let canBake = canAfford && idleSlotIdx !== -1;

        let div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div style="flex:1;">
                <span class="title">${r.icon} ${r.name}</span>
                <div class="details" style="text-align:left;">Req: ${reqStr}</div>
                <div class="details" style="text-align:left;">⏱️ ${r.timeSec}s | Sell: 💰${r.sell}</div>
            </div>
            <div style="margin-left: 10px;">
                <button class="btn-small" ${!canBake ? 'disabled' : ''} onclick="startBaking('${r.id}', ${idleSlotIdx})">Bake</button>
            </div>
        `;
        recipesEl.appendChild(div);
    });
}

window.startBaking = function(recipeId, slotIdx) {
    if (slotIdx === -1 || state.kitchen[slotIdx].recipeId) return;

    let r = RECIPES.find(x => x.id === recipeId);
    // Deduct
    Object.keys(r.req).forEach(k => {
        state.inventory[k] -= r.req[k];
    });

    state.kitchen[slotIdx] = { recipeId: recipeId, startedAt: Date.now() };

    renderInventory();
    renderKitchenSlots();
    renderRecipes();
};

window.collectOven = function(slotIdx) {
    let slot = state.kitchen[slotIdx];
    if (slot.recipeId) {
        state.inventory[slot.recipeId] = (state.inventory[slot.recipeId] || 0) + 1;
        slot.recipeId = null;
        slot.startedAt = null;
        renderInventory();
        renderKitchenSlots();
        renderRecipes();
    }
};


/* Farm Logic */

function getGrowTimeMultiplier() {
    let rakeLvl = state.upgrades['rake'] || 0;
    return Math.max(0.1, 1.0 - (rakeLvl * 0.1)); // 10% faster per level, up to 50%
}

function getYield() {
    let shovelLvl = state.upgrades['shovel'] || 0;
    let chance = shovelLvl * 0.1; // 10% per level up to 50%
    return Math.random() < chance ? 2 : 1;
}

function renderFarm() {
    gridEl.innerHTML = '';
    state.plots.forEach((plot, i) => {
        let div = document.createElement('div');
        div.className = 'plot';

        if (!plot.unlocked) {
            div.classList.add('locked');
            div.innerHTML = `<div class="plot-content">🔒</div>`;
        } else {
            if (plot.cropId) {
                let cropData = CROPS.find(c => c.id === plot.cropId);
                div.innerHTML = `<div class="plot-content">${cropData.icon}</div><div class="progress"><div class="progress-fill" id="prog-${i}"></div></div>`;
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
            renderUpgrades(); // updates buy buttons
        }
    } else {
        // Harvest if ready
        let cropData = CROPS.find(c => c.id === plot.cropId);
        let timeSec = cropData.timeSec * getGrowTimeMultiplier();
        let elapsed = (Date.now() - plot.plantedAt) / 1000;
        if (elapsed >= timeSec) {
            // Give item to inventory instead of auto-sell
            let amount = getYield();
            state.inventory[plot.cropId] = (state.inventory[plot.cropId] || 0) + amount;

            plot.cropId = null;
            plot.plantedAt = null;

            renderInventory();
            renderRecipes();
            renderFarm();
        }
    }
}

function harvestAll() {
    let harvestedAny = false;
    let now = Date.now();
    state.plots.forEach((plot, i) => {
        if (plot.unlocked && plot.cropId && plot.plantedAt) {
            let cropData = CROPS.find(c => c.id === plot.cropId);
            let timeSec = cropData.timeSec * getGrowTimeMultiplier();
            let elapsed = (now - plot.plantedAt) / 1000;
            if (elapsed >= timeSec) {
                let amount = getYield();
                state.inventory[plot.cropId] = (state.inventory[plot.cropId] || 0) + amount;
                plot.cropId = null;
                plot.plantedAt = null;
                harvestedAny = true;
            }
        }
    });

    if (harvestedAny) {
        renderInventory();
        renderRecipes();
        renderFarm();
    }
}

/* Loop Updates */
function gameLoop() {
    let now = Date.now();

    // Farm Plots Progress
    state.plots.forEach((plot, i) => {
        if (plot.unlocked && plot.cropId && plot.plantedAt) {
            let cropData = CROPS.find(c => c.id === plot.cropId);
            let timeSec = cropData.timeSec * getGrowTimeMultiplier();
            let elapsed = (now - plot.plantedAt) / 1000;
            let progEl = document.getElementById(`prog-${i}`);

            if (progEl) {
                if (elapsed >= timeSec) {
                    progEl.style.width = '100%';
                    progEl.style.background = '#ffd700'; // Gold when ready
                } else {
                    let pct = (elapsed / timeSec) * 100;
                    progEl.style.width = `${pct}%`;
                    progEl.style.background = '#32cd32';
                }
            }
        }
    });

    // Kitchen Progress
    state.kitchen.forEach((slot, idx) => {
        if (slot.recipeId && slot.startedAt) {
            let r = RECIPES.find(x => x.id === slot.recipeId);
            let elapsed = (now - slot.startedAt) / 1000;
            let fillEl = document.getElementById(`oven-${idx}-fill`);
            let btnEl = document.getElementById(`btn-collect-oven-${idx}`);

            if (fillEl && btnEl) {
                if (elapsed >= r.timeSec) {
                    fillEl.style.width = '100%';
                    fillEl.style.background = '#27ae60';
                    btnEl.style.display = 'block';
                } else {
                    let pct = (elapsed / r.timeSec) * 100;
                    fillEl.style.width = `${pct}%`;
                    fillEl.style.background = '#e67e22';
                    btnEl.style.display = 'none';
                }
            }
        }
    });

    updatePlotCost(); // Dynamic button disabling
    renderUpgrades(); // Updates buy button states based on coins
    renderRecipes(); // Updates bake button states based on inv
}


// Initialization
loadSave();
updateTranslations();

if (state.kitchen.length < 2 && state.upgrades['oven2']) {
    state.kitchen.push({ recipeId: null, startedAt: null });
}

renderFarm();
renderKitchenSlots();
renderInventory();
updateCoins();
updatePlotCost();

setInterval(gameLoop, 1000); // 1 FPS UI update
setInterval(saveGame, 5000); // Save every 5s
