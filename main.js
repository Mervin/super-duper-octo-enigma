// Game Data Structure
const DEFAULT_STATE = {
    quarks: 0,
    backgroundRadiation: 0,
    generators: 0, // Generates Quarks
    processors: 0, // Automates Merging
    elements: {
        1: 0, // Hydrogen
        2: 0, // Helium
        3: 0, // Lithium
        4: 0, // Beryllium
        5: 0, // Boron
        6: 0, // Carbon
        7: 0, // Nitrogen
        8: 0, // Oxygen
    },
    lastSaveTime: Date.now()
};

let game = JSON.parse(JSON.stringify(DEFAULT_STATE));
const SAVE_KEY = "atomicIdleSave";

// Utility Functions
function formatNumber(num) {
    if (num < 1000) return Math.floor(num).toString();
    if (num < 1000000) return (num / 1000).toFixed(2) + "K";
    if (num < 1000000000) return (num / 1000000).toFixed(2) + "M";
    if (num < 1000000000000) return (num / 1000000000).toFixed(2) + "B";
    return num.toExponential(2);
}

// Save & Load System
function saveGame(manual = false) {
    game.lastSaveTime = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));

    if (manual) {
        const status = document.getElementById("save-status");
        status.textContent = "Game Saved!";
        status.style.opacity = 1;
        setTimeout(() => { status.style.opacity = 0; }, 2000);
    }
}

function loadGame() {
    const savedString = localStorage.getItem(SAVE_KEY);
    if (savedString) {
        try {
            const savedData = JSON.parse(savedString);
            // Merge loaded data with default state to handle game updates
            game = { ...DEFAULT_STATE, ...savedData, elements: { ...DEFAULT_STATE.elements, ...savedData.elements } };

            // Offline Progress Calculation
            const now = Date.now();
            const timeDiff = (now - game.lastSaveTime) / 1000; // in seconds
            if (timeDiff > 60) {
                simulateOfflineProgress(timeDiff);
            }

            updateUI();
        } catch (e) {
            console.error("Save file corrupted, starting fresh.");
        }
    }
}

function resetGame() {
    if (confirm("Are you sure you want to wipe ALL your progress? This cannot be undone!")) {
        game = JSON.parse(JSON.stringify(DEFAULT_STATE));
        saveGame();
        updateUI();
    }
}

function exportSave() {
    const saveString = btoa(JSON.stringify(game));
    const textarea = document.getElementById("export-text");
    textarea.value = saveString;
    document.getElementById("export-modal").classList.remove("hidden");
    textarea.select();
}

function importSave() {
    document.getElementById("import-text").value = "";
    document.getElementById("import-modal").classList.remove("hidden");
}

function confirmImport() {
    const saveString = document.getElementById("import-text").value;
    try {
        const decoded = atob(saveString);
        const parsed = JSON.parse(decoded);
        if (parsed && typeof parsed.quarks !== 'undefined') {
            game = { ...DEFAULT_STATE, ...parsed, elements: { ...DEFAULT_STATE.elements, ...parsed.elements } };
            saveGame();
            updateUI();
            closeModals();
            alert("Save imported successfully!");
        } else {
            alert("Invalid save data.");
        }
    } catch (e) {
        alert("Invalid save string.");
    }
}

function closeModals() {
    document.getElementById("export-modal").classList.add("hidden");
    document.getElementById("import-modal").classList.add("hidden");
}

// Element Definitions
const ELEMENTS = [
    { id: 1, name: "Hydrogen", symbol: "H", baseCost: 1 }, // Costs 1 Quark
    { id: 2, name: "Helium", symbol: "He", mergeReq: 4 },  // Needs 4 H
    { id: 3, name: "Lithium", symbol: "Li", mergeReq: 3 }, // Needs 3 He
    { id: 4, name: "Beryllium", symbol: "Be", mergeReq: 3 }, // Needs 3 Li
    { id: 5, name: "Boron", symbol: "B", mergeReq: 2 },    // Needs 2 Be
    { id: 6, name: "Carbon", symbol: "C", mergeReq: 2 },   // Needs 2 B
    { id: 7, name: "Nitrogen", symbol: "N", mergeReq: 2 }, // Needs 2 C
    { id: 8, name: "Oxygen", symbol: "O", mergeReq: 2 }    // Needs 2 N
];

