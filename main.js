// Game Data Structure
const DEFAULT_STATE = {
    quarks: 0,
    backgroundRadiation: 0,
    hasPrestiged: false,
    generators: 0, // Generates Quarks
    synthesizers: 0, // Automates Hydrogen
    processors: 0, // Automates Merging
    accelerators: 0, // Global speed multiplier
    language: "en", // default language
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
    molecules: {
        1: 0, // H2
        2: 0, // H2O
        3: 0, // CO2
        4: 0, // CH4
    },
    lastSaveTime: Date.now()
};

let game = JSON.parse(JSON.stringify(DEFAULT_STATE));
const SAVE_KEY = "atomicIdleSave";

// Translations
const TRANSLATIONS = {
    en: {
        resources: "Resources",
        actions: "Actions",
        upgrades: "Upgrades & Automation",
        quarks: "Quarks",
        periodicTable: "Periodic Table",
        gatherQuarks: "Gather Quarks",
        cosmicReset: "Cosmic Reset",
        cosmicDesc: "Trigger a cosmic reset to earn Background Radiation.",
        resetFor: "Reset for",
        radiation: "Radiation",
        save: "Save",
        exportSave: "Export Save",
        importSave: "Import Save",
        wipeSave: "Wipe Save",
        exportDesc: "Copy this text to save your game safely:",
        close: "Close",
        importDesc: "Paste your save text here:",
        importBtn: "Import",
        cancel: "Cancel",
        discoveryProgress: "Discovery Progress",
        buyGenerator: "Buy Quark Generator",
        buySynthesizer: "Buy H-Synthesizer (Auto-Hydrogen)",
        buyProcessor: "Buy Atom Processor (Auto-Merge)",
        buyAccelerator: "Buy Time Accelerator (Game Speed x1.5)",
        cost: "Cost",
        owned: "Owned",
        createH: "Create Hydrogen",
        merge: "Merge",
        into: "into",
        baseElement: "Base Element",
        molecules: "Molecules",
        craft: "Craft",
        bonusH2: "H2 Bonus: Quarks x",
        bonusH2O: "H2O Bonus: Atom Processors x",
        bonusCO2: "CO2 Bonus: Synthesizers x",
        bonusCH4: "CH4 Bonus: Background Radiation +",
        hintH2: "Hint: Two basic elements combined.",
        hintH2O: "Hint: 2 Hydrogen + 1 Oxygen.",
        hintCO2: "Hint: 1 Carbon + 2 Oxygen.",
        hintCH4: "Hint: 1 Carbon + 4 Hydrogen."
    },
    cz: {
        resources: "Zdroje",
        actions: "Akce",
        upgrades: "Vylepšení a Automatizace",
        quarks: "Kvarky",
        periodicTable: "Periodická Tabulka",
        gatherQuarks: "Sbírat Kvarky",
        cosmicReset: "Kosmický Reset",
        cosmicDesc: "Spusťte kosmický reset k získání Základního Záření.",
        resetFor: "Resetovat za",
        radiation: "Záření",
        save: "Uložit",
        exportSave: "Exportovat Uložení",
        importSave: "Importovat Uložení",
        wipeSave: "Smazat Uložení",
        exportDesc: "Zkopírujte tento text pro bezpečné uložení hry:",
        close: "Zavřít",
        importDesc: "Zde vložte text uložení:",
        importBtn: "Importovat",
        cancel: "Zrušit",
        discoveryProgress: "Pokrok v Objevování",
        buyGenerator: "Koupit Generátor Kvarků",
        buySynthesizer: "Koupit H-Syntetizátor (Auto-Vodík)",
        buyProcessor: "Koupit Atomový Procesor (Auto-Sloučení)",
        buyAccelerator: "Koupit Urychlovač Času (Rychlost Hry x1.5)",
        cost: "Cena",
        owned: "Vlastněno",
        createH: "Vytvořit Vodík",
        merge: "Sloučit",
        into: "do",
        baseElement: "Základní Prvek",
        molecules: "Molekuly",
        craft: "Vytvořit",
        bonusH2: "H2 Bonus: Kvarky x",
        bonusH2O: "H2O Bonus: Atomové Procesory x",
        bonusCO2: "CO2 Bonus: Syntetizátory x",
        bonusCH4: "CH4 Bonus: Základní Záření +",
        hintH2: "Nápověda: Dva základní prvky dohromady.",
        hintH2O: "Nápověda: 2 Vodík + 1 Kyslík.",
        hintCO2: "Nápověda: 1 Uhlík + 2 Kyslík.",
        hintCH4: "Nápověda: 1 Uhlík + 4 Vodík."
    }
};

