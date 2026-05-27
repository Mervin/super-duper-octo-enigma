// Game Data Structure
const DEFAULT_STATE = {
    quarks: 0,
    backgroundRadiation: 0,
    hasPrestiged: false,
    generators: 0, // Generates Quarks
    synthesizers: 0, // Automates Hydrogen
    processors: 0, // Automates Merging
    accelerators: 0, // Global speed multiplier
    automationToggles: {
        generators: true,
        synthesizers: true,
        processors: true
    },
    language: "en", // default language
    elements: {}, // Populated dynamically
    molecules: {}, // Populated dynamically
    discoveredMolecules: {}, // Populated dynamically, true if discovered
    unlockedMoleculeAutobuyers: {}, // true if autobuyer is unlocked for mol.id
    moleculeAutobuyersActive: {}, // true if autobuyer is toggled ON for mol.id
    totalMoleculeAutobuyersUnlocked: 0,
    researchEndTime: 0, // When current research finishes
    prestigeCount: 0, // Number of times prestiged
    monomers: {}, // Monomer amounts
    discoveredMonomers: {}, // Monomer discovery tracking
    polymers: {}, // Polymer lengths
    lastSaveTime: Date.now(),
    stats: {
        timePlayedSeconds: 0,
        totalQuarksEver: 0,
        totalWeightProduced: 0
    }
};

// Define Monomers and Polymers structure
const MONOMERS = [
    { id: 1, name: "Ethene", symbol: "C2H4", reqs: { 6: 2, 1: 4 } },
    { id: 2, name: "Styrene", symbol: "C8H8", reqs: { 6: 8, 1: 8 } },
    { id: 3, name: "Vinyl Chloride", symbol: "C2H3Cl", reqs: { 6: 2, 1: 3, 17: 1 } },
    { id: 4, name: "Tetrafluoroethylene", symbol: "C2F4", reqs: { 6: 2, 9: 4 } }
];

const POLYMERS = [
    { id: 1, monomerId: 1, name: "Polyethylene", symbol: "PE", effectKey: "peBonus", description: "Multiplies Quark Generation.", baseCost: 5, costMult: 1.5 },
    { id: 2, monomerId: 2, name: "Polystyrene", symbol: "PS", effectKey: "psBonus", description: "Multiplies Processor Speed.", baseCost: 10, costMult: 1.6 },
    { id: 3, monomerId: 3, name: "Polyvinyl Chloride", symbol: "PVC", effectKey: "pvcBonus", description: "Multiplies Synthesizer Speed.", baseCost: 15, costMult: 1.7 },
    { id: 4, monomerId: 4, name: "Polytetrafluoroethylene", symbol: "PTFE", effectKey: "ptfeBonus", description: "Increases Global Game Speed.", baseCost: 20, costMult: 1.8 }
];

// Initialize default elements and molecules objects
for (let i = 1; i <= 118; i++) {
    DEFAULT_STATE.elements[i] = 0;
}
for (let i = 1; i <= 27; i++) {
    DEFAULT_STATE.molecules[i] = 0;
    DEFAULT_STATE.discoveredMolecules[i] = false;
}
for (let i = 1; i <= MONOMERS.length; i++) {
    DEFAULT_STATE.monomers[i] = 0;
    DEFAULT_STATE.discoveredMonomers[i] = false;
}
for (let i = 1; i <= POLYMERS.length; i++) {
    DEFAULT_STATE.polymers[i] = 0;
}
// H2 discovered by default
DEFAULT_STATE.discoveredMolecules[1] = true;

let game = JSON.parse(JSON.stringify(DEFAULT_STATE));
const SAVE_KEY = "atomicIdleSave";

let globalCraftAmount = 1; // can be 1, 10, 25, or 'max'

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
        hintCH4: "Hint: 1 Carbon + 4 Hydrogen.",
        settings: "Settings"
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
        hintCH4: "Nápověda: 1 Uhlík + 4 Vodík.",
        settings: "Nastavení"
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
                molecules: { ...DEFAULT_STATE.molecules, ...savedData.molecules },
                discoveredMolecules: { ...DEFAULT_STATE.discoveredMolecules, ...savedData.discoveredMolecules }
            };

            // Handle missing properties from older saves
            if (typeof game.synthesizers === "undefined") game.synthesizers = 0;
            if (typeof game.language === "undefined") game.language = "en";
            if (typeof game.hasPrestiged === "undefined") game.hasPrestiged = game.backgroundRadiation > 0;
            if (typeof game.accelerators === "undefined") game.accelerators = 0;
            if (typeof game.researchEndTime === "undefined") game.researchEndTime = 0;
            if (typeof game.automationToggles === "undefined") game.automationToggles = { generators: true, synthesizers: true, processors: true };
            if (typeof game.researchesDone === "undefined") game.researchesDone = 0;
            if (typeof game.prestigeCount === "undefined") game.prestigeCount = game.hasPrestiged ? 1 : 0;
            if (typeof game.monomers === "undefined") game.monomers = { ...DEFAULT_STATE.monomers };
            if (typeof game.discoveredMonomers === "undefined") game.discoveredMonomers = { ...DEFAULT_STATE.discoveredMonomers };
            if (typeof game.polymers === "undefined") game.polymers = { ...DEFAULT_STATE.polymers };

            if (typeof game.unlockedMoleculeAutobuyers === "undefined") game.unlockedMoleculeAutobuyers = {};
            if (typeof game.moleculeAutobuyersActive === "undefined") game.moleculeAutobuyersActive = {};
            if (typeof game.totalMoleculeAutobuyersUnlocked === "undefined") game.totalMoleculeAutobuyersUnlocked = 0;
            if (typeof game.stats === "undefined") game.stats = { ...DEFAULT_STATE.stats };

            // Retroactive fix: ensure H2 is discovered
            game.discoveredMolecules[1] = true;
            // Retroactive fix: ensure initial molecules are marked discovered if player had them before update
            for (let i = 1; i <= 4; i++) {
                if (game.molecules[i] > 0) game.discoveredMolecules[i] = true;
            }

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

