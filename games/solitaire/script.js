const TRANSLATIONS = {
    en: { solTitle: "Solitaire", newGame: "New Game", backToHub: "Back to Hub" },
    cz: { solTitle: "Solitaire", newGame: "Nová Hra", backToHub: "Zpět do Hubu" }
};
let lang = localStorage.getItem("hub_lang") || "en";
document.getElementById('lang-select').value = lang;
function updateTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) el.textContent = TRANSLATIONS[lang][key];
    });
}
document.getElementById('lang-select').addEventListener('change', (e) => {
    lang = e.target.value;
    localStorage.setItem("hub_lang", lang);
    updateTranslations();
});
updateTranslations();

const SUITS = ['♠', '♥', '♣', '♦'];
const VALUES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const COLORS = {'♠':'black', '♥':'red', '♣':'black', '♦':'red'};

let deck = [];
let state = {
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableaus: [[], [], [], [], [], [], []]
};

function createDeck() {
    deck = [];
    for (let s of SUITS) {
        for (let i=0; i<VALUES.length; i++) {
            deck.push({ suit: s, value: VALUES[i], numValue: i+1, color: COLORS[s], faceUp: false, id: s+VALUES[i] });
        }
    }
    deck.sort(() => Math.random() - 0.5);
}

function initGame() {
    createDeck();
    state.stock = []; state.waste = [];
    state.foundations = [[], [], [], []];
    state.tableaus = [[], [], [], [], [], [], []];

    let deckIdx = 0;
    for (let i=0; i<7; i++) {
        for (let j=0; j<=i; j++) {
            let card = deck[deckIdx++];
            if (j === i) card.faceUp = true;
            state.tableaus[i].push(card);
        }
    }
    while(deckIdx < deck.length) {
        state.stock.push(deck[deckIdx++]);
    }
    renderAll();
}

document.getElementById('btn-new-game').addEventListener('click', initGame);

function renderAll() {
    document.querySelectorAll('.card').forEach(el => el.remove());

    // Render Stock
    const stockPile = document.getElementById('stock');
    if (state.stock.length > 0) {
        let cardEl = createCardEl(state.stock[state.stock.length-1]);
        cardEl.style.left = '0px'; cardEl.style.top = '0px';
        stockPile.appendChild(cardEl);
    }
    stockPile.onclick = handleStockClick;

    // Render Waste
    const wastePile = document.getElementById('waste');
    if (state.waste.length > 0) {
        let cardEl = createCardEl(state.waste[state.waste.length-1]);
        cardEl.style.left = '0px'; cardEl.style.top = '0px';
        wastePile.appendChild(cardEl);
    }

    // Render Foundations
    for (let i=0; i<4; i++) {
        const fPile = document.getElementById(`f${i}`);
        fPile.dataset.pileType = 'foundation';
        fPile.dataset.pileIdx = i;
        if (state.foundations[i].length > 0) {
            let cardEl = createCardEl(state.foundations[i][state.foundations[i].length-1]);
            cardEl.style.left = '0px'; cardEl.style.top = '0px';
            fPile.appendChild(cardEl);
        }
    }

    // Render Tableaus
    for (let i=0; i<7; i++) {
        const tPile = document.getElementById(`t${i}`);
        tPile.dataset.pileType = 'tableau';
        tPile.dataset.pileIdx = i;
        for (let j=0; j<state.tableaus[i].length; j++) {
            let card = state.tableaus[i][j];
            let cardEl = createCardEl(card);
            cardEl.style.left = '0px';
            cardEl.style.top = `${j * 20}px`;
            cardEl.style.zIndex = j;
            cardEl.dataset.pileType = 'tableau';
            cardEl.dataset.pileIdx = i;
            cardEl.dataset.cardIdx = j;
            tPile.appendChild(cardEl);
        }
    }
    setupDragAndDrop();
}

function createCardEl(card) {
    const el = document.createElement('div');
    el.className = `card ${card.faceUp ? card.color : 'back'}`;
    el.innerHTML = card.faceUp ? `${card.value}<br>${card.suit}` : '';
    el.dataset.id = card.id;
    if (card.faceUp) {
        el.draggable = true;
    }
    return el;
}