function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) lang = "en";
    game.language = lang;

    // Update simple text elements
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (TRANSLATIONS[lang][key]) {
            el.textContent = TRANSLATIONS[lang][key];
        }
    });

    // Re-init UI to redraw dynamic strings with new language
    initUI();
    updateUI();
}

function toggleLanguage() {
    const nextLang = game.language === "en" ? "cz" : "en";
    setLanguage(nextLang);
    saveGame();
}

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
            game = {
                ...DEFAULT_STATE,
                ...savedData,
                elements: { ...DEFAULT_STATE.elements, ...savedData.elements },
                molecules: { ...DEFAULT_STATE.molecules, ...savedData.molecules }
            };

            // Handle missing properties from older saves
            if (typeof game.synthesizers === "undefined") game.synthesizers = 0;
            if (typeof game.language === "undefined") game.language = "en";
            if (typeof game.hasPrestiged === "undefined") game.hasPrestiged = game.backgroundRadiation > 0;
            if (typeof game.accelerators === "undefined") game.accelerators = 0;

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

function craftMolecule(molId) {
    const mol = MOLECULES.find(m => m.id === molId);
    if (!mol) return;

    // Check requirements
    let canCraft = true;
    for (let eId in mol.reqs) {
        if (game.elements[eId] < mol.reqs[eId]) {
            canCraft = false;
        }
    }

    if (canCraft) {
        for (let eId in mol.reqs) {
            game.elements[eId] -= mol.reqs[eId];
        }
        if (typeof game.molecules[mol.id] === 'undefined') game.molecules[mol.id] = 0;
        game.molecules[mol.id]++;
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
    { id: 3, name: "Lithium", symbol: "Li", mergeReq: 4 }, // Needs 4 He
    { id: 4, name: "Beryllium", symbol: "Be", mergeReq: 4 }, // Needs 4 Li
    { id: 5, name: "Boron", symbol: "B", mergeReq: 3 },    // Needs 3 Be
    { id: 6, name: "Carbon", symbol: "C", mergeReq: 3 },   // Needs 3 B
    { id: 7, name: "Nitrogen", symbol: "N", mergeReq: 3 }, // Needs 3 C
    { id: 8, name: "Oxygen", symbol: "O", mergeReq: 3 }    // Needs 3 N
];

// Molecule Definitions
const MOLECULES = [
    { id: 1, name: "Diatomic Hydrogen", symbol: "H2", reqs: { 1: 2 }, hintKey: "hintH2" },
    { id: 2, name: "Water", symbol: "H2O", reqs: { 1: 2, 8: 1 }, hintKey: "hintH2O" },
    { id: 3, name: "Carbon Dioxide", symbol: "CO2", reqs: { 6: 1, 8: 2 }, hintKey: "hintCO2" },
    { id: 4, name: "Methane", symbol: "CH4", reqs: { 6: 1, 1: 4 }, hintKey: "hintCH4" }
];

// Game Loop Setup
let lastTick = Date.now();

// Upgrades & Automation Logic
function getGeneratorCost() {
    return Math.floor(15 * Math.pow(1.7, game.generators)); // Increased scaling
}

function getSynthesizerCost() {
    return Math.floor(100 * Math.pow(2.0, game.synthesizers)); // New Upgrade
}

function getProcessorCost() {
    return Math.floor(250 * Math.pow(2.2, game.processors)); // Increased scaling
}

function getAcceleratorCost() {
    return Math.floor(1000 * Math.pow(3.0, game.accelerators));
}

function buyGenerator() {
    const cost = getGeneratorCost();
    if (game.quarks >= cost) {
        game.quarks -= cost;
        game.generators++;
        updateUI();
    }
}

function buyAccelerator() {
    const cost = getAcceleratorCost();
    if (game.quarks >= cost) {
        game.quarks -= cost;
        game.accelerators++;
        updateUI();
    }
}

function buySynthesizer() {
    const cost = getSynthesizerCost();
    if (game.quarks >= cost) {
        game.quarks -= cost;
        game.synthesizers++;
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
    const rawDt = (now - lastTick) / 1000;
    lastTick = now;

    // Apply speed multiplier based on accelerators
    const speedMultiplier = 1 + (game.accelerators * 0.5); // 50% faster per accelerator
    const simulatedDt = rawDt * speedMultiplier;

    simulateProgress(simulatedDt);
    updateUI();
}

function simulateProgress(dt) {
    // Make base generation slightly slower initially (0.8 multiplier)
    const baseGenerationSpeed = 0.8;

    // Molecule Bonuses
    const h2Bonus = 1 + ((game.molecules[1] || 0) * 0.5); // H2 boosts Quarks
    const h2oBonus = 1 + ((game.molecules[2] || 0) * 0.25); // H2O boosts Processors
    const co2Bonus = 1 + ((game.molecules[3] || 0) * 0.25); // CO2 boosts Synthesizers
    const ch4Bonus = (game.molecules[4] || 0); // CH4 adds direct background radiation per second

    if (ch4Bonus > 0) {
        game.backgroundRadiation += (ch4Bonus * dt);
    }

    // 1. Generators produce Quarks
    if (game.generators > 0) {
        const radiationMultiplier = 1 + (game.backgroundRadiation * 0.05);
        const quarksPerSec = game.generators * radiationMultiplier * baseGenerationSpeed * h2Bonus;
        game.quarks += quarksPerSec * dt;
    }

    // 1.5 Synthesizers automate Hydrogen creation
    if (game.synthesizers > 0) {
        const hPerSec = game.synthesizers * co2Bonus;
        const possibleHThisTick = hPerSec * dt;

        let hToBuy = Math.floor(possibleHThisTick);
        if (Math.random() < (possibleHThisTick % 1)) hToBuy++;

        if (hToBuy > 0) {
            const cost = hToBuy * ELEMENTS[0].baseCost;
            if (game.quarks >= cost) {
                game.quarks -= cost;
                game.elements[1] += hToBuy;
            } else {
                const maxBuy = Math.floor(game.quarks / ELEMENTS[0].baseCost);
                game.quarks -= maxBuy * ELEMENTS[0].baseCost;
                game.elements[1] += maxBuy;
            }
        }
    }

    // 2. Processors automate merging (bottom-up to avoid double processing in one tick)
    if (game.processors > 0) {
        const mergesPerSec = game.processors * h2oBonus;
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
        game.synthesizers = 0;
        for (let i = 1; i <= 8; i++) {
            game.elements[i] = 0;
        }

        saveGame(true);
        updateUI();
    }
}

// Core Actions
function gatherQuarks() {
    const h2Bonus = 1 + ((game.molecules[1] || 0) * 0.5);
    const radiationMultiplier = 1 + (game.backgroundRadiation * 0.05); // 5% boost per radiation
    game.quarks += 1 * radiationMultiplier * h2Bonus;
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
    const mergersContainer = document.getElementById("mergers-container");
    const automationContainer = document.getElementById("automation-container");
    const moleculesContainer = document.getElementById("molecules-container");
    const t = TRANSLATIONS[game.language] || TRANSLATIONS["en"];

    // Clear and build automators
    automationContainer.innerHTML = `
        <button id="btn-buy-generator" class="upgrade-btn">
            ${t.buyGenerator}
            <span class="cost">${t.cost}: <span id="generator-cost">10</span> ${t.quarks}</span>
            <span class="owned">${t.owned}: <span id="generator-owned">0</span></span>
        </button>
        <button id="btn-buy-synthesizer" class="upgrade-btn hidden">
            ${t.buySynthesizer}
            <span class="cost">${t.cost}: <span id="synthesizer-cost">100</span> ${t.quarks}</span>
            <span class="owned">${t.owned}: <span id="synthesizer-owned">0</span></span>
        </button>
        <button id="btn-buy-processor" class="upgrade-btn hidden">
            ${t.buyProcessor}
            <span class="cost">${t.cost}: <span id="processor-cost">250</span> ${t.quarks}</span>
            <span class="owned">${t.owned}: <span id="processor-owned">0</span></span>
        </button>
        <button id="btn-buy-accelerator" class="upgrade-btn hidden">
            ${t.buyAccelerator}
            <span class="cost">${t.cost}: <span id="accelerator-cost">1000</span> ${t.quarks}</span>
            <span class="owned">${t.owned}: <span id="accelerator-owned">0</span></span>
        </button>
    `;

    document.getElementById("btn-buy-generator").onclick = buyGenerator;
    document.getElementById("btn-buy-synthesizer").onclick = buySynthesizer;
    document.getElementById("btn-buy-processor").onclick = buyProcessor;
    document.getElementById("btn-buy-accelerator").onclick = buyAccelerator;

    document.getElementById("btn-prestige").onclick = doPrestige;

    mergersContainer.innerHTML = "";

    const periodicGrid = document.getElementById("periodic-grid");
    periodicGrid.innerHTML = "";

    // Add Hydrogen to Periodic Table
    periodicGrid.innerHTML += `
        <div class="periodic-cell" id="pt-cell-1">
            <span class="periodic-number">1</span>
            <span class="periodic-symbol">H</span>
            <span class="periodic-amt" id="pt-amt-1">0</span>
            <div class="cell-tooltip">${ELEMENTS[0].name}<br>${t.baseElement}</div>
        </div>
    `;

    const buyHBtn = document.createElement("button");
    buyHBtn.className = "action-btn";
    buyHBtn.id = "btn-buy-h";
    buyHBtn.innerHTML = `${t.createH} <span class="cost">(1 Quark)</span>`;
    buyHBtn.onclick = buyHydrogen;
    mergersContainer.appendChild(buyHBtn);

    // Other Elements UI
    for (let i = 1; i < ELEMENTS.length; i++) {
        const el = ELEMENTS[i];
        const prevEl = ELEMENTS[i-1];

        periodicGrid.innerHTML += `
            <div class="periodic-cell hidden" id="pt-cell-${el.id}">
                <span class="periodic-number">${el.id}</span>
                <span class="periodic-symbol">${el.symbol}</span>
                <span class="periodic-amt" id="pt-amt-${el.id}">0</span>
                <div class="cell-tooltip">${el.name}<br>${t.cost}: ${el.mergeReq} ${prevEl.symbol}</div>
            </div>
        `;

        const mergeBtn = document.createElement("button");
        mergeBtn.className = "action-btn hidden";
        mergeBtn.id = `btn-merge-${el.id}`;
        mergeBtn.innerHTML = `${t.merge} ${prevEl.name} ${t.into} ${el.name} <span class="cost">(${el.mergeReq} ${prevEl.symbol})</span>`;
        mergeBtn.onclick = () => mergeElement(el.id);
        mergersContainer.appendChild(mergeBtn);
    }

    // Build Molecules UI
    if (moleculesContainer) {
        moleculesContainer.innerHTML = "";
        MOLECULES.forEach(mol => {
            let reqHtml = "";
            for (let eId in mol.reqs) {
                const eDef = ELEMENTS.find(e => e.id == eId);
                reqHtml += `${mol.reqs[eId]} ${eDef.symbol} `;
            }
            const bonusText = t[`bonus${mol.symbol}`] || `${mol.symbol} Bonus:`;

            moleculesContainer.innerHTML += `
                <div class="molecule-box hidden" id="mol-box-${mol.id}">
                    <div class="mol-header">
                        <strong>${mol.name} (${mol.symbol})</strong>
                        <span>${t.owned}: <span id="mol-amt-${mol.id}">0</span></span>
                    </div>
                    <div class="mol-bonus">${bonusText} <span id="mol-bonus-${mol.id}">1</span></div>
                    <button id="btn-craft-${mol.id}" class="action-btn mol-craft-btn">
                        ${t.craft} ${mol.symbol} <span class="cost">(${reqHtml.trim()})</span>
                    </button>
                    <div id="mol-hint-${mol.id}" class="mol-hint hidden">${t[mol.hintKey]}</div>
                </div>
            `;
        });

        // Add listeners
        MOLECULES.forEach(mol => {
            const btn = document.getElementById(`btn-craft-${mol.id}`);
            if(btn) btn.onclick = () => craftMolecule(mol.id);
        });
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
    document.getElementById("pt-amt-1").textContent = formatNumber(game.elements[1]);

    let highestElementSeen = 1;
    for (let i = 1; i <= 8; i++) {
        if (game.elements[i] > 0) highestElementSeen = i;
    }

    // Update Progress Statistic
    const unlockedElementsCount = highestElementSeen;
    const progressPct = Math.floor((unlockedElementsCount / 8) * 100);
    document.getElementById("discovery-progress-fill").style.width = `${progressPct}%`;
    document.getElementById("discovery-progress-text").textContent = `${unlockedElementsCount}/8`;
    document.getElementById("discovery-progress-pct").textContent = progressPct;

    // Update Molecules UI
    const tabBtnMolecules = document.getElementById("tab-btn-molecules");
    const tabMolecules = document.getElementById("tab-molecules");
    if (game.hasPrestiged) {
        if(tabBtnMolecules) tabBtnMolecules.classList.remove("hidden");
        // Show panel if it's active in desktop mode (mobile handles via tabs)
        if(tabMolecules && tabBtnMolecules && tabBtnMolecules.classList.contains("active")) {
            tabMolecules.classList.remove("hidden");
        } else if(tabMolecules && window.innerWidth > 768) {
            tabMolecules.classList.remove("hidden");
        }

        MOLECULES.forEach(mol => {
            const box = document.getElementById(`mol-box-${mol.id}`);
            const hint = document.getElementById(`mol-hint-${mol.id}`);
            const btn = document.getElementById(`btn-craft-${mol.id}`);
            const amtSpan = document.getElementById(`mol-amt-${mol.id}`);
            const bonusSpan = document.getElementById(`mol-bonus-${mol.id}`);

            if(box) box.classList.remove("hidden");
            if(amtSpan) amtSpan.textContent = formatNumber(game.molecules[mol.id] || 0);

            // Check if player has the required elements to even see it vs hint
            let hasSeenReqs = true;
            let canCraft = true;
            for (let eId in mol.reqs) {
                if (game.elements[eId] === 0 && game.molecules[mol.id] === 0) hasSeenReqs = false;
                if (game.elements[eId] < mol.reqs[eId]) canCraft = false;
            }

            if (game.molecules[mol.id] > 0 || hasSeenReqs) {
                if(btn) btn.classList.remove("hidden");
                if(hint) hint.classList.add("hidden");
            } else {
                if(btn) btn.classList.add("hidden");
                if(hint) hint.classList.remove("hidden");
            }
            if(btn) btn.disabled = !canCraft;

            // Update bonus displays
            if(bonusSpan) {
                let bonusVal = 1;
                const mAmount = game.molecules[mol.id] || 0;
                if(mol.id === 1) bonusVal = 1 + (mAmount * 0.5); // H2: 1.5x quarks per molecule
                if(mol.id === 2) bonusVal = 1 + (mAmount * 0.25); // H2O: 1.25x processors speed
                if(mol.id === 3) bonusVal = 1 + (mAmount * 0.25); // CO2: 1.25x synthesizer speed
                if(mol.id === 4) bonusVal = mAmount; // CH4: +1 background radiation per tick per molecule

                if (mol.id === 4) {
                     bonusSpan.textContent = formatNumber(bonusVal);
                } else {
                     bonusSpan.textContent = formatNumber(bonusVal); // The translation text already includes the 'x'
                }
            }
        });
    } else {
        if(tabBtnMolecules) tabBtnMolecules.classList.add("hidden");
        if(tabMolecules) tabMolecules.classList.add("hidden");
    }

    // Reveal elements progressively (show one tier ahead of what you have)
    const displayThreshold = Math.min(8, highestElementSeen + 1);

    for (let i = 2; i <= 8; i++) {
        const ptAmtSpan = document.getElementById(`pt-amt-${i}`);
        if (ptAmtSpan) ptAmtSpan.textContent = formatNumber(game.elements[i]);

        const ptCell = document.getElementById(`pt-cell-${i}`);
        const btn = document.getElementById(`btn-merge-${i}`);

        if (i <= displayThreshold) {
            if (ptCell) ptCell.classList.remove("hidden");
            if (btn) btn.classList.remove("hidden");

            // Disable button if not enough resources
            if (btn) {
                const prevId = i - 1;
                const req = ELEMENTS[i-1].mergeReq;
                btn.disabled = game.elements[prevId] < req;
            }
        } else {
            if (ptCell) ptCell.classList.add("hidden");
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

    const h2Bonus = 1 + ((game.molecules[1] || 0) * 0.5);
    const radiationMultiplier = 1 + (game.backgroundRadiation * 0.05);
    const baseGenerationSpeed = 0.8;
    const quarksPerSec = game.generators * radiationMultiplier * baseGenerationSpeed * h2Bonus;
    document.getElementById("quarks-rate").textContent = `${formatNumber(quarksPerSec)} / sec`;

    const synthesizerCost = getSynthesizerCost();
    const btnSynthesizer = document.getElementById("btn-buy-synthesizer");

    // Reveal synthesizer once they have at least 1 generator
    if (game.generators > 0) {
        btnSynthesizer.classList.remove("hidden");
        document.getElementById("synthesizer-owned").textContent = game.synthesizers;
        document.getElementById("synthesizer-cost").textContent = formatNumber(synthesizerCost);
        btnSynthesizer.disabled = game.quarks < synthesizerCost;
    }

    const processorCost = getProcessorCost();
    const btnProcessor = document.getElementById("btn-buy-processor");

    // Reveal processor once they have at least 1 synthesizer
    if (game.synthesizers > 0) {
        btnProcessor.classList.remove("hidden");
        document.getElementById("processor-owned").textContent = game.processors;
        document.getElementById("processor-cost").textContent = formatNumber(processorCost);
        btnProcessor.disabled = game.quarks < processorCost;
    }

    const acceleratorCost = getAcceleratorCost();
    const btnAccelerator = document.getElementById("btn-buy-accelerator");

    // Reveal accelerator once they have at least 1 processor
    if (game.processors > 0) {
        btnAccelerator.classList.remove("hidden");
        document.getElementById("accelerator-owned").textContent = game.accelerators;
        document.getElementById("accelerator-cost").textContent = formatNumber(acceleratorCost);
        btnAccelerator.disabled = game.quarks < acceleratorCost;
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
document.getElementById("btn-toggle-lang").addEventListener("click", toggleLanguage);

// Tab Navigation Logic
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        // Remove active class from all
        tabBtns.forEach(b => b.classList.remove("active"));
        tabContents.forEach(c => c.classList.remove("active"));

        // Add active to clicked and corresponding content
        btn.classList.add("active");
        const targetId = btn.getAttribute("data-tab");
        document.getElementById(targetId).classList.add("active");
    });
});

// Initialization and Game Loop
setInterval(() => saveGame(), 10000); // Auto save every 10 seconds
setInterval(gameTick, 100); // Game tick every 100ms

window.onload = () => {
    loadGame();
    setLanguage(game.language); // this calls initUI and updateUI
    lastTick = Date.now(); // reset last tick after load to prevent huge jump
};
