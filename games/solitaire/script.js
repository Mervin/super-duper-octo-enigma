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
    // Clear fireworks and animation if restarting after win
    if (fireworkIntervalId) {
        clearInterval(fireworkIntervalId);
        fireworkIntervalId = null;
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (fwAnimationFrameId) {
        cancelAnimationFrame(fwAnimationFrameId);
        fwAnimationFrameId = null;
    }

    const canvas = document.getElementById('fireworks-canvas');
    if (canvas) canvas.style.display = 'none';

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
        for (let j=0; j<state.foundations[i].length; j++) {
            let cardEl = createCardEl(state.foundations[i][j]);
            cardEl.style.left = '0px'; cardEl.style.top = '0px';
            cardEl.style.zIndex = j;
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
    setupClickToMove();
}

function createCardEl(card) {
    const el = document.createElement('div');
    el.className = `card ${card.faceUp ? card.color : 'back'}`;

    if (card.faceUp) {
        let centerContent = '';
        if (card.value === 'A') {
            centerContent = `<div class="card-center ace">${card.suit}</div>`;
        } else if (card.value === 'J') {
            centerContent = `<div class="card-center face">💂</div>`;
        } else if (card.value === 'Q') {
            centerContent = `<div class="card-center face">👸</div>`;
        } else if (card.value === 'K') {
            centerContent = `<div class="card-center face">🤴</div>`;
        } else {
            // Number cards
            let num = parseInt(card.value);
            let symbols = '';

            // Standard placement percentages [left, top, flipped?]
            const layouts = {
                2: [[50, 15, false], [50, 85, true]],
                3: [[50, 15, false], [50, 50, false], [50, 85, true]],
                4: [[25, 15, false], [75, 15, false], [25, 85, true], [75, 85, true]],
                5: [[25, 15, false], [75, 15, false], [50, 50, false], [25, 85, true], [75, 85, true]],
                6: [[25, 15, false], [75, 15, false], [25, 50, false], [75, 50, false], [25, 85, true], [75, 85, true]],
                7: [[25, 15, false], [75, 15, false], [50, 32.5, false], [25, 50, false], [75, 50, false], [25, 85, true], [75, 85, true]],
                8: [[25, 15, false], [75, 15, false], [50, 32.5, false], [25, 50, false], [75, 50, false], [50, 67.5, true], [25, 85, true], [75, 85, true]],
                9: [[25, 15, false], [75, 15, false], [25, 38, false], [75, 38, false], [50, 50, false], [25, 62, true], [75, 62, true], [25, 85, true], [75, 85, true]],
                10: [[25, 15, false], [75, 15, false], [50, 26, false], [25, 38, false], [75, 38, false], [25, 62, true], [75, 62, true], [50, 74, true], [25, 85, true], [75, 85, true]]
            };

            let layout = layouts[num] || [];
            for(let pos of layout) {
                let flipClass = pos[2] ? 'flipped' : '';
                symbols += `<div class="sym ${flipClass}" style="left: ${pos[0]}%; top: ${pos[1]}%;">${card.suit}</div>`;
            }

            centerContent = `<div class="card-center symbols">${symbols}</div>`;
        }

        el.innerHTML = `
            <div class="card-content">
                <div class="card-corner top">
                    <div>${card.value}</div>
                    <div>${card.suit}</div>
                </div>
                ${centerContent}
                <div class="card-corner bottom">
                    <div>${card.value}</div>
                    <div>${card.suit}</div>
                </div>
            </div>
        `;
        el.draggable = true;
    } else {
        el.innerHTML = '';
    }
    el.dataset.id = card.id;
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

// Click to Move
function setupClickToMove() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        if (card.draggable) {
            card.addEventListener('click', handleCardClick);
        }
    });
}

function handleCardClick(e) {
    if (draggedCards.length > 0) return; // Ignore if dragging

    const el = e.currentTarget;
    const parent = el.parentElement;
    let clickSourceType = null;
    let clickSourceIdx = null;
    let clickCards = [];

    if (parent.id === 'waste') {
        clickSourceType = 'waste';
        clickCards = [state.waste[state.waste.length-1]];
    } else if (parent.id.startsWith('f')) {
        // Can't click move from foundation for now
        return;
    } else if (parent.id.startsWith('t')) {
        clickSourceType = 'tableau';
        clickSourceIdx = parseInt(parent.id[1]);
        const cardIdx = parseInt(el.dataset.cardIdx);
        clickCards = state.tableaus[clickSourceIdx].slice(cardIdx);
    }

    if (clickCards.length === 0) return;

    // Try foundations first (if only one card)
    if (clickCards.length === 1) {
        for (let i = 0; i < 4; i++) {
            if (isValidMove(clickCards, 'foundation', i)) {
                moveCards(clickCards, clickSourceType, clickSourceIdx, 'foundation', i);
                return;
            }
        }
    }

    // Try tableaus
    for (let i = 0; i < 7; i++) {
        if (clickSourceType === 'tableau' && clickSourceIdx === i) continue; // Don't move to same pile
        if (isValidMove(clickCards, 'tableau', i)) {
            moveCards(clickCards, clickSourceType, clickSourceIdx, 'tableau', i);
            return;
        }
    }
}

function moveCards(cards, sType, sIdx, tType, tIdx) {
    // Move cards in state
    if (sType === 'waste') state.waste.pop();
    else if (sType === 'tableau') state.tableaus[sIdx].splice(-cards.length);

    if (tType === 'foundation') {
        state.foundations[tIdx].push(cards[0]);
    } else if (tType === 'tableau') {
        state.tableaus[tIdx].push(...cards);
    }

    // Auto-reveal tableau card
    if (sType === 'tableau' && state.tableaus[sIdx].length > 0) {
        state.tableaus[sIdx][state.tableaus[sIdx].length-1].faceUp = true;
    }

    renderAll();
    checkWinCondition();
}