function craftMolecule(molId, autoAmount = null) {
    const mol = MOLECULES.find(m => m.id === molId);
    if (!mol) return;

    let maxPossible = Infinity;
    for (let eId in mol.reqs) {
        const available = game.elements[eId] || 0;
        const required = mol.reqs[eId];
        const possibleWithThisElement = Math.floor(available / required);
        if (possibleWithThisElement < maxPossible) {
            maxPossible = possibleWithThisElement;
        }
    }

    if (maxPossible <= 0) return;

    let amountToCraft = 1;
    if (autoAmount !== null) {
        if (autoAmount === 'max') {
            amountToCraft = maxPossible;
        } else {
            amountToCraft = Math.min(autoAmount, maxPossible);
        }
    } else {
        if (globalCraftAmount === 'max') {
            amountToCraft = maxPossible;
        } else {
            amountToCraft = Math.min(globalCraftAmount, maxPossible);
        }
    }

    if (amountToCraft > 0) {
        for (let eId in mol.reqs) {
            game.elements[eId] -= (mol.reqs[eId] * amountToCraft);
        }
        if (typeof game.molecules[mol.id] === 'undefined') game.molecules[mol.id] = 0;
        game.molecules[mol.id] += amountToCraft;
        if (autoAmount === null || autoAmount !== 'max') updateUI();
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
    {
        "id": 1,
        "name": {
            "en": "Hydrogen",
            "cz": "Vodík"
        },
        "symbol": "H",
        "baseCost": 1
    },
    {
        "id": 2,
        "name": {
            "en": "Helium",
            "cz": "Helium"
        },
        "symbol": "He",
        "mergeReq": 6
    },
    {
        "id": 3,
        "name": {
            "en": "Lithium",
            "cz": "Lithium"
        },
        "symbol": "Li",
        "mergeReq": 2
    },
    {
        "id": 4,
        "name": {
            "en": "Beryllium",
            "cz": "Beryllium"
        },
        "symbol": "Be",
        "mergeReq": 3
    },
    {
        "id": 5,
        "name": {
            "en": "Boron",
            "cz": "Bór"
        },
        "symbol": "B",
        "mergeReq": 4
    },
    {
        "id": 6,
        "name": {
            "en": "Carbon",
            "cz": "Uhlík"
        },
        "symbol": "C",
        "mergeReq": 4
    },
    {
        "id": 7,
        "name": {
            "en": "Nitrogen",
            "cz": "Dusík"
        },
        "symbol": "N",
        "mergeReq": 5
    },
    {
        "id": 8,
        "name": {
            "en": "Oxygen",
            "cz": "Kyslík"
        },
        "symbol": "O",
        "mergeReq": 5
    },
    {
        "id": 9,
        "name": {
            "en": "Fluorine",
            "cz": "Fluor"
        },
        "symbol": "F",
        "mergeReq": 5
    },
    {
        "id": 10,
        "name": {
            "en": "Neon",
            "cz": "Neon"
        },
        "symbol": "Ne",
        "mergeReq": 6
    },
    {
        "id": 11,
        "name": {
            "en": "Sodium",
            "cz": "Sodík"
        },
        "symbol": "Na",
        "mergeReq": 2
    },
    {
        "id": 12,
        "name": {
            "en": "Magnesium",
            "cz": "Hořčík"
        },
        "symbol": "Mg",
        "mergeReq": 3
    },
    {
        "id": 13,
        "name": {
            "en": "Aluminum",
            "cz": "Hliník"
        },
        "symbol": "Al",
        "mergeReq": 3
    },
    {
        "id": 14,
        "name": {
            "en": "Silicon",
            "cz": "Křemík"
        },
        "symbol": "Si",
        "mergeReq": 4
    },
    {
        "id": 15,
        "name": {
            "en": "Phosphorus",
            "cz": "Fosfor"
        },
        "symbol": "P",
        "mergeReq": 5
    },
    {
        "id": 16,
        "name": {
            "en": "Sulfur",
            "cz": "Síra"
        },
        "symbol": "S",
        "mergeReq": 5
    },
    {
        "id": 17,
        "name": {
            "en": "Chlorine",
            "cz": "Chlor"
        },
        "symbol": "Cl",
        "mergeReq": 5
    },
    {
        "id": 18,
        "name": {
            "en": "Argon",
            "cz": "Argon"
        },
        "symbol": "Ar",
        "mergeReq": 6
    },
    {
        "id": 19,
        "name": {
            "en": "Potassium",
            "cz": "Draslík"
        },
        "symbol": "K",
        "mergeReq": 2
    },
    {
        "id": 20,
        "name": {
            "en": "Calcium",
            "cz": "Vápník"
        },
        "symbol": "Ca",
        "mergeReq": 3
    },
    {
        "id": 21,
        "name": {
            "en": "Scandium",
            "cz": "Skandium"
        },
        "symbol": "Sc",
        "mergeReq": 4
    },
    {
        "id": 22,
        "name": {
            "en": "Titanium",
            "cz": "Titan"
        },
        "symbol": "Ti",
        "mergeReq": 4
    },
    {
        "id": 23,
        "name": {
            "en": "Vanadium",
            "cz": "Vanad"
        },
        "symbol": "V",
        "mergeReq": 4
    },
    {
        "id": 24,
        "name": {
            "en": "Chromium",
            "cz": "Chrom"
        },
        "symbol": "Cr",
        "mergeReq": 4
    },
    {
        "id": 25,
        "name": {
            "en": "Manganese",
            "cz": "Mangan"
        },
        "symbol": "Mn",
        "mergeReq": 4
    },
    {
        "id": 26,
        "name": {
            "en": "Iron",
            "cz": "Železo"
        },
        "symbol": "Fe",
        "mergeReq": 4
    },
    {
        "id": 27,
        "name": {
            "en": "Cobalt",
            "cz": "Kobalt"
        },
        "symbol": "Co",
        "mergeReq": 4
    },
    {
        "id": 28,
        "name": {
            "en": "Nickel",
            "cz": "Nikl"
        },
        "symbol": "Ni",
        "mergeReq": 4
    },
    {
        "id": 29,
        "name": {
            "en": "Copper",
            "cz": "Měď"
        },
        "symbol": "Cu",
        "mergeReq": 4
    },
    {
        "id": 30,
        "name": {
            "en": "Zinc",
            "cz": "Zinek"
        },
        "symbol": "Zn",
        "mergeReq": 4
    },
    {
        "id": 31,
        "name": {
            "en": "Gallium",
            "cz": "Gallium"
        },
        "symbol": "Ga",
        "mergeReq": 3
    },
    {
        "id": 32,
        "name": {
            "en": "Germanium",
            "cz": "Germanium"
        },
        "symbol": "Ge",
        "mergeReq": 4
    },
    {
        "id": 33,
        "name": {
            "en": "Arsenic",
            "cz": "Arsen"
        },
        "symbol": "As",
        "mergeReq": 5
    },
    {
        "id": 34,
        "name": {
            "en": "Selenium",
            "cz": "Selen"
        },
        "symbol": "Se",
        "mergeReq": 5
    },
    {
        "id": 35,
        "name": {
            "en": "Bromine",
            "cz": "Brom"
        },
        "symbol": "Br",
        "mergeReq": 5
    },
    {
        "id": 36,
        "name": {
            "en": "Krypton",
            "cz": "Krypton"
        },
        "symbol": "Kr",
        "mergeReq": 6
    },
    {
        "id": 37,
        "name": {
            "en": "Rubidium",
            "cz": "Rubidium"
        },
        "symbol": "Rb",
        "mergeReq": 2
    },
    {
        "id": 38,
        "name": {
            "en": "Strontium",
            "cz": "Stroncium"
        },
        "symbol": "Sr",
        "mergeReq": 3
    },
    {
        "id": 39,
        "name": {
            "en": "Yttrium",
            "cz": "Yttrium"
        },
        "symbol": "Y",
        "mergeReq": 4
    },
    {
        "id": 40,
        "name": {
            "en": "Zirconium",
            "cz": "Zirkonium"
        },
        "symbol": "Zr",
        "mergeReq": 4
    },
    {
        "id": 41,
        "name": {
            "en": "Niobium",
            "cz": "Niob"
        },
        "symbol": "Nb",
        "mergeReq": 4
    },
    {
        "id": 42,
        "name": {
            "en": "Molybdenum",
            "cz": "Molybden"
        },
        "symbol": "Mo",
        "mergeReq": 4
    },
    {
        "id": 43,
        "name": {
            "en": "Technetium",
            "cz": "Technecium"
        },
        "symbol": "Tc",
        "mergeReq": 4
    },
    {
        "id": 44,
        "name": {
            "en": "Ruthenium",
            "cz": "Ruthenium"
        },
        "symbol": "Ru",
        "mergeReq": 4
    },
    {
        "id": 45,
        "name": {
            "en": "Rhodium",
            "cz": "Rhodium"
        },
        "symbol": "Rh",
        "mergeReq": 4
    },
    {
        "id": 46,
        "name": {
            "en": "Palladium",
            "cz": "Palladium"
        },
        "symbol": "Pd",
        "mergeReq": 4
    },
    {
        "id": 47,
        "name": {
            "en": "Silver",
            "cz": "Stříbro"
        },
        "symbol": "Ag",
        "mergeReq": 4
    },
    {
        "id": 48,
        "name": {
            "en": "Cadmium",
            "cz": "Kadmium"
        },
        "symbol": "Cd",
        "mergeReq": 4
    },
    {
        "id": 49,
        "name": {
            "en": "Indium",
            "cz": "Indium"
        },
        "symbol": "In",
        "mergeReq": 3
    },
    {
        "id": 50,
        "name": {
            "en": "Tin",
            "cz": "Cín"
        },
        "symbol": "Sn",
        "mergeReq": 4
    },
    {
        "id": 51,
        "name": {
            "en": "Antimony",
            "cz": "Antimon"
        },
        "symbol": "Sb",
        "mergeReq": 5
    },
    {
        "id": 52,
        "name": {
            "en": "Tellurium",
            "cz": "Tellur"
        },
        "symbol": "Te",
        "mergeReq": 5
    },
    {
        "id": 53,
        "name": {
            "en": "Iodine",
            "cz": "Jod"
        },
        "symbol": "I",
        "mergeReq": 5
    },
    {
        "id": 54,
        "name": {
            "en": "Xenon",
            "cz": "Xenon"
        },
        "symbol": "Xe",
        "mergeReq": 6
    },
    {
        "id": 55,
        "name": {
            "en": "Cesium",
            "cz": "Cesium"
        },
        "symbol": "Cs",
        "mergeReq": 2
    },
    {
        "id": 56,
        "name": {
            "en": "Barium",
            "cz": "Baryum"
        },
        "symbol": "Ba",
        "mergeReq": 3
    },
    {
        "id": 57,
        "name": {
            "en": "Lanthanum",
            "cz": "Lanthan"
        },
        "symbol": "La",
        "mergeReq": 4
    },
    {
        "id": 58,
        "name": {
            "en": "Cerium",
            "cz": "Cer"
        },
        "symbol": "Ce",
        "mergeReq": 4
    },
    {
        "id": 59,
        "name": {
            "en": "Praseodymium",
            "cz": "Praseodym"
        },
        "symbol": "Pr",
        "mergeReq": 4
    },
    {
        "id": 60,
        "name": {
            "en": "Neodymium",
            "cz": "Neodym"
        },
        "symbol": "Nd",
        "mergeReq": 4
    },
    {
        "id": 61,
        "name": {
            "en": "Promethium",
            "cz": "Promethium"
        },
        "symbol": "Pm",
        "mergeReq": 4
    },
    {
        "id": 62,
        "name": {
            "en": "Samarium",
            "cz": "Samarium"
        },
        "symbol": "Sm",
        "mergeReq": 4
    },
    {
        "id": 63,
        "name": {
            "en": "Europium",
            "cz": "Europium"
        },
        "symbol": "Eu",
        "mergeReq": 4
    },
    {
        "id": 64,
        "name": {
            "en": "Gadolinium",
            "cz": "Gadolinium"
        },
        "symbol": "Gd",
        "mergeReq": 4
    },
    {
        "id": 65,
        "name": {
            "en": "Terbium",
            "cz": "Terbium"
        },
        "symbol": "Tb",
        "mergeReq": 4
    },
    {
        "id": 66,
        "name": {
            "en": "Dysprosium",
            "cz": "Dysprosium"
        },
        "symbol": "Dy",
        "mergeReq": 4
    },
    {
        "id": 67,
        "name": {
            "en": "Holmium",
            "cz": "Holmium"
        },
        "symbol": "Ho",
        "mergeReq": 4
    },
    {
        "id": 68,
        "name": {
            "en": "Erbium",
            "cz": "Erbium"
        },
        "symbol": "Er",
        "mergeReq": 4
    },
    {
        "id": 69,
        "name": {
            "en": "Thulium",
            "cz": "Thulium"
        },
        "symbol": "Tm",
        "mergeReq": 4
    },
    {
        "id": 70,
        "name": {
            "en": "Ytterbium",
            "cz": "Ytterbium"
        },
        "symbol": "Yb",
        "mergeReq": 4
    },
    {
        "id": 71,
        "name": {
            "en": "Lutetium",
            "cz": "Lutecium"
        },
        "symbol": "Lu",
        "mergeReq": 4
    },
    {
        "id": 72,
        "name": {
            "en": "Hafnium",
            "cz": "Hafnium"
        },
        "symbol": "Hf",
        "mergeReq": 4
    },
    {
        "id": 73,
        "name": {
            "en": "Tantalum",
            "cz": "Tantal"
        },
        "symbol": "Ta",
        "mergeReq": 4
    },
    {
        "id": 74,
        "name": {
            "en": "Tungsten",
            "cz": "Wolfram"
        },
        "symbol": "W",
        "mergeReq": 4
    },
    {
        "id": 75,
        "name": {
            "en": "Rhenium",
            "cz": "Rhenium"
        },
        "symbol": "Re",
        "mergeReq": 4
    },
    {
        "id": 76,
        "name": {
            "en": "Osmium",
            "cz": "Osmium"
        },
        "symbol": "Os",
        "mergeReq": 4
    },
    {
        "id": 77,
        "name": {
            "en": "Iridium",
            "cz": "Iridium"
        },
        "symbol": "Ir",
        "mergeReq": 4
    },
    {
        "id": 78,
        "name": {
            "en": "Platinum",
            "cz": "Platina"
        },
        "symbol": "Pt",
        "mergeReq": 4
    },
    {
        "id": 79,
        "name": {
            "en": "Gold",
            "cz": "Zlato"
        },
        "symbol": "Au",
        "mergeReq": 4
    },
    {
        "id": 80,
        "name": {
            "en": "Mercury",
            "cz": "Rtuť"
        },
        "symbol": "Hg",
        "mergeReq": 4
    },
    {
        "id": 81,
        "name": {
            "en": "Thallium",
            "cz": "Thallium"
        },
        "symbol": "Tl",
        "mergeReq": 3
    },
    {
        "id": 82,
        "name": {
            "en": "Lead",
            "cz": "Olovo"
        },
        "symbol": "Pb",
        "mergeReq": 4
    },
    {
        "id": 83,
        "name": {
            "en": "Bismuth",
            "cz": "Bismut"
        },
        "symbol": "Bi",
        "mergeReq": 5
    },
    {
        "id": 84,
        "name": {
            "en": "Polonium",
            "cz": "Polonium"
        },
        "symbol": "Po",
        "mergeReq": 5
    },
    {
        "id": 85,
        "name": {
            "en": "Astatine",
            "cz": "Astat"
        },
        "symbol": "At",
        "mergeReq": 5
    },
    {
        "id": 86,
        "name": {
            "en": "Radon",
            "cz": "Radon"
        },
        "symbol": "Rn",
        "mergeReq": 6
    },
    {
        "id": 87,
        "name": {
            "en": "Francium",
            "cz": "Francium"
        },
        "symbol": "Fr",
        "mergeReq": 2
    },
    {
        "id": 88,
        "name": {
            "en": "Radium",
            "cz": "Radium"
        },
        "symbol": "Ra",
        "mergeReq": 3
    },
    {
        "id": 89,
        "name": {
            "en": "Actinium",
            "cz": "Aktinium"
        },
        "symbol": "Ac",
        "mergeReq": 4
    },
    {
        "id": 90,
        "name": {
            "en": "Thorium",
            "cz": "Thorium"
        },
        "symbol": "Th",
        "mergeReq": 4
    },
    {
        "id": 91,
        "name": {
            "en": "Protactinium",
            "cz": "Protaktinium"
        },
        "symbol": "Pa",
        "mergeReq": 4
    },
    {
        "id": 92,
        "name": {
            "en": "Uranium",
            "cz": "Uran"
        },
        "symbol": "U",
        "mergeReq": 4
    },
    {
        "id": 93,
        "name": {
            "en": "Neptunium",
            "cz": "Neptunium"
        },
        "symbol": "Np",
        "mergeReq": 4
    },
    {
        "id": 94,
        "name": {
            "en": "Plutonium",
            "cz": "Plutonium"
        },
        "symbol": "Pu",
        "mergeReq": 4
    },
    {
        "id": 95,
        "name": {
            "en": "Americium",
            "cz": "Americium"
        },
        "symbol": "Am",
        "mergeReq": 4
    },
    {
        "id": 96,
        "name": {
            "en": "Curium",
            "cz": "Curium"
        },
        "symbol": "Cm",
        "mergeReq": 4
    },
    {
        "id": 97,
        "name": {
            "en": "Berkelium",
            "cz": "Berkelium"
        },
        "symbol": "Bk",
        "mergeReq": 4
    },
    {
        "id": 98,
        "name": {
            "en": "Californium",
            "cz": "Kalifornium"
        },
        "symbol": "Cf",
        "mergeReq": 4
    },
    {
        "id": 99,
        "name": {
            "en": "Einsteinium",
            "cz": "Einsteinium"
        },
        "symbol": "Es",
        "mergeReq": 4
    },
    {
        "id": 100,
        "name": {
            "en": "Fermium",
            "cz": "Fermium"
        },
        "symbol": "Fm",
        "mergeReq": 4
    },
    {
        "id": 101,
        "name": {
            "en": "Mendelevium",
            "cz": "Mendelevium"
        },
        "symbol": "Md",
        "mergeReq": 4
    },
    {
        "id": 102,
        "name": {
            "en": "Nobelium",
            "cz": "Nobelium"
        },
        "symbol": "No",
        "mergeReq": 4
    },
    {
        "id": 103,
        "name": {
            "en": "Lawrencium",
            "cz": "Lawrencium"
        },
        "symbol": "Lr",
        "mergeReq": 4
    },
    {
        "id": 104,
        "name": {
            "en": "Rutherfordium",
            "cz": "Rutherfordium"
        },
        "symbol": "Rf",
        "mergeReq": 4
    },
    {
        "id": 105,
        "name": {
            "en": "Dubnium",
            "cz": "Dubnium"
        },
        "symbol": "Db",
        "mergeReq": 4
    },
    {
        "id": 106,
        "name": {
            "en": "Seaborgium",
            "cz": "Seaborgium"
        },
        "symbol": "Sg",
        "mergeReq": 4
    },
    {
        "id": 107,
        "name": {
            "en": "Bohrium",
            "cz": "Bohrium"
        },
        "symbol": "Bh",
        "mergeReq": 4
    },
    {
        "id": 108,
        "name": {
            "en": "Hassium",
            "cz": "Hassium"
        },
        "symbol": "Hs",
        "mergeReq": 4
    },
    {
        "id": 109,
        "name": {
            "en": "Meitnerium",
            "cz": "Meitnerium"
        },
        "symbol": "Mt",
        "mergeReq": 4
    },
    {
        "id": 110,
        "name": {
            "en": "Darmstadtium",
            "cz": "Darmstadtium"
        },
        "symbol": "Ds",
        "mergeReq": 4
    },
    {
        "id": 111,
        "name": {
            "en": "Roentgenium",
            "cz": "Roentgenium"
        },
        "symbol": "Rg",
        "mergeReq": 4
    },
    {
        "id": 112,
        "name": {
            "en": "Copernicium",
            "cz": "Kopernicium"
        },
        "symbol": "Cn",
        "mergeReq": 4
    },
    {
        "id": 113,
        "name": {
            "en": "Nihonium",
            "cz": "Nihonium"
        },
        "symbol": "Nh",
        "mergeReq": 3
    },
    {
        "id": 114,
        "name": {
            "en": "Flerovium",
            "cz": "Flerovium"
        },
        "symbol": "Fl",
        "mergeReq": 4
    },
    {
        "id": 115,
        "name": {
            "en": "Moscovium",
            "cz": "Moscovium"
        },
        "symbol": "Mc",
        "mergeReq": 5
    },
    {
        "id": 116,
        "name": {
            "en": "Livermorium",
            "cz": "Livermorium"
        },
        "symbol": "Lv",
        "mergeReq": 5
    },
    {
        "id": 117,
        "name": {
            "en": "Tennessine",
            "cz": "Tennessine"
        },
        "symbol": "Ts",
        "mergeReq": 5
    },
    {
        "id": 118,
        "name": {
            "en": "Oganesson",
            "cz": "Oganesson"
        },
        "symbol": "Og",
        "mergeReq": 6
    }
];

// Molecule Definitions
const MOLECULES = [
    {
        "id": 1,
        "name": {
            "en": "Diatomic Hydrogen",
            "cz": "Dvouatomový vodík"
        },
        "symbol": "H2",
        "reqs": {
            "1": 2
        }
    },
    {
        "id": 2,
        "name": {
            "en": "Water",
            "cz": "Voda"
        },
        "symbol": "H2O",
        "reqs": {
            "1": 2,
            "8": 1
        }
    },
    {
        "id": 3,
        "name": {
            "en": "Carbon Dioxide",
            "cz": "Oxid uhličitý"
        },
        "symbol": "CO2",
        "reqs": {
            "6": 1,
            "8": 2
        }
    },
    {
        "id": 4,
        "name": {
            "en": "Methane",
            "cz": "Metan"
        },
        "symbol": "CH4",
        "reqs": {
            "6": 1,
            "1": 4
        }
    },
    {
        "id": 5,
        "name": {
            "en": "Ammonia",
            "cz": "Amoniak"
        },
        "symbol": "NH3",
        "reqs": {
            "7": 1,
            "1": 3
        }
    },
    {
        "id": 6,
        "name": {
            "en": "Sodium Chloride",
            "cz": "Chlorid sodný"
        },
        "symbol": "NaCl",
        "reqs": {
            "11": 1,
            "17": 1
        }
    },
    {
        "id": 7,
        "name": {
            "en": "Sulfuric Acid",
            "cz": "Kyselina sírová"
        },
        "symbol": "H2SO4",
        "reqs": {
            "1": 2,
            "16": 1,
            "8": 4
        }
    },
    {
        "id": 8,
        "name": {
            "en": "Glucose",
            "cz": "Glukóza"
        },
        "symbol": "C6H12O6",
        "reqs": {
            "6": 6,
            "1": 12,
            "8": 6
        }
    },
    {
        "id": 9,
        "name": {
            "en": "Ozone",
            "cz": "Ozon"
        },
        "symbol": "O3",
        "reqs": {
            "8": 3
        }
    },
    {
        "id": 10,
        "name": {
            "en": "Nitric Acid",
            "cz": "Kyselina dusičná"
        },
        "symbol": "HNO3",
        "reqs": {
            "1": 1,
            "7": 1,
            "8": 3
        }
    },
    {
        "id": 11,
        "name": {
            "en": "Hydrochloric Acid",
            "cz": "Kyselina chlorovodíková"
        },
        "symbol": "HCl",
        "reqs": {
            "1": 1,
            "17": 1
        }
    },
    {
        "id": 12,
        "name": {
            "en": "Ethanol",
            "cz": "Etanol"
        },
        "symbol": "C2H5OH",
        "reqs": {
            "6": 2,
            "1": 6,
            "8": 1
        }
    },
    {
        "id": 13,
        "name": {
            "en": "Benzene",
            "cz": "Benzen"
        },
        "symbol": "C6H6",
        "reqs": {
            "6": 6,
            "1": 6
        }
    },
    {
        "id": 14,
        "name": {
            "en": "Aspirin",
            "cz": "Aspirin"
        },
        "symbol": "C9H8O4",
        "reqs": {
            "6": 9,
            "1": 8,
            "8": 4
        }
    },
    {
        "id": 15,
        "name": {
            "en": "Caffeine",
            "cz": "Kofein"
        },
        "symbol": "C8H10N4O2",
        "reqs": {
            "6": 8,
            "1": 10,
            "7": 4,
            "8": 2
        }
    },
    {
        "id": 16,
        "name": {
            "en": "Adenosine Triphosphate (ATP)",
            "cz": "Adenosintrifosfát (ATP)"
        },
        "symbol": "C10H16N5O13P3",
        "reqs": {
            "6": 10,
            "1": 16,
            "7": 5,
            "8": 13,
            "15": 3
        }
    },
    {
        "id": 17,
        "name": {
            "en": "Urea",
            "cz": "Močovina"
        },
        "symbol": "CH4N2O",
        "reqs": {
            "6": 1,
            "1": 4,
            "7": 2,
            "8": 1
        }
    },
    {
        "id": 18,
        "name": {
            "en": "Glycine",
            "cz": "Glycin"
        },
        "symbol": "C2H5NO2",
        "reqs": {
            "6": 2,
            "1": 5,
            "7": 1,
            "8": 2
        }
    },
    {
        "id": 19,
        "name": {
            "en": "Tryptophan",
            "cz": "Tryptofan"
        },
        "symbol": "C11H12N2O2",
        "reqs": {
            "6": 11,
            "1": 12,
            "7": 2,
            "8": 2
        }
    },
    {
        "id": 20,
        "name": {
            "en": "Adrenaline",
            "cz": "Adrenalin"
        },
        "symbol": "C9H13NO3",
        "reqs": {
            "6": 9,
            "1": 13,
            "7": 1,
            "8": 3
        }
    },
    {
        "id": 21,
        "name": {
            "en": "Dopamine",
            "cz": "Dopamin"
        },
        "symbol": "C8H11NO2",
        "reqs": {
            "6": 8,
            "1": 11,
            "7": 1,
            "8": 2
        }
    },
    {
        "id": 22,
        "name": {
            "en": "Serotonin",
            "cz": "Serotonin"
        },
        "symbol": "C10H12N2O",
        "reqs": {
            "6": 10,
            "1": 12,
            "7": 2,
            "8": 1
        }
    },
    {
        "id": 23,
        "name": {
            "en": "Cholesterol",
            "cz": "Cholesterol"
        },
        "symbol": "C27H46O",
        "reqs": {
            "6": 27,
            "1": 46,
            "8": 1
        }
    },
    {
        "id": 24,
        "name": {
            "en": "Vitamin C",
            "cz": "Vitamín C"
        },
        "symbol": "C6H8O6",
        "reqs": {
            "6": 6,
            "1": 8,
            "8": 6
        }
    },
    {
        "id": 25,
        "name": {
            "en": "Calcium Carbonate",
            "cz": "Uhličitan vápenatý"
        },
        "symbol": "CaCO3",
        "reqs": {
            "20": 1,
            "6": 1,
            "8": 3
        }
    },
    {
        "id": 26,
        "name": {
            "en": "Potassium Nitrate",
            "cz": "Dusičnan draselný"
        },
        "symbol": "KNO3",
        "reqs": {
            "19": 1,
            "7": 1,
            "8": 3
        }
    },
    {
        "id": 27,
        "name": {
            "en": "Iron(III) Oxide",
            "cz": "Oxid železitý"
        },
        "symbol": "Fe2O3",
        "reqs": {
            "26": 2,
            "8": 3
        }
    },
    {
        "id": 28,
        "name": {
            "en": "Phosphoric Acid",
            "cz": "Kyselina fosforečná"
        },
        "symbol": "H3PO4",
        "reqs": {
            "1": 3,
            "15": 1,
            "8": 4
        }
    },
    {
        "id": 29,
        "name": {
            "en": "Hydrogen Peroxide",
            "cz": "Peroxid vodíku"
        },
        "symbol": "H2O2",
        "reqs": {
            "1": 2,
            "8": 2
        }
    },
    {
        "id": 30,
        "name": {
            "en": "Sodium Hydroxide",
            "cz": "Hydroxid sodný"
        },
        "symbol": "NaOH",
        "reqs": {
            "11": 1,
            "8": 1,
            "1": 1
        }
    },
    {
        "id": 31,
        "name": {
            "en": "Silver Nitrate",
            "cz": "Dusičnan stříbrný"
        },
        "symbol": "AgNO3",
        "reqs": {
            "47": 1,
            "7": 1,
            "8": 3
        }
    },
    {
        "id": 32,
        "name": {
            "en": "Copper(II) Sulfate",
            "cz": "Síran měďnatý"
        },
        "symbol": "CuSO4",
        "reqs": {
            "29": 1,
            "16": 1,
            "8": 4
        }
    },
    {
        "id": 33,
        "name": {
            "en": "Zinc Oxide",
            "cz": "Oxid zinečnatý"
        },
        "symbol": "ZnO",
        "reqs": {
            "30": 1,
            "8": 1
        }
    },
    {
        "id": 34,
        "name": {
            "en": "Titanium Dioxide",
            "cz": "Oxid titaničitý"
        },
        "symbol": "TiO2",
        "reqs": {
            "22": 1,
            "8": 2
        }
    },
    {
        "id": 35,
        "name": {
            "en": "Lead(II) Sulfide",
            "cz": "Sulfid olovnatý"
        },
        "symbol": "PbS",
        "reqs": {
            "82": 1,
            "16": 1
        }
    },
    {
        "id": 36,
        "name": {
            "en": "Sodium Bicarbonate",
            "cz": "Hydrogenuhličitan sodný"
        },
        "symbol": "NaHCO3",
        "reqs": {
            "11": 1,
            "1": 1,
            "6": 1,
            "8": 3
        }
    },
    {
        "id": 37,
        "name": {
            "en": "Magnesium Sulfate",
            "cz": "Síran hořečnatý"
        },
        "symbol": "MgSO4",
        "reqs": {
            "12": 1,
            "16": 1,
            "8": 4
        }
    },
    {
        "id": 38,
        "name": {
            "en": "Calcium Sulfate",
            "cz": "Síran vápenatý"
        },
        "symbol": "CaSO4",
        "reqs": {
            "20": 1,
            "16": 1,
            "8": 4
        }
    },
    {
        "id": 39,
        "name": {
            "en": "Uranium Hexafluoride",
            "cz": "Fluorid uranový"
        },
        "symbol": "UF6",
        "reqs": {
            "92": 1,
            "9": 6
        }
    },
    {
        "id": 40,
        "name": {
            "en": "Plutonium Dioxide",
            "cz": "Oxid plutoničitý"
        },
        "symbol": "PuO2",
        "reqs": {
            "94": 1,
            "8": 2
        }
    },
    {
        "id": 41,
        "name": {
            "en": "Tungsten Carbide",
            "cz": "Karbid wolframu"
        },
        "symbol": "WC",
        "reqs": {
            "74": 1,
            "6": 1
        }
    },
    {
        "id": 42,
        "name": {
            "en": "Silicon Dioxide",
            "cz": "Oxid křemičitý"
        },
        "symbol": "SiO2",
        "reqs": {
            "14": 1,
            "8": 2
        }
    },
    {
        "id": 43,
        "name": {
            "en": "Aluminum Oxide",
            "cz": "Oxid hlinitý"
        },
        "symbol": "Al2O3",
        "reqs": {
            "13": 2,
            "8": 3
        }
    },
    {
        "id": 44,
        "name": {
            "en": "Lithium Cobalt Oxide",
            "cz": "Oxid lithno-kobaltitý"
        },
        "symbol": "LiCoO2",
        "reqs": {
            "3": 1,
            "27": 1,
            "8": 2
        }
    },
    {
        "id": 45,
        "name": {
            "en": "Gallium Arsenide",
            "cz": "Arsenid gallitý"
        },
        "symbol": "GaAs",
        "reqs": {
            "31": 1,
            "33": 1
        }
    },
    {
        "id": 46,
        "name": {
            "en": "Indium Tin Oxide",
            "cz": "Oxid indito-cíničitý"
        },
        "symbol": "In2SnO4",
        "reqs": {
            "49": 2,
            "50": 1,
            "8": 4
        }
    },
    {
        "id": 47,
        "name": {
            "en": "Yttrium Barium Copper Oxide",
            "cz": "Oxid yttrio-barnato-měďnatý"
        },
        "symbol": "YBa2Cu3O7",
        "reqs": {
            "39": 1,
            "56": 2,
            "29": 3,
            "8": 7
        }
    },
    {
        "id": 48,
        "name": {
            "en": "Sulfur Hexafluoride",
            "cz": "Fluorid sírový"
        },
        "symbol": "SF6",
        "reqs": {
            "16": 1,
            "9": 6
        }
    },
    {
        "id": 49,
        "name": {
            "en": "Trinitrotoluene (TNT)",
            "cz": "Trinitrotoluen (TNT)"
        },
        "symbol": "C7H5N3O6",
        "reqs": {
            "6": 7,
            "1": 5,
            "7": 3,
            "8": 6
        }
    },
    {
        "id": 50,
        "name": {
            "en": "Nitroglycerin",
            "cz": "Nitroglycerin"
        },
        "symbol": "C3H5N3O9",
        "reqs": {
            "6": 3,
            "1": 5,
            "7": 3,
            "8": 9
        }
    },
    {
        "id": 51,
        "name": {
            "en": "Lysergic acid diethylamide (LSD)",
            "cz": "Diethylamid kyseliny lysergové (LSD)"
        },
        "symbol": "C20H25N3O",
        "reqs": {
            "6": 20,
            "1": 25,
            "7": 3,
            "8": 1
        }
    },
    {
        "id": 52,
        "name": {
            "en": "Buckyball",
            "cz": "Fulleren"
        },
        "symbol": "C60",
        "reqs": {
            "6": 60
        }
    },
    {
        "id": 53,
        "name": {
            "en": "Cyanide",
            "cz": "Kyanid"
        },
        "symbol": "CN",
        "reqs": {
            "6": 1,
            "7": 1
        }
    },
    {
        "id": 54,
        "name": {
            "en": "Hydrazine",
            "cz": "Hydrazin"
        },
        "symbol": "N2H4",
        "reqs": {
            "7": 2,
            "1": 4
        }
    },
    {
        "id": 55,
        "name": {
            "en": "Heavy Water",
            "cz": "Těžká voda"
        },
        "symbol": "D2O",
        "reqs": {
            "1": 2,
            "8": 1
        }
    },
    {
        "id": 56,
        "name": {
            "en": "Formaldehyde",
            "cz": "Formaldehyd"
        },
        "symbol": "CH2O",
        "reqs": {
            "6": 1,
            "1": 2,
            "8": 1
        }
    }
];

// Game Loop Setup
let lastTick = Date.now();

// Upgrades & Automation Logic
function getAutobuyerCost() {
    let a = 1, b = 1;
    for (let i = 0; i < game.totalMoleculeAutobuyersUnlocked; i++) {
        let temp = a + b;
        a = b;
        b = temp;
    }
    return a;
}

function unlockMoleculeAutobuyer(molId) {
    const cost = getAutobuyerCost();
    if (game.backgroundRadiation >= cost && !game.unlockedMoleculeAutobuyers[molId]) {
        game.backgroundRadiation -= cost;
        game.unlockedMoleculeAutobuyers[molId] = true;
        game.moleculeAutobuyersActive[molId] = true;
        game.totalMoleculeAutobuyersUnlocked++;
        updateUI();
    }
}

function toggleMoleculeAutobuyer(molId) {
    if (game.unlockedMoleculeAutobuyers[molId]) {
        game.moleculeAutobuyersActive[molId] = !game.moleculeAutobuyersActive[molId];
        updateUI();
    }
}

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

    // Apply speed multiplier based on accelerators & PTFE Polymer
    const ptfeBonus = 1 + ((game.polymers[4] || 0) * 0.1);
    const speedMultiplier = (1 + (game.accelerators * 0.5)) * ptfeBonus;
    const simulatedDt = rawDt * speedMultiplier;

    simulateProgress(simulatedDt);


    updateUI();
}