// Game Loop Setup
let lastTick = Date.now();

// Upgrades & Automation Logic
function getGeneratorCost() {
    return Math.floor(10 * Math.pow(1.5, game.generators));
}

function getProcessorCost() {
    return Math.floor(50 * Math.pow(2, game.processors));
}

function buyGenerator() {
    const cost = getGeneratorCost();
    if (game.quarks >= cost) {
        game.quarks -= cost;
        game.generators++;
        updateUI();
    }
}

function buyProcessor() {
    const cost = getProcessorCost();
    if (game.quarks >= cost) {
        game.quarks -= cost;
        game.processors++;
        updateUI();
    }
}

function gameTick() {
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;

    simulateProgress(dt);
    updateUI();
}

function simulateProgress(dt) {
    // 1. Generators produce Quarks
    if (game.generators > 0) {
        const radiationMultiplier = 1 + (game.backgroundRadiation * 0.05);
        const quarksPerSec = game.generators * radiationMultiplier;
        game.quarks += quarksPerSec * dt;
    }

    // 2. Processors automate merging (bottom-up to avoid double processing in one tick)
    if (game.processors > 0) {
        const mergesPerSec = game.processors;
        const possibleMergesThisTick = mergesPerSec * dt;

        for (let i = 7; i >= 1; i--) { // Max 8 elements, loop 7 down to 1
            const nextElDef = ELEMENTS.find(e => e.id === i + 1);
            if (!nextElDef) continue;

            const req = nextElDef.mergeReq;
            const available = game.elements[i];

            if (available >= req) {
                const mergesPossible = Math.floor(available / req);
                // Allow partial merges over time by accumulating probability or just doing exact math
                // For simplicity, we just do max integer merges up to possibleMergesThisTick limit
                let mergesToDo = 0;

                if (possibleMergesThisTick >= 1) {
                    mergesToDo = Math.min(mergesPossible, Math.floor(possibleMergesThisTick));
                } else {
                    // Fractional merges - chance to merge 1
                    if (Math.random() < possibleMergesThisTick) {
                        mergesToDo = Math.min(mergesPossible, 1);
                    }
                }

                if (mergesToDo > 0) {
                    game.elements[i] -= mergesToDo * req;
                    game.elements[i+1] += mergesToDo;
                }
            }
        }
    }
}

function simulateOfflineProgress(secondsPassed) {
    simulateProgress(secondsPassed);
    console.log(`Simulated ${secondsPassed} seconds of offline progress.`);
}

// Prestige Logic
function getPrestigeGain() {
    // Basic formula: sum of all elements weighted by their tier,
    // scaled down drastically.
    let score = 0;

    // We base the score on the amount of Hydrogen each atom took to make
    // e.g. He took 4 H. Li took 3 He (12 H total).
    // This prevents players from hoarding H just to boost their score.
    const hEquivalents = [0, 1, 4, 12, 36, 72, 144, 288, 576];

    for (let i = 1; i <= 8; i++) {
        score += game.elements[i] * hEquivalents[i];
    }

    // Need at least a score of 1000 to get 1 Background Radiation
    const gain = Math.floor(Math.pow(score / 1000, 0.5));
    return gain;
}

function doPrestige() {
    const gain = getPrestigeGain();
    if (gain <= 0) return;

    if (confirm(`Are you sure you want to trigger a Cosmic Reset? You will lose all Quarks, Elements, Generators, and Processors, but gain ${gain} Background Radiation!`)) {
        game.backgroundRadiation += gain;

        // Reset progress
        game.quarks = 0;
        game.generators = 0;
        game.processors = 0;
        for (let i = 1; i <= 8; i++) {
            game.elements[i] = 0;
        }

        saveGame(true);
        updateUI();
    }
}