function checkWinCondition() {
    let win = true;
    for (let i = 0; i < 4; i++) {
        if (state.foundations[i].length !== 13) {
            win = false;
            break;
        }
    }
    if (win) {
        triggerWinAnimation();
        startFireworks();
    }
}

// Global variables for animation
let animatingCards = [];
let animationFrameId = null;

function triggerWinAnimation() {
    if (animationFrameId) return; // already running

    // Clear board events
    document.querySelectorAll('.card').forEach(el => {
        el.draggable = false;
        el.onclick = null;
    });

    animatingCards = [];

    // We will pop one card from the foundations one by one to animate
    let fPiles = [0, 1, 2, 3];

    function animateNextCard() {
        let availablePiles = fPiles.filter(i => state.foundations[i].length > 0);
        if (availablePiles.length === 0) {
            return; // done
        }

        let pIdx = availablePiles[Math.floor(Math.random() * availablePiles.length)];
        let card = state.foundations[pIdx].pop();

        // Find its element
        let fPileEl = document.getElementById(`f${pIdx}`);
        let cardEls = fPileEl.querySelectorAll('.card');
        if (cardEls.length === 0) return; // Should not happen

        let cardEl = cardEls[cardEls.length - 1];

        // Move to body so it can freely bounce over everything
        let rect = cardEl.getBoundingClientRect();
        cardEl.style.position = 'fixed';
        cardEl.style.left = rect.left + 'px';
        cardEl.style.top = rect.top + 'px';
        cardEl.style.zIndex = 10000 + animatingCards.length;
        document.body.appendChild(cardEl);

        let vx = (Math.random() * 10) - 5;
        if (vx >= 0 && vx < 2) vx = 2;
        if (vx < 0 && vx > -2) vx = -2;
        let vy = - (Math.random() * 10 + 5);

        animatingCards.push({
            el: cardEl,
            x: rect.left,
            y: rect.top,
            vx: vx,
            vy: vy
        });

        setTimeout(animateNextCard, 200);
    }

    animateNextCard();
    animationLoop();
}

function animationLoop() {
    let w = window.innerWidth;
    let h = window.innerHeight;

    for (let i = 0; i < animatingCards.length; i++) {
        let c = animatingCards[i];

        c.vy += 0.5; // gravity
        c.x += c.vx;
        c.y += c.vy;

        // bounce off bottom
        if (c.y + 140 > h) { // card height is 140
            c.y = h - 140;
            c.vy = -c.vy * 0.7; // bounce with dampening
        }

        // bounce off sides
        if (c.x < 0) {
            c.x = 0;
            c.vx = -c.vx;
        } else if (c.x + 100 > w) { // card width is 100
            c.x = w - 100;
            c.vx = -c.vx;
        }

        c.el.style.left = c.x + 'px';
        c.el.style.top = c.y + 'px';
    }

    animationFrameId = requestAnimationFrame(animationLoop);
}

// Fireworks implementation
let fwCanvas, fwCtx, particles = [];
let fireworkIntervalId = null;
let fwAnimationFrameId = null;

function startFireworks() {
    fwCanvas = document.getElementById('fireworks-canvas');
    fwCtx = fwCanvas.getContext('2d');
    fwCanvas.width = window.innerWidth;
    fwCanvas.height = window.innerHeight;
    fwCanvas.style.display = 'block';

    // Clear particles on start
    particles = [];

    window.addEventListener('resize', () => {
        if(fwCanvas) {
            fwCanvas.width = window.innerWidth;
            fwCanvas.height = window.innerHeight;
        }
    });

    fireworksLoop();
    fireworkIntervalId = setInterval(createFirework, 800);
}

function createFirework() {
    const x = Math.random() * fwCanvas.width;
    const y = fwCanvas.height;
    const targetY = Math.random() * (fwCanvas.height / 2);
    const color = `hsl(${Math.random() * 360}, 100%, 50%)`;

    // Rocket particle
    particles.push({
        x: x,
        y: y,
        targetY: targetY,
        vx: (Math.random() - 0.5) * 2,
        vy: - (Math.random() * 5 + 8),
        color: color,
        type: 'rocket',
        life: 1
    });
}

function explode(x, y, color) {
    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: color,
            type: 'spark',
            life: 1,
            decay: Math.random() * 0.02 + 0.015
        });
    }
}

function fireworksLoop() {
    fwCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    fwCtx.fillRect(0, 0, fwCanvas.width, fwCanvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.type === 'rocket') {
            if (p.vy >= 0 || p.y <= p.targetY) {
                explode(p.x, p.y, p.color);
                particles.splice(i, 1);
            } else {
                p.vy += 0.1; // gravity
                fwCtx.beginPath();
                fwCtx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                fwCtx.fillStyle = p.color;
                fwCtx.fill();
            }
        } else {
            p.vy += 0.05; // gravity for sparks
            p.life -= p.decay;
            if (p.life <= 0) {
                particles.splice(i, 1);
            } else {
                fwCtx.beginPath();
                fwCtx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                fwCtx.fillStyle = p.color;
                fwCtx.globalAlpha = p.life;
                fwCtx.fill();
                fwCtx.globalAlpha = 1;
            }
        }
    }
    fwAnimationFrameId = requestAnimationFrame(fireworksLoop);
}

initGame();