function simulateProgress(dt) {
    game.stats.timePlayedSeconds += dt;

    // Make base generation slightly slower initially (0.8 multiplier)
    const baseGenerationSpeed = 0.8;

    // Molecule Bonuses
    const h2Bonus = 1 + ((game.molecules[1] || 0) * 0.5); // H2 boosts Quarks
    const h2oBonus = 1 + ((game.molecules[2] || 0) * 0.25); // H2O boosts Processors
    const co2Bonus = 1 + ((game.molecules[3] || 0) * 0.25); // CO2 boosts Synthesizers
    const ch4Bonus = (game.molecules[4] || 0); // CH4 adds direct background radiation per second

    // Polymer Bonuses
    const peBonus = 1 + ((game.polymers[1] || 0) * 0.1);
    const psBonus = 1 + ((game.polymers[2] || 0) * 0.1);
    const pvcBonus = 1 + ((game.polymers[3] || 0) * 0.1);

    if (ch4Bonus > 0) {
        game.backgroundRadiation += (ch4Bonus * dt);
    }

    // Process Molecule Autobuyers
    // We try to craft molecules for which autobuyers are active
    for (let molId in game.unlockedMoleculeAutobuyers) {
        if (game.unlockedMoleculeAutobuyers[molId] && game.moleculeAutobuyersActive[molId]) {
            // Attempt to buy max possible with current resources.
            // A more balanced approach might limit crafts per second based on a new stat,
            // but for now we instantly craft as many as possible given the available atoms.
            craftMolecule(parseInt(molId), 'max');
        }
    }

    // 1. Generators produce Quarks
    if (game.generators > 0 && game.automationToggles.generators) {
        const radiationMultiplier = 1 + (game.backgroundRadiation * 0.05);
        const quarksPerSec = game.generators * radiationMultiplier * baseGenerationSpeed * h2Bonus * peBonus;
        const generated = quarksPerSec * dt;
        game.quarks += generated;
        game.stats.totalQuarksEver += generated;
    }

    // 1.5 Synthesizers automate Hydrogen creation
    if (game.synthesizers > 0 && game.automationToggles.synthesizers) {
        const hPerSec = game.synthesizers * co2Bonus * pvcBonus;
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
    if (game.processors > 0 && game.automationToggles.processors) {
        const mergesPerSec = game.processors * h2oBonus * psBonus;
        const possibleMergesThisTick = mergesPerSec * dt;

        for (let i = ELEMENTS.length - 1; i >= 1; i--) { // Max 118 elements, loop 117 down to 1
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
                    game.stats.totalWeightProduced += mergesToDo * hEquivalents[i+1];
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

// Precalculate Hydrogen equivalents for all elements based on merge requirements
const hEquivalents = [0, 1]; // id 0 is dummy, id 1 is H
for (let i = 2; i <= 118; i++) {
    const elDef = ELEMENTS.find(e => e.id === i);
    if (elDef) {
        hEquivalents[i] = hEquivalents[i - 1] * elDef.mergeReq;
    }
}

function doExperiment() {
    const el1 = parseInt(document.getElementById("exp-element-1").value);
    const q1 = parseInt(document.getElementById("exp-qty-1").value);

    const el2 = parseInt(document.getElementById("exp-element-2").value);
    const q2 = parseInt(document.getElementById("exp-qty-2").value);

    const el3 = parseInt(document.getElementById("exp-element-3").value);
    const q3 = parseInt(document.getElementById("exp-qty-3").value);

    const resultDiv = document.getElementById("experiment-result");

    // Build requirement signature
    const experimentReqs = {};
    if (el1 > 0 && q1 > 0) experimentReqs[el1] = (experimentReqs[el1] || 0) + q1;
    if (el2 > 0 && q2 > 0) experimentReqs[el2] = (experimentReqs[el2] || 0) + q2;
    if (el3 > 0 && q3 > 0) experimentReqs[el3] = (experimentReqs[el3] || 0) + q3;

    // Check if player has enough elements to perform experiment
    for (let eId in experimentReqs) {
        if (game.elements[eId] < experimentReqs[eId]) {
            resultDiv.style.color = "red";
            resultDiv.textContent = `Not enough ${ELEMENTS.find(e => e.id == eId).name[game.language]}!`;
            return;
        }
    }

    // Consume the elements
    for (let eId in experimentReqs) {
        game.elements[eId] -= experimentReqs[eId];
    }

    // Check against all molecules & monomers
    let discoveredMol = null;
    let discoveredMon = null;

    for (let i = 0; i < MOLECULES.length; i++) {
        const mol = MOLECULES[i];

        let match = true;
        // Check if all reqs in mol are exactly in experimentReqs
        for (let eId in mol.reqs) {
            if (experimentReqs[eId] !== mol.reqs[eId]) {
                match = false;
                break;
            }
        }

        // Check if experimentReqs doesn't have extra stuff
        if (match) {
            for (let eId in experimentReqs) {
                if (experimentReqs[eId] !== mol.reqs[eId]) {
                    match = false;
                    break;
                }
            }
        }

        if (match) {
            discoveredMol = mol;
            break;
        }
    }

    // Only check monomers if no molecule was discovered and prestige count > 0
    if (!discoveredMol && game.prestigeCount > 0) {
        for (let i = 0; i < MONOMERS.length; i++) {
            const mon = MONOMERS[i];

            let match = true;
            for (let eId in mon.reqs) {
                if (experimentReqs[eId] !== mon.reqs[eId]) {
                    match = false;
                    break;
                }
            }

            if (match) {
                for (let eId in experimentReqs) {
                    if (experimentReqs[eId] !== mon.reqs[eId]) {
                        match = false;
                        break;
                    }
                }
            }

            if (match) {
                discoveredMon = mon;
                break;
            }
        }
    }

    if (discoveredMol) {
        if (game.discoveredMolecules[discoveredMol.id]) {
            resultDiv.style.color = "orange";
            resultDiv.textContent = `You already discovered ${discoveredMol.name[game.language]} (${discoveredMol.symbol})!`;
        } else {
            game.discoveredMolecules[discoveredMol.id] = true;
            resultDiv.style.color = "#4ade80"; // green
            resultDiv.textContent = `Success! You discovered ${discoveredMol.name[game.language]} (${discoveredMol.symbol})!`;
        }
    } else if (discoveredMon) {
        if (game.discoveredMonomers[discoveredMon.id]) {
            resultDiv.style.color = "orange";
            resultDiv.textContent = `You already discovered the monomer ${discoveredMon.name} (${discoveredMon.symbol})!`;
        } else {
            game.discoveredMonomers[discoveredMon.id] = true;
            resultDiv.style.color = "#a855f7"; // prestige color
            resultDiv.textContent = `Success! You discovered the monomer ${discoveredMon.name} (${discoveredMon.symbol})!`;
        }
    } else {
        resultDiv.style.color = "red";
        resultDiv.textContent = `Experiment failed. Elements consumed in a minor explosion.`;
    }

    updateUI();
}

function getResearchCost() {
    // Fibonacci sequence based on researchesDone
    let a = 1, b = 1;
    for (let i = 0; i < game.researchesDone; i++) {
        let temp = a + b;
        a = b;
        b = temp;
    }
    return a;
}

function startResearch() {
    const cost = getResearchCost();
    if (game.backgroundRadiation >= cost) {
        // Find undiscovered molecules
        const undiscovered = MOLECULES.filter(m => !game.discoveredMolecules[m.id]);
        if (undiscovered.length === 0) {
            alert("You have already discovered all molecules!");
            return;
        }

        game.backgroundRadiation -= cost;
        game.researchesDone++;

        // Instant discovery
        const mol = undiscovered[Math.floor(Math.random() * undiscovered.length)];
        game.discoveredMolecules[mol.id] = true;

        const resultDiv = document.getElementById("experiment-result");
        if (resultDiv) {
            resultDiv.style.color = "#4ade80";
            resultDiv.textContent = `Research complete! You discovered ${mol.name[game.language]} (${mol.symbol})!`;
        }

        updateUI();
    }
}

function craftMonomer(monomerId) {
    const mon = MONOMERS.find(m => m.id === monomerId);
    if (!mon) return;

    let canCraft = true;
    for (let eId in mon.reqs) {
        if (game.elements[eId] < mon.reqs[eId]) {
            canCraft = false;
        }
    }

    if (canCraft) {
        for (let eId in mon.reqs) {
            game.elements[eId] -= mon.reqs[eId];
        }
        game.monomers[mon.id]++;
        updateUI();
    }
}

function getPolymerCost(polymerId) {
    const pol = POLYMERS.find(p => p.id === polymerId);
    if (!pol) return Infinity;
    const length = game.polymers[polymerId] || 0;
    return Math.floor(pol.baseCost * Math.pow(pol.costMult, length));
}

function growPolymer(polymerId) {
    const pol = POLYMERS.find(p => p.id === polymerId);
    if (!pol) return;

    const cost = getPolymerCost(polymerId);
    if (game.monomers[pol.monomerId] >= cost) {
        game.monomers[pol.monomerId] -= cost;
        game.polymers[polymerId]++;
        updateUI();
    }
}

function getPrestigeGain() {
    // Basic formula: sum of all elements weighted by their tier,
    // scaled down drastically.
    let score = 0;

    // We base the score on the amount of Hydrogen each atom took to make
    // e.g. He took 4 H. Li took 3 He (12 H total).
    // This prevents players from hoarding H just to boost their score.

    for (let i = 1; i <= 118; i++) {
        score += game.elements[i] * hEquivalents[i];
    }

    // Need at least a score of 1000 to get 1 Background Radiation
    // Since scores will be massive now, we can tweak this formula if needed,
    // but log scale or root scale handles large numbers okay. Let's use log10-based scaling for crazy high numbers.
    if (score < 1000) return 0;
    const gain = Math.floor(Math.pow(Math.log10(score) * 2, 2));
    return gain;
}

function doPrestige() {
    const gain = getPrestigeGain();
    if (gain <= 0) return;

    if (confirm(`Are you sure you want to trigger a Cosmic Reset? You will lose all Quarks, Elements, Generators, and Processors, but gain ${gain} Background Radiation!`)) {
        game.backgroundRadiation += gain;

        // Reset progress
        game.prestigeCount++;
        game.hasPrestiged = true;

        game.quarks = 0;
        game.generators = 0;
        game.processors = 0;
        game.synthesizers = 0;
        for (let i = 1; i <= 118; i++) {
            game.elements[i] = 0;
        }

        saveGame(true);
        updateUI();
    }
}

// Core Actions
function gatherQuarks() {
    const h2Bonus = 1 + ((game.molecules[1] || 0) * 0.5);
    const peBonus = 1 + ((game.polymers[1] || 0) * 0.1);
    const radiationMultiplier = 1 + (game.backgroundRadiation * 0.05); // 5% boost per radiation
    const generated = 1 * radiationMultiplier * h2Bonus * peBonus;
    game.quarks += generated;
    game.stats.totalQuarksEver += generated;
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
        // Approximation: elements weigh basically their hydrogen equivalent
        game.stats.totalWeightProduced += possibleMerges * hEquivalents[elementId];
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
        <div class="upgrade-row">
            <button id="btn-buy-generator" class="upgrade-btn">
                ${t.buyGenerator}
                <span class="cost">${t.cost}: <span id="generator-cost">10</span> ${t.quarks}</span>
                <span class="owned">${t.owned}: <span id="generator-owned">0</span></span>
            </button>
            <button class="toggle-btn" id="toggle-generators" data-target="generators">ON</button>
        </div>
        <div class="upgrade-row hidden" id="row-synthesizer">
            <button id="btn-buy-synthesizer" class="upgrade-btn">
                ${t.buySynthesizer}
                <span class="cost">${t.cost}: <span id="synthesizer-cost">100</span> ${t.quarks}</span>
                <span class="owned">${t.owned}: <span id="synthesizer-owned">0</span></span>
            </button>
            <button class="toggle-btn" id="toggle-synthesizers" data-target="synthesizers">ON</button>
        </div>
        <div class="upgrade-row hidden" id="row-processor">
            <button id="btn-buy-processor" class="upgrade-btn">
                ${t.buyProcessor}
                <span class="cost">${t.cost}: <span id="processor-cost">250</span> ${t.quarks}</span>
                <span class="owned">${t.owned}: <span id="processor-owned">0</span></span>
            </button>
            <button class="toggle-btn" id="toggle-processors" data-target="processors">ON</button>
        </div>
        <div class="upgrade-row hidden" id="row-accelerator">
            <button id="btn-buy-accelerator" class="upgrade-btn">
                ${t.buyAccelerator}
                <span class="cost">${t.cost}: <span id="accelerator-cost">1000</span> ${t.quarks}</span>
                <span class="owned">${t.owned}: <span id="accelerator-owned">0</span></span>
            </button>
        </div>
    `;

    document.querySelectorAll(".toggle-btn").forEach(btn => {
        btn.onclick = (e) => {
            const target = e.target.getAttribute("data-target");
            game.automationToggles[target] = !game.automationToggles[target];
            updateUI();
        };
    });

    document.getElementById("btn-buy-generator").onclick = buyGenerator;
    document.getElementById("btn-buy-synthesizer").onclick = buySynthesizer;
    document.getElementById("btn-buy-processor").onclick = buyProcessor;
    document.getElementById("btn-buy-accelerator").onclick = buyAccelerator;

    document.getElementById("btn-prestige").onclick = doPrestige;

    mergersContainer.innerHTML = "";

    const periodicGrid = document.getElementById("periodic-grid");
    periodicGrid.innerHTML = "";

    // Generate Elements with Real World Periodic Table Layout coordinates
    function getGridPos(elId) {
        // Standard table layout positions (column, row)
        // Grouping:
        // Period 1: H(1,1), He(18,1)
        if (elId === 1) return {c: 1, r: 1};
        if (elId === 2) return {c: 18, r: 1};
        // Period 2 & 3:
        // Li(1,2), Be(2,2) ... B(13,2) to Ne(18,2)
        // Na(1,3), Mg(2,3) ... Al(13,3) to Ar(18,3)
        if (elId >= 3 && elId <= 10) return {c: elId <= 4 ? elId - 2 : elId + 8, r: 2};
        if (elId >= 11 && elId <= 18) return {c: elId <= 12 ? elId - 10 : elId + 0, r: 3};
        // Period 4 & 5: K to Kr, Rb to Xe
        if (elId >= 19 && elId <= 36) return {c: elId - 18, r: 4};
        if (elId >= 37 && elId <= 54) return {c: elId - 36, r: 5};
        // Period 6: Cs to Rn
        if (elId >= 55 && elId <= 56) return {c: elId - 54, r: 6}; // Cs, Ba
        if (elId >= 57 && elId <= 71) return {c: elId - 53, r: 9}; // Lanthanides (offset down)
        if (elId >= 72 && elId <= 86) return {c: elId - 68, r: 6}; // Hf to Rn
        // Period 7: Fr to Og
        if (elId >= 87 && elId <= 88) return {c: elId - 86, r: 7}; // Fr, Ra
        if (elId >= 89 && elId <= 103) return {c: elId - 85, r: 10}; // Actinides (offset down)
        if (elId >= 104 && elId <= 118) return {c: elId - 100, r: 7}; // Rf to Og

        return {c: 1, r: 1};
    }

    let ptHTML = "";
    // Build HTML for periodic table
    for (let i = 0; i < ELEMENTS.length; i++) {
        const el = ELEMENTS[i];
        const pos = getGridPos(el.id);
        const style = `grid-column: ${pos.c}; grid-row: ${pos.r};`;

        let costText = "";
        if (el.id === 1) {
            costText = t.baseElement;
        } else {
            const prevEl = ELEMENTS[i-1];
            costText = `${t.cost}: ${el.mergeReq} ${prevEl.symbol}`;
        }

        ptHTML += `
            <div class="periodic-cell ${el.id !== 1 ? 'hidden' : ''}" id="pt-cell-${el.id}" style="${style}">
                <span class="periodic-number">${el.id}</span>
                <span class="periodic-symbol">${el.symbol}</span>
                <span class="periodic-amt" id="pt-amt-${el.id}">0</span>
                <div class="cell-tooltip">${el.name[game.language]}<br>${costText}</div>
            </div>
        `;

        if (el.id === 1) {
            const buyHBtn = document.createElement("button");
            buyHBtn.className = "action-btn";
            buyHBtn.id = "btn-buy-h";
            buyHBtn.innerHTML = `${t.createH} <span class="cost">(1 Quark)</span>`;
            buyHBtn.onclick = buyHydrogen;
            mergersContainer.appendChild(buyHBtn);
        } else {
            const prevEl = ELEMENTS[i-1];
            const mergeBtn = document.createElement("button");
            mergeBtn.className = "action-btn hidden";
            mergeBtn.id = `btn-merge-${el.id}`;
            mergeBtn.innerHTML = `${t.merge} ${prevEl.name[game.language]} ${t.into} ${el.name[game.language]} <span class="cost">(${el.mergeReq} ${prevEl.symbol})</span>`;
            mergeBtn.onclick = () => mergeElement(el.id);
            mergersContainer.appendChild(mergeBtn);
        }
    }

    periodicGrid.innerHTML = ptHTML;

    // Handle Buy Amount buttons
    document.querySelectorAll(".buy-amt-btn").forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll(".buy-amt-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const amtStr = btn.getAttribute("data-amt");
            if (amtStr === "max") {
                globalCraftAmount = "max";
            } else {
                globalCraftAmount = parseInt(amtStr);
            }
            updateUI();
        };
    });

    // Also populate the modal periodic grid with a cloned version but different IDs to avoid conflicts
    const modalPeriodicGrid = document.getElementById("modal-periodic-grid");
    if (modalPeriodicGrid) {
        modalPeriodicGrid.innerHTML = ptHTML.replace(/pt-cell-/g, 'modal-pt-cell-').replace(/pt-amt-/g, 'modal-pt-amt-');

        // Add click listeners to modal cells for experiment selection
        ELEMENTS.forEach(el => {
            const cell = document.getElementById(`modal-pt-cell-${el.id}`);
            if (cell) {
                cell.onclick = () => {
                    const modal = document.getElementById("pt-modal");
                    const slot = modal.getAttribute("data-selecting-for-slot");
                    if (slot) {
                        // Check if unlocked
                        if (!cell.classList.contains("hidden")) {
                            document.getElementById(`exp-element-${slot}`).value = el.id;
                            document.getElementById(`btn-select-exp-${slot}`).textContent = `${el.name[game.language]} (${el.symbol})`;
                            modal.classList.add("hidden");
                            modal.removeAttribute("data-selecting-for-slot");
                            modalPeriodicGrid.classList.remove("selection-mode");
                        }
                    }
                };
            }
        });
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
                        <strong>${mol.name[game.language]} (${mol.symbol})</strong>
                        <span>${t.owned}: <span id="mol-amt-${mol.id}">0</span></span>
                    </div>
                    <div class="mol-bonus">${bonusText} <span id="mol-bonus-${mol.id}">1</span></div>
                    <button id="btn-craft-${mol.id}" class="action-btn mol-craft-btn">
                        ${t.craft} ${mol.symbol} <span class="cost">(${reqHtml.trim()})</span>
                    </button>
                    <div class="mol-autobuyer-container" style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-size: 0.9rem; color: #94a3b8;">Autobuyer:</span>
                        <button id="btn-unlock-autobuyer-${mol.id}" class="action-btn prestige-btn" style="width: auto; padding: 5px 10px; margin: 0; font-size: 0.9rem;">
                            Unlock (Cost: <span id="autobuyer-cost-${mol.id}">1</span> Rad)
                        </button>
                        <button id="btn-toggle-autobuyer-${mol.id}" class="toggle-btn hidden" style="margin: 0;">OFF</button>
                    </div>
                    <div id="mol-hint-${mol.id}" class="mol-hint hidden">${t[mol.hintKey] || "Unknown Molecule"}</div>
                </div>
            `;
        });

        // Add listeners
        MOLECULES.forEach(mol => {
            const btn = document.getElementById(`btn-craft-${mol.id}`);
            if(btn) btn.onclick = () => craftMolecule(mol.id);

            const unlockBtn = document.getElementById(`btn-unlock-autobuyer-${mol.id}`);
            if(unlockBtn) unlockBtn.onclick = () => unlockMoleculeAutobuyer(mol.id);

            const toggleBtn = document.getElementById(`btn-toggle-autobuyer-${mol.id}`);
            if(toggleBtn) toggleBtn.onclick = () => toggleMoleculeAutobuyer(mol.id);
        });

        // Setup Experiment Element Selection
        document.querySelectorAll(".element-select-btn").forEach(btn => {
            btn.onclick = () => {
                const slot = btn.getAttribute("data-slot");
                document.getElementById("pt-modal").setAttribute("data-selecting-for-slot", slot);
                document.getElementById("pt-modal").classList.remove("hidden");

                // Add visual cue in modal that we are selecting
                const modalGrid = document.getElementById("modal-periodic-grid");
                if (modalGrid) {
                    modalGrid.classList.add("selection-mode");
                }
            };
        });

        // Setup Clear Buttons
        document.querySelectorAll(".element-clear-btn").forEach(btn => {
            btn.onclick = () => {
                const slot = btn.getAttribute("data-slot");
                document.getElementById(`exp-element-${slot}`).value = "0";
                document.getElementById(`btn-select-exp-${slot}`).textContent = slot === "1" ? "Select Element" : "None";
            };
        });

        const btnExperiment = document.getElementById("btn-experiment");
        if (btnExperiment) btnExperiment.onclick = doExperiment;

        const btnResearch = document.getElementById("btn-start-research");
        if (btnResearch) btnResearch.onclick = startResearch;
    }

    // Build Monomers & Polymers UI
    const monomersContainer = document.getElementById("monomers-container");
    const polymersContainer = document.getElementById("polymers-container");

    if (monomersContainer) {
        monomersContainer.innerHTML = "";
        MONOMERS.forEach(mon => {
            let reqHtml = "";
            for (let eId in mon.reqs) {
                const eDef = ELEMENTS.find(e => e.id == eId);
                reqHtml += `${mon.reqs[eId]} ${eDef.symbol} `;
            }
            monomersContainer.innerHTML += `
                <div class="molecule-box hidden" id="mon-box-${mon.id}">
                    <div class="mol-header">
                        <strong>${mon.name} (${mon.symbol})</strong>
                        <span>Owned: <span id="mon-amt-${mon.id}">0</span></span>
                    </div>
                    <button id="btn-craft-mon-${mon.id}" class="action-btn mol-craft-btn">
                        Synthesize <span class="cost">(${reqHtml.trim()})</span>
                    </button>
                </div>
            `;
        });

        MONOMERS.forEach(mon => {
            const btn = document.getElementById(`btn-craft-mon-${mon.id}`);
            if(btn) btn.onclick = () => craftMonomer(mon.id);
        });
    }

    if (polymersContainer) {
        polymersContainer.innerHTML = "";
        POLYMERS.forEach(pol => {
            const mon = MONOMERS.find(m => m.id === pol.monomerId);
            polymersContainer.innerHTML += `
                <div class="molecule-box hidden" id="pol-box-${pol.id}" style="border-color: var(--success-color);">
                    <div class="mol-header" style="color: var(--success-color);">
                        <strong>${pol.name} (${pol.symbol})</strong>
                        <span>Length: <span id="pol-amt-${pol.id}">0</span></span>
                    </div>
                    <div class="mol-bonus">${pol.description} Bonus: x<span id="pol-bonus-${pol.id}">1.00</span></div>
                    <button id="btn-grow-pol-${pol.id}" class="action-btn" style="border-color: var(--success-color); color: var(--success-color);">
                        Grow Chain <span class="cost">(Cost: <span id="pol-cost-${pol.id}">0</span> ${mon.symbol})</span>
                    </button>
                </div>
            `;
        });

        POLYMERS.forEach(pol => {
            const btn = document.getElementById(`btn-grow-pol-${pol.id}`);
            if(btn) btn.onclick = () => growPolymer(pol.id);
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
    for (let i = 1; i <= 118; i++) {
        if (game.elements[i] > 0) highestElementSeen = i;
    }

    // Update Progress Statistic
    const unlockedElementsCount = highestElementSeen;
    const progressPct = Math.floor((unlockedElementsCount / 118) * 100);
    document.getElementById("discovery-progress-fill").style.width = `${progressPct}%`;
    document.getElementById("discovery-progress-text").textContent = `${unlockedElementsCount}/118`;
    document.getElementById("discovery-progress-pct").textContent = progressPct;

    // Update Molecules UI
    const tabBtnMolecules = document.getElementById("tab-btn-molecules");

    // Molecules are now available initially.
    // Polymers tab becomes visible after prestige.
    const tabBtnPolymers = document.getElementById("tab-btn-polymers");
    if (game.hasPrestiged || (game.prestigeCount && game.prestigeCount > 0)) {
        if(tabBtnPolymers) tabBtnPolymers.classList.remove("hidden");
    } else {
        if(tabBtnPolymers) tabBtnPolymers.classList.add("hidden");
    }

        // Update Research UI
        const btnResearch = document.getElementById("btn-start-research");
        const researchCostSpan = document.getElementById("research-cost");
        const researchCost = getResearchCost();

        if (researchCostSpan) researchCostSpan.textContent = formatNumber(researchCost);

        if (btnResearch) {
            const undiscovered = MOLECULES.filter(m => !game.discoveredMolecules[m.id]);
            if (undiscovered.length === 0) {
                btnResearch.disabled = true;
                btnResearch.innerHTML = `All Discovered!`;
            } else {
                btnResearch.disabled = game.backgroundRadiation < researchCost;
            }
        }

        MOLECULES.forEach(mol => {
            const box = document.getElementById(`mol-box-${mol.id}`);
            const hint = document.getElementById(`mol-hint-${mol.id}`);
            const btn = document.getElementById(`btn-craft-${mol.id}`);
            const amtSpan = document.getElementById(`mol-amt-${mol.id}`);
            const bonusSpan = document.getElementById(`mol-bonus-${mol.id}`);

            const isDiscovered = game.discoveredMolecules[mol.id];

            if(box) {
                if (isDiscovered) {
                    box.classList.remove("hidden");
                } else {
                    box.classList.add("hidden");
                }
            }

            if(amtSpan) amtSpan.textContent = formatNumber(game.molecules[mol.id] || 0);

            let maxPossible = Infinity;
            for (let eId in mol.reqs) {
                const available = game.elements[eId] || 0;
                const possible = Math.floor(available / mol.reqs[eId]);
                if (possible < maxPossible) maxPossible = possible;
            }

            let amountToCraft = 1;
            if (globalCraftAmount === 'max') {
                amountToCraft = maxPossible;
            } else {
                amountToCraft = Math.min(globalCraftAmount, maxPossible);
            }

            let canCraft = amountToCraft > 0 && maxPossible > 0;
            // But if global is not max, and we don't even have enough for the global amount,
            // we should probably disable it if they want EXACTLY that amount,
            // OR we let them craft whatever max is up to that amount (which is what amountToCraft does).
            // Let's strictly require them to have enough for the selected amount, EXCEPT for max.
            if (globalCraftAmount !== 'max' && maxPossible < globalCraftAmount) {
                 canCraft = false;
            }

            if(btn) {
                btn.classList.remove("hidden");
                btn.disabled = !canCraft;

                // Update button text to reflect cost based on selected amount
                let displayAmount = canCraft ? (globalCraftAmount === 'max' ? maxPossible : globalCraftAmount) : (globalCraftAmount === 'max' ? 1 : globalCraftAmount);

                let reqHtml = "";
                for (let eId in mol.reqs) {
                    const eDef = ELEMENTS.find(e => e.id == eId);
                    reqHtml += `${mol.reqs[eId] * displayAmount} ${eDef.symbol} `;
                }
                const t = TRANSLATIONS[game.language] || TRANSLATIONS["en"];
                btn.innerHTML = `${t.craft} ${displayAmount}x ${mol.symbol} <span class="cost">(${reqHtml.trim()})</span>`;
            }
            if(hint) hint.classList.add("hidden");

            // Update Autobuyer buttons
            const unlockBtn = document.getElementById(`btn-unlock-autobuyer-${mol.id}`);
            const toggleBtn = document.getElementById(`btn-toggle-autobuyer-${mol.id}`);
            const costSpan = document.getElementById(`autobuyer-cost-${mol.id}`);

            if (unlockBtn && toggleBtn) {
                if (game.unlockedMoleculeAutobuyers[mol.id]) {
                    unlockBtn.classList.add("hidden");
                    toggleBtn.classList.remove("hidden");

                    if (game.moleculeAutobuyersActive[mol.id]) {
                        toggleBtn.textContent = "ON";
                        toggleBtn.classList.add("active-toggle");
                        toggleBtn.classList.remove("inactive-toggle");
                    } else {
                        toggleBtn.textContent = "OFF";
                        toggleBtn.classList.add("inactive-toggle");
                        toggleBtn.classList.remove("active-toggle");
                    }
                } else {
                    unlockBtn.classList.remove("hidden");
                    toggleBtn.classList.add("hidden");
                    const cost = getAutobuyerCost();
                    if (costSpan) costSpan.textContent = formatNumber(cost);
                    unlockBtn.disabled = game.backgroundRadiation < cost;
                }
            }

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

    // Update Monomers UI
    MONOMERS.forEach(mon => {
        const amtSpan = document.getElementById(`mon-amt-${mon.id}`);
        const btn = document.getElementById(`btn-craft-mon-${mon.id}`);
        const box = document.getElementById(`mon-box-${mon.id}`);

        if (box) {
            if (game.discoveredMonomers[mon.id]) {
                box.classList.remove("hidden");
            } else {
                box.classList.add("hidden");
            }
        }

        if (amtSpan) amtSpan.textContent = formatNumber(game.monomers[mon.id] || 0);

        let canCraft = true;
        for (let eId in mon.reqs) {
            if (game.elements[eId] < mon.reqs[eId]) canCraft = false;
        }

        if (btn) btn.disabled = !canCraft;
    });

    // Update Polymers UI
    POLYMERS.forEach(pol => {
        const amtSpan = document.getElementById(`pol-amt-${pol.id}`);
        const costSpan = document.getElementById(`pol-cost-${pol.id}`);
        const btn = document.getElementById(`btn-grow-pol-${pol.id}`);
        const bonusSpan = document.getElementById(`pol-bonus-${pol.id}`);
        const box = document.getElementById(`pol-box-${pol.id}`);

        if (box) {
            if (game.discoveredMonomers[pol.monomerId]) {
                box.classList.remove("hidden");
            } else {
                box.classList.add("hidden");
            }
        }

        const length = game.polymers[pol.id] || 0;
        const cost = getPolymerCost(pol.id);

        if (amtSpan) amtSpan.textContent = formatNumber(length);
        if (costSpan) costSpan.textContent = formatNumber(cost);
        if (bonusSpan) bonusSpan.textContent = (1 + (length * 0.1)).toFixed(2);

        if (btn) btn.disabled = game.monomers[pol.monomerId] < cost;
    });

    // Reveal elements progressively (show one tier ahead of what you have)
    const displayThreshold = Math.min(118, highestElementSeen + 1);

    for (let i = 2; i <= 118; i++) {
        const ptAmtSpan = document.getElementById(`pt-amt-${i}`);
        const modalPtAmtSpan = document.getElementById(`modal-pt-amt-${i}`);

        if (ptAmtSpan) ptAmtSpan.textContent = formatNumber(game.elements[i]);
        if (modalPtAmtSpan) modalPtAmtSpan.textContent = formatNumber(game.elements[i]);

        const ptCell = document.getElementById(`pt-cell-${i}`);
        const modalPtCell = document.getElementById(`modal-pt-cell-${i}`);
        const btn = document.getElementById(`btn-merge-${i}`);

        if (i <= displayThreshold) {
            if (ptCell) ptCell.classList.remove("hidden");
            if (modalPtCell) modalPtCell.classList.remove("hidden");
            if (btn) btn.classList.remove("hidden");

            // Disable button if not enough resources
            if (btn) {
                const prevId = i - 1;
                const req = ELEMENTS[i-1].mergeReq;
                btn.disabled = game.elements[prevId] < req;
            }
        } else {
            if (ptCell) ptCell.classList.add("hidden");
            if (modalPtCell) modalPtCell.classList.add("hidden");
            if (btn) btn.classList.add("hidden");
        }
    }

    // Also update Hydrogen for modal
    const modalPtAmtSpan1 = document.getElementById(`modal-pt-amt-1`);
    if (modalPtAmtSpan1) modalPtAmtSpan1.textContent = formatNumber(game.elements[1]);

    // Update Hydrogen Buy Button
    const btnBuyH = document.getElementById("btn-buy-h");
    if (btnBuyH) btnBuyH.disabled = game.quarks < 1;

    // Update Upgrades UI
    document.getElementById("generator-owned").textContent = game.generators;
    document.getElementById("generator-cost").textContent = formatNumber(getGeneratorCost());
    document.getElementById("btn-buy-generator").disabled = game.quarks < getGeneratorCost();

    const peBonus = 1 + ((game.polymers[1] || 0) * 0.1);
    const h2Bonus = 1 + ((game.molecules[1] || 0) * 0.5);
    const radiationMultiplier = 1 + (game.backgroundRadiation * 0.05);
    const baseGenerationSpeed = 0.8;
    const quarksPerSec = game.generators * radiationMultiplier * baseGenerationSpeed * h2Bonus * peBonus;
    document.getElementById("quarks-rate").textContent = `${formatNumber(quarksPerSec)} / sec`;

    const synthesizerCost = getSynthesizerCost();
    const btnSynthesizer = document.getElementById("btn-buy-synthesizer");

    // Update Toggles UI
    document.querySelectorAll(".toggle-btn").forEach(btn => {
        const target = btn.getAttribute("data-target");
        if (game.automationToggles[target]) {
            btn.textContent = "ON";
            btn.classList.add("active-toggle");
            btn.classList.remove("inactive-toggle");
        } else {
            btn.textContent = "OFF";
            btn.classList.add("inactive-toggle");
            btn.classList.remove("active-toggle");
        }
    });

    // Reveal synthesizer once they have at least 1 generator
    if (game.generators > 0) {
        document.getElementById("row-synthesizer").classList.remove("hidden");
        document.getElementById("synthesizer-owned").textContent = game.synthesizers;
        document.getElementById("synthesizer-cost").textContent = formatNumber(synthesizerCost);
        btnSynthesizer.disabled = game.quarks < synthesizerCost;
    }

    const processorCost = getProcessorCost();
    const btnProcessor = document.getElementById("btn-buy-processor");

    // Reveal processor once they have at least 1 synthesizer
    if (game.synthesizers > 0) {
        document.getElementById("row-processor").classList.remove("hidden");
        document.getElementById("processor-owned").textContent = game.processors;
        document.getElementById("processor-cost").textContent = formatNumber(processorCost);
        btnProcessor.disabled = game.quarks < processorCost;
    }

    const acceleratorCost = getAcceleratorCost();
    const btnAccelerator = document.getElementById("btn-buy-accelerator");

    // Reveal accelerator once they have at least 1 processor
    if (game.processors > 0) {
        document.getElementById("row-accelerator").classList.remove("hidden");
        document.getElementById("accelerator-owned").textContent = game.accelerators;
        document.getElementById("accelerator-cost").textContent = formatNumber(acceleratorCost);
        btnAccelerator.disabled = game.quarks < acceleratorCost;
    }

    // Update Prestige UI
    const prestigeGain = getPrestigeGain();
    const prestigeSection = document.getElementById("prestige-section");
    const radDisplay = document.getElementById("radiation-display");

    // Reveal prestige ONLY if they have crafted at least 1 of Element 118 or already have radiation (prestiged before)
    if (game.elements[118] > 0 || game.backgroundRadiation > 0) {
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

    // Update Statistics UI
    // Format Time Played
    let timeStr = "0s";
    if (game.stats.timePlayedSeconds > 0) {
        const secs = Math.floor(game.stats.timePlayedSeconds);
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        timeStr = "";
        if (h > 0) timeStr += `${h}h `;
        if (m > 0 || h > 0) timeStr += `${m}m `;
        timeStr += `${s}s`;
    }

    document.getElementById("stat-time-played").textContent = timeStr;
    document.getElementById("stat-total-quarks").textContent = formatNumber(game.stats.totalQuarksEver);
    document.getElementById("stat-total-weight").textContent = formatNumber(game.stats.totalWeightProduced);
    document.getElementById("stat-prestige-count").textContent = formatNumber(game.prestigeCount);

    document.getElementById("stat-elements-discovered").textContent = `${unlockedElementsCount}/118`;

    let molDisc = 0;
    for (let id in game.discoveredMolecules) {
        if (game.discoveredMolecules[id]) molDisc++;
    }
    document.getElementById("stat-molecules-discovered").textContent = `${molDisc}/${MOLECULES.length}`;
}

// Zoom Logic for Periodic Table
let currentZoom = 1;
const zoomStep = 0.1;
const minZoom = 0.5;
const maxZoom = 2.0;

let panX = 0;
let panY = 0;
let isPanning = false;
let startX, startY;

const gridEl = document.getElementById("periodic-grid");
const zoomWrapper = document.getElementById("periodic-zoom-wrapper");

function applyTransform() {
    if (gridEl) {
        gridEl.style.transform = `translate(${panX}px, ${panY}px) scale(${currentZoom})`;
    }
}

// Modal zoom Logic
let modalZoom = 1;
let modalPanX = 0;
let modalPanY = 0;
let isModalPanning = false;
const modalGridEl = document.getElementById("modal-periodic-grid");
const modalZoomWrapper = document.getElementById("modal-periodic-zoom-wrapper");

function applyModalTransform() {
    if (modalGridEl) {
        modalGridEl.style.transform = `translate(${modalPanX}px, ${modalPanY}px) scale(${modalZoom})`;
    }
}

document.getElementById("btn-zoom-in").addEventListener("click", () => {
    if (currentZoom < maxZoom) {
        currentZoom += zoomStep;
        applyTransform();
    }
});

document.getElementById("btn-zoom-out").addEventListener("click", () => {
    if (currentZoom > minZoom) {
        currentZoom -= zoomStep;
        applyTransform();
    }
});

if (zoomWrapper) {
    zoomWrapper.addEventListener("wheel", (e) => {
        e.preventDefault(); // Prevent page scroll
        if (e.deltaY < 0) {
            if (currentZoom < maxZoom) currentZoom += zoomStep;
        } else {
            if (currentZoom > minZoom) currentZoom -= zoomStep;
        }
        applyTransform();
    });

    zoomWrapper.addEventListener("mousedown", (e) => {
        isPanning = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        zoomWrapper.style.cursor = "grabbing";
    });

    window.addEventListener("mousemove", (e) => {
        if (!isPanning) return;
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        applyTransform();
    });

    window.addEventListener("mouseup", () => {
        isPanning = false;
        zoomWrapper.style.cursor = "default";
    });

    // Basic Touch support for panning
    zoomWrapper.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) {
            isPanning = true;
            startX = e.touches[0].clientX - panX;
            startY = e.touches[0].clientY - panY;
        }
    });

    window.addEventListener("touchmove", (e) => {
        if (!isPanning) return;
        if (e.touches.length === 1) {
            // e.preventDefault(); // careful with this as it breaks scrolling if not handled right, but wrapper is fixed size
            panX = e.touches[0].clientX - startX;
            panY = e.touches[0].clientY - startY;
            applyTransform();
        }
    }, {passive: false});

    window.addEventListener("touchend", () => {
        isPanning = false;
    });
}

// Modal zoom/pan events
if (modalZoomWrapper) {
    modalZoomWrapper.addEventListener("wheel", (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            if (modalZoom < maxZoom) modalZoom += zoomStep;
        } else {
            if (modalZoom > minZoom) modalZoom -= zoomStep;
        }
        applyModalTransform();
    });

    modalZoomWrapper.addEventListener("mousedown", (e) => {
        isModalPanning = true;
        startX = e.clientX - modalPanX;
        startY = e.clientY - modalPanY;
        modalZoomWrapper.style.cursor = "grabbing";
    });

    window.addEventListener("mousemove", (e) => {
        if (!isModalPanning) return;
        modalPanX = e.clientX - startX;
        modalPanY = e.clientY - startY;
        applyModalTransform();
    });

    window.addEventListener("mouseup", () => {
        isModalPanning = false;
        if(modalZoomWrapper) modalZoomWrapper.style.cursor = "default";
    });
}

// Fullscreen PT Modal Logic
document.getElementById("btn-fullscreen-pt").addEventListener("click", () => {
    document.getElementById("pt-modal").classList.remove("hidden");
    // reset view
    modalZoom = 1;
    modalPanX = 0;
    modalPanY = 0;
    applyModalTransform();
});
document.getElementById("btn-close-pt").addEventListener("click", () => {
    const modal = document.getElementById("pt-modal");
    modal.classList.add("hidden");

    // Clear selection mode if it was active
    modal.removeAttribute("data-selecting-for-slot");
    const modalGrid = document.getElementById("modal-periodic-grid");
    if (modalGrid) {
        modalGrid.classList.remove("selection-mode");
    }
});


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