// Core Actions
function gatherQuarks() {
    const radiationMultiplier = 1 + (game.backgroundRadiation * 0.05); // 5% boost per radiation
    game.quarks += 1 * radiationMultiplier;
    updateUI();
}

function buyHydrogen() {
    const cost = ELEMENTS[0].baseCost;
    if (game.quarks >= cost) {
        game.quarks -= cost;
        game.elements[1]++;
        updateUI();
    }
}

function mergeElement(elementId) {
    const elDef = ELEMENTS.find(e => e.id === elementId);
    if (!elDef || !elDef.mergeReq) return;

    const prevId = elementId - 1;
    const req = elDef.mergeReq;

    if (game.elements[prevId] >= req) {
        // Find max possible merges to allow bulk merging
        const possibleMerges = Math.floor(game.elements[prevId] / req);
        game.elements[prevId] -= possibleMerges * req;
        game.elements[elementId] += possibleMerges;
        updateUI();
    }
}

// UI Initialization & Updates
function initUI() {
    const elementsContainer = document.getElementById("elements-container");
    const mergersContainer = document.getElementById("mergers-container");
    const automationContainer = document.getElementById("automation-container");

    // Clear and build automators
    automationContainer.innerHTML = `
        <button id="btn-buy-generator" class="upgrade-btn">
            Buy Quark Generator
            <span class="cost">Cost: <span id="generator-cost">10</span> Quarks</span>
            <span class="owned">Owned: <span id="generator-owned">0</span></span>
        </button>
        <button id="btn-buy-processor" class="upgrade-btn hidden">
            Buy Atom Processor (Auto-Merge)
            <span class="cost">Cost: <span id="processor-cost">50</span> Quarks</span>
            <span class="owned">Owned: <span id="processor-owned">0</span></span>
        </button>
    `;

    document.getElementById("btn-buy-generator").onclick = buyGenerator;
    document.getElementById("btn-buy-processor").onclick = buyProcessor;

    document.getElementById("btn-prestige").onclick = doPrestige;

    elementsContainer.innerHTML = "";
    mergersContainer.innerHTML = "";

    // Hydrogen UI
    elementsContainer.innerHTML += `
        <div class="element-row">
            <span class="element-name">Hydrogen (H)</span>
            <span class="element-amount" id="el-amt-1">0</span>
        </div>
    `;

    const buyHBtn = document.createElement("button");
    buyHBtn.className = "action-btn";
    buyHBtn.id = "btn-buy-h";
    buyHBtn.innerHTML = `Create Hydrogen <span class="cost">(1 Quark)</span>`;
    buyHBtn.onclick = buyHydrogen;
    mergersContainer.appendChild(buyHBtn);

    // Other Elements UI
    for (let i = 1; i < ELEMENTS.length; i++) {
        const el = ELEMENTS[i];
        const prevEl = ELEMENTS[i-1];

        elementsContainer.innerHTML += `
            <div class="element-row hidden" id="el-row-${el.id}">
                <span class="element-name">${el.name} (${el.symbol})</span>
                <span class="element-amount" id="el-amt-${el.id}">0</span>
            </div>
        `;

        const mergeBtn = document.createElement("button");
        mergeBtn.className = "action-btn hidden";
        mergeBtn.id = `btn-merge-${el.id}`;
        mergeBtn.innerHTML = `Merge ${prevEl.name} into ${el.name} <span class="cost">(${el.mergeReq} ${prevEl.symbol})</span>`;
        mergeBtn.onclick = () => mergeElement(el.id);
        mergersContainer.appendChild(mergeBtn);
    }

    document.getElementById("btn-gather-quarks").onclick = gatherQuarks;

    // Spacebar shortcut for gathering
    document.addEventListener("keydown", (e) => {
        if (e.code === "Space" && e.target.tagName !== "TEXTAREA") {
            e.preventDefault();
            gatherQuarks();
        }
    });
}