function handleStockClick() {
    if (state.stock.length > 0) {
        let card = state.stock.pop();
        card.faceUp = true;
        state.waste.push(card);
    } else {
        while(state.waste.length > 0) {
            let card = state.waste.pop();
            card.faceUp = false;
            state.stock.push(card);
        }
    }
    renderAll();
}

// Drag and Drop Logic
let draggedCards = [];
let sourcePileType = null;
let sourcePileIdx = null;

function setupDragAndDrop() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        if(card.draggable) {
            card.addEventListener('dragstart', dragStart);
            card.addEventListener('dragend', dragEnd);
        }
    });

    const dropZones = document.querySelectorAll('.pile');
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', dragOver);
        zone.addEventListener('drop', drop);
    });
}

function dragStart(e) {
    const el = e.target;
    el.classList.add('dragging');

    // Find source
    const parent = el.parentElement;
    if (parent.id === 'waste') {
        sourcePileType = 'waste';
        draggedCards = [state.waste[state.waste.length-1]];
    } else if (parent.id.startsWith('f')) {
        sourcePileType = 'foundation';
        sourcePileIdx = parseInt(parent.id[1]);
        draggedCards = [state.foundations[sourcePileIdx][state.foundations[sourcePileIdx].length-1]];
    } else if (parent.id.startsWith('t')) {
        sourcePileType = 'tableau';
        sourcePileIdx = parseInt(parent.id[1]);
        const cardIdx = parseInt(el.dataset.cardIdx);
        draggedCards = state.tableaus[sourcePileIdx].slice(cardIdx);
    }

    // For visual drag image we would need custom ghosting, standard HTML5 drag is limited with multiple elements.
    // For simplicity, we just store data.
    e.dataTransfer.setData('text/plain', el.dataset.id);
}

function dragEnd(e) {
    e.target.classList.remove('dragging');
    draggedCards = [];
}

function dragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
}

function drop(e) {
    e.preventDefault();
    if(draggedCards.length === 0) return;

    let targetPile = e.target.closest('.pile');
    if(!targetPile) return;

    let targetType, targetIdx;
    if (targetPile.id.startsWith('f')) {
        targetType = 'foundation';
        targetIdx = parseInt(targetPile.id[1]);
    } else if (targetPile.id.startsWith('t')) {
        targetType = 'tableau';
        targetIdx = parseInt(targetPile.id[1]);
    } else {
        return; // Can't drop on waste or stock
    }

    if (isValidMove(draggedCards, targetType, targetIdx)) {
        // Move cards in state
        if (sourcePileType === 'waste') state.waste.pop();
        else if (sourcePileType === 'foundation') state.foundations[sourcePileIdx].pop();
        else if (sourcePileType === 'tableau') state.tableaus[sourcePileIdx].splice(-draggedCards.length);

        if (targetType === 'foundation') {
            state.foundations[targetIdx].push(draggedCards[0]);
        } else if (targetType === 'tableau') {
            state.tableaus[targetIdx].push(...draggedCards);
        }

        // Auto-reveal tableau card
        if (sourcePileType === 'tableau' && state.tableaus[sourcePileIdx].length > 0) {
            state.tableaus[sourcePileIdx][state.tableaus[sourcePileIdx].length-1].faceUp = true;
        }

        renderAll();
    }
}

function isValidMove(cards, targetType, targetIdx) {
    let topMovingCard = cards[0];

    if (targetType === 'foundation') {
        if (cards.length > 1) return false;
        let pile = state.foundations[targetIdx];
        if (pile.length === 0) return topMovingCard.numValue === 1; // Ace
        let topPileCard = pile[pile.length-1];
        return topMovingCard.suit === topPileCard.suit && topMovingCard.numValue === topPileCard.numValue + 1;
    }

    if (targetType === 'tableau') {
        let pile = state.tableaus[targetIdx];
        if (pile.length === 0) return topMovingCard.numValue === 13; // King
        let topPileCard = pile[pile.length-1];
        return topMovingCard.color !== topPileCard.color && topMovingCard.numValue === topPileCard.numValue - 1;
    }
    return false;
}

initGame();
