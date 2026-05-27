const TRANSLATIONS = {
    en: { spiderTitle: "Spider Solitaire", newGame: "New Game", backToHub: "Back to Hub", "1suit": "1 Suit", "2suit": "2 Suits", "4suit": "4 Suits" },
    cz: { spiderTitle: "Spider Solitaire", newGame: "Nová Hra", backToHub: "Zpět do Hubu", "1suit": "1 Barva", "2suit": "2 Barvy", "4suit": "4 Barvy" }
};
let lang = localStorage.getItem("hub_lang") || "en";
document.getElementById('lang-select').value = lang;
function updateTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
            if (el.tagName === "OPTION") el.textContent = TRANSLATIONS[lang][key];
            else el.textContent = TRANSLATIONS[lang][key];
        }
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
    completed: 0,
    tableaus: [[], [], [], [], [], [], [], [], [], []]
};

function createDeck(numSuits) {
    deck = [];
    let suitsToUse = [];
    if (numSuits == 1) suitsToUse = ['♠', '♠', '♠', '♠']; // 8 decks total
    else if (numSuits == 2) suitsToUse = ['♠', '♥', '♠', '♥'];
    else suitsToUse = ['♠', '♥', '♣', '♦'];

    // Spider uses 2 decks of 52 cards = 104 cards
    for (let d=0; d<2; d++) {
        for (let s of suitsToUse) {
            for (let i=0; i<VALUES.length; i++) {
                deck.push({ suit: s, value: VALUES[i], numValue: i+1, color: COLORS[s], faceUp: false, id: Math.random().toString(36).substr(2, 9) });
            }
        }
    }
    deck.sort(() => Math.random() - 0.5);
}

function initGame() {
    const diff = parseInt(document.getElementById('difficulty').value);
    createDeck(diff);

    state.stock = [];
    state.completed = 0;
    state.tableaus = [[], [], [], [], [], [], [], [], [], []];

    let deckIdx = 0;
    for (let i=0; i<10; i++) {
        let cols = i < 4 ? 6 : 5;
        for (let j=0; j<cols; j++) {
            let card = deck[deckIdx++];
            if (j === cols - 1) card.faceUp = true;
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
    document.getElementById('completed-sets').innerHTML = '';

    // Render Stock
    const stockPile = document.getElementById('stock');
    stockPile.innerHTML = ''; // clear visual representations
    if (state.stock.length > 0) {
        let chunks = state.stock.length / 10;
        for (let i=0; i<chunks; i++) {
            let cardEl = document.createElement('div');
            cardEl.className = 'card back';
            cardEl.style.left = `${i * 10}px`; cardEl.style.top = `0px`;
            stockPile.appendChild(cardEl);
        }
    }
    stockPile.onclick = handleStockClick;

    // Render Completed
    for(let i=0; i<state.completed; i++) {
        let cEl = document.createElement('div');
        cEl.className = 'completed-set';
        cEl.textContent = 'K';
        document.getElementById('completed-sets').appendChild(cEl);
    }

    // Render Tableaus
    for (let i=0; i<10; i++) {
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
    checkCompletions();
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
    if (state.stock.length < 10) return;

    // Must have no empty columns to deal
    let hasEmpty = state.tableaus.some(col => col.length === 0);
    if (hasEmpty) {
        alert("Cannot deal when there are empty columns.");
        return;
    }

    for (let i=0; i<10; i++) {
        let card = state.stock.pop();
        card.faceUp = true;
        state.tableaus[i].push(card);
    }
    renderAll();
}

// Drag and Drop Logic
let draggedCards = [];
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

function isDraggableSequence(pile, startIdx) {
    for (let i=startIdx; i<pile.length-1; i++) {
        if (!pile[i].faceUp || !pile[i+1].faceUp) return false;
        if (pile[i].suit !== pile[i+1].suit) return false;
        if (pile[i].numValue !== pile[i+1].numValue + 1) return false;
    }
    return true;
}

function dragStart(e) {
    const el = e.target;

    const parent = el.parentElement;
    if (parent.id.startsWith('t')) {
        sourcePileIdx = parseInt(parent.id.substring(1));
        const cardIdx = parseInt(el.dataset.cardIdx);

        // Check if sequence is valid to drag
        if (isDraggableSequence(state.tableaus[sourcePileIdx], cardIdx)) {
            el.classList.add('dragging');
            draggedCards = state.tableaus[sourcePileIdx].slice(cardIdx);
            e.dataTransfer.setData('text/plain', el.dataset.id);
        } else {
            e.preventDefault();
        }
    } else {
        e.preventDefault();
    }
}

function dragEnd(e) {
    e.target.classList.remove('dragging');
    draggedCards = [];
}

function dragOver(e) {
    e.preventDefault();
}

function drop(e) {
    e.preventDefault();
    if(draggedCards.length === 0) return;

    let targetPile = e.target.closest('.pile');
    if(!targetPile || !targetPile.id.startsWith('t')) return;

    let targetIdx = parseInt(targetPile.id.substring(1));

    if (isValidMove(draggedCards, targetIdx)) {
        state.tableaus[sourcePileIdx].splice(-draggedCards.length);
        state.tableaus[targetIdx].push(...draggedCards);

        // Auto-reveal
        if (state.tableaus[sourcePileIdx].length > 0) {
            state.tableaus[sourcePileIdx][state.tableaus[sourcePileIdx].length-1].faceUp = true;
        }

        renderAll();
    }
}

function isValidMove(cards, targetIdx) {
    let pile = state.tableaus[targetIdx];
    if (pile.length === 0) return true;
    let topPileCard = pile[pile.length-1];
    return cards[0].numValue === topPileCard.numValue - 1;
}

function checkCompletions() {
    let changed = false;
    for (let i=0; i<10; i++) {
        let pile = state.tableaus[i];
        if (pile.length >= 13) {
            // check last 13 cards
            let startIdx = pile.length - 13;
            let valid = true;
            for(let j=startIdx; j<pile.length-1; j++) {
                if (!pile[j].faceUp || pile[j].suit !== pile[j+1].suit || pile[j].numValue !== pile[j+1].numValue + 1) {
                    valid = false;
                    break;
                }
            }
            if (valid && pile[startIdx].numValue === 13 && pile[pile.length-1].numValue === 1) { // K to A
                pile.splice(startIdx, 13);
                state.completed++;
                if (pile.length > 0) pile[pile.length-1].faceUp = true;
                changed = true;
            }
        }
    }
    if (changed) renderAll();

    if (state.completed === 8) {
        setTimeout(() => alert("You won!"), 100);
    }
}

initGame();