function updateUI() {
    document.getElementById("quarks-amount").textContent = formatNumber(game.quarks);

    // Update Element Amounts and Visibility
    document.getElementById("el-amt-1").textContent = formatNumber(game.elements[1]);

    let highestElementSeen = 1;
    for (let i = 1; i <= 8; i++) {
        if (game.elements[i] > 0) highestElementSeen = i;
    }

    // Reveal elements progressively (show one tier ahead of what you have)
    const displayThreshold = Math.min(8, highestElementSeen + 1);

    for (let i = 2; i <= 8; i++) {
        const amtSpan = document.getElementById(`el-amt-${i}`);
        if (amtSpan) amtSpan.textContent = formatNumber(game.elements[i]);

        const row = document.getElementById(`el-row-${i}`);
        const btn = document.getElementById(`btn-merge-${i}`);

        if (i <= displayThreshold) {
            if (row) row.classList.remove("hidden");
            if (btn) btn.classList.remove("hidden");

            // Disable button if not enough resources
            if (btn) {
                const prevId = i - 1;
                const req = ELEMENTS[i-1].mergeReq;
                btn.disabled = game.elements[prevId] < req;
            }
        } else {
            if (row) row.classList.add("hidden");
            if (btn) btn.classList.add("hidden");
        }
    }

    // Update Hydrogen Buy Button
    const btnBuyH = document.getElementById("btn-buy-h");
    if (btnBuyH) btnBuyH.disabled = game.quarks < 1;

    // Update Upgrades UI
    document.getElementById("generator-owned").textContent = game.generators;
    document.getElementById("generator-cost").textContent = formatNumber(getGeneratorCost());
    document.getElementById("btn-buy-generator").disabled = game.quarks < getGeneratorCost();

    const radiationMultiplier = 1 + (game.backgroundRadiation * 0.05);
    const quarksPerSec = game.generators * radiationMultiplier;
    document.getElementById("quarks-rate").textContent = `${formatNumber(quarksPerSec)} / sec`;

    const processorCost = getProcessorCost();
    const btnProcessor = document.getElementById("btn-buy-processor");

    // Reveal processor once they have at least 1 generator
    if (game.generators > 0) {
        btnProcessor.classList.remove("hidden");
        document.getElementById("processor-owned").textContent = game.processors;
        document.getElementById("processor-cost").textContent = formatNumber(processorCost);
        btnProcessor.disabled = game.quarks < processorCost;
    }

    // Update Prestige UI
    const prestigeGain = getPrestigeGain();
    const prestigeSection = document.getElementById("prestige-section");
    const radDisplay = document.getElementById("radiation-display");

    // Reveal prestige if they could gain > 0 or already have radiation
    if (prestigeGain > 0 || game.backgroundRadiation > 0) {
        prestigeSection.classList.remove("hidden");
        document.getElementById("prestige-gain").textContent = formatNumber(prestigeGain);
        document.getElementById("btn-prestige").disabled = prestigeGain <= 0;
    } else {
        prestigeSection.classList.add("hidden");
    }

    if (game.backgroundRadiation > 0) {
        radDisplay.classList.remove("hidden");
        document.getElementById("radiation-amount").textContent = formatNumber(game.backgroundRadiation);
        document.getElementById("radiation-boost").textContent = (game.backgroundRadiation * 5).toFixed(0);
    } else {
        radDisplay.classList.add("hidden");
    }
}

// Event Listeners for Settings
document.getElementById("btn-save").addEventListener("click", () => saveGame(true));
document.getElementById("btn-export").addEventListener("click", exportSave);
document.getElementById("btn-import").addEventListener("click", importSave);
document.getElementById("btn-hard-reset").addEventListener("click", resetGame);

document.getElementById("btn-close-export").addEventListener("click", closeModals);
document.getElementById("btn-close-import").addEventListener("click", closeModals);
document.getElementById("btn-confirm-import").addEventListener("click", confirmImport);

// Initialization and Game Loop
setInterval(() => saveGame(), 10000); // Auto save every 10 seconds
setInterval(gameTick, 100); // Game tick every 100ms

window.onload = () => {
    initUI();
    loadGame();
    lastTick = Date.now(); // reset last tick after load to prevent huge jump
    updateUI();
};
