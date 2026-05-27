import { database } from '../../firebase-config.js';
import { ref, set, onValue, update, get, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// DOM Elements
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const btnPlayAi = document.getElementById('btn-play-ai');
const btnCreateRoom = document.getElementById('btn-create-room');
const inviteLinkContainer = document.getElementById('invite-link-container');
const inviteLinkInput = document.getElementById('invite-link');
const btnCopyLink = document.getElementById('btn-copy-link');
const waitingMessage = document.getElementById('waiting-message');
const connectionStatus = document.getElementById('connection-status');

const playerHandDiv = document.getElementById('player-hand');
const discardPileDiv = document.getElementById('discard-pile');
const deckDiv = document.getElementById('deck');
const gameStatusDiv = document.getElementById('game-status');
const opponentCardCountSpan = document.getElementById('opponent-card-count');
const suitSelector = document.getElementById('suit-selector');
const activeSuitIndicator = document.getElementById('active-suit-indicator');

const btnPlayAgain = document.getElementById('btn-play-again');
const btnLeave = document.getElementById('btn-leave');
const winnerMessage = document.getElementById('winner-message');
const opponentNameSpan = document.getElementById('opponent-name');

// Game State
let isMultiplayer = false;
let roomId = null;
let playerId = Math.random().toString(36).substring(2, 9); // Simple local ID
let isHost = true;

let deck = [];
let discardPile = [];
let hand = [];
let opponentHand = []; // Used for AI
let opponentHandCount = 0; // Used for MP
let activeSuit = null;
let drawPenalty = 0;
let currentPlayerId = null;
let isMyTurn = false;
let gameOver = false;

// Card Definitions
const SUITS = ['hearts', 'bells', 'acorns', 'leaves'];
const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const SUIT_SYMBOLS = {
    'hearts': '❤️',
    'bells': '🔔',
    'acorns': '🌰',
    'leaves': '🍃'
};

const RANK_LABELS = {
    '7': '7', '8': '8', '9': '9', '10': '10',
    'J': 'Spodek', 'Q': 'Svršek', 'K': 'Král', 'A': 'Eso'
};

// Initialization
function init() {
    checkUrlForRoom();

    btnPlayAi.addEventListener('click', startAIGame);
    btnCreateRoom.addEventListener('click', createMultiplayerRoom);
    btnCopyLink.addEventListener('click', () => {
        inviteLinkInput.select();
        document.execCommand('copy');
        btnCopyLink.textContent = "Copied!";
        setTimeout(() => btnCopyLink.textContent = "Copy", 2000);
    });

    deckDiv.addEventListener('click', drawCardHandler);

    document.querySelectorAll('.suit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            handleSuitSelection(e.target.dataset.suit);
        });
    });

    btnPlayAgain.addEventListener('click', () => {
        if(isMultiplayer && isHost) resetMultiplayerGame();
        else if(!isMultiplayer) startAIGame();
    });

    btnLeave.addEventListener('click', () => {
        window.location.search = ""; // Reload without room ID
    });
}

function checkUrlForRoom() {
    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get('room');
    if (room) {
        roomId = room;
        isHost = false;
        joinMultiplayerRoom(room);
    } else {
        connectionStatus.textContent = "Ready";
        connectionStatus.className = "status-indicator connected";
    }
}

// --- CORE GAME LOGIC ---

function createDeck() {
    let newDeck = [];
    for (let suit of SUITS) {
        for (let rank of RANKS) {
            newDeck.push({ suit, rank });
        }
    }
    // Shuffle
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
}

function dealInitialCards() {
    hand = deck.splice(0, 4);
    opponentHand = deck.splice(0, 4);
    opponentHandCount = 4;

    // First discard cannot be an action card (7, A, Q) for simplicity, or we just draw until valid
    let firstCard;
    do {
        firstCard = deck.shift();
        if (firstCard.rank === '7' || firstCard.rank === 'A' || firstCard.rank === 'Q') {
            deck.push(firstCard); // put back at bottom
            firstCard = null;
        }
    } while (!firstCard);

    discardPile = [firstCard];
    activeSuit = firstCard.suit;
    drawPenalty = 0;
}

function canPlayCard(card) {
    const topCard = discardPile[discardPile.length - 1];

    // If there is an active 7 penalty, MUST play a 7
    if (drawPenalty > 0 && card.rank !== '7') {
        return false;
    }

    // Queen (Svršek) can be played on anything
    if (card.rank === 'Q') return true;

    // Must match active suit or rank
    if (card.suit === activeSuit || card.rank === topCard.rank) {
        return true;
    }

    return false;
}

function renderHand() {
    playerHandDiv.innerHTML = '';
    hand.forEach((card, index) => {
        const cardEl = createCardElement(card);
        if (isMyTurn && canPlayCard(card)) {
            cardEl.classList.add('playable');
            cardEl.addEventListener('click', () => playCard(index));
        }
        playerHandDiv.appendChild(cardEl);
    });
}

function renderGame() {
    // Render discard pile top card
    discardPileDiv.innerHTML = '';
    if (discardPile.length > 0) {
        const topCard = discardPile[discardPile.length - 1];
        discardPileDiv.appendChild(createCardElement(topCard));
    }

    // Render opponent count
    opponentCardCountSpan.textContent = opponentHandCount;

    // Render active suit if it was changed by Q
    if (discardPile.length > 0 && discardPile[discardPile.length-1].rank === 'Q') {
        activeSuitIndicator.textContent = SUIT_SYMBOLS[activeSuit];
        activeSuitIndicator.classList.remove('hidden');
    } else {
        activeSuitIndicator.classList.add('hidden');
    }

    // Render status message
    if (gameOver) return;
    if (isMyTurn) {
        if (drawPenalty > 0) {
            gameStatusDiv.textContent = `Draw ${drawPenalty} cards or play a 7!`;
            gameStatusDiv.style.color = '#ef4444'; // Red
        } else {
            gameStatusDiv.textContent = "Your turn!";
            gameStatusDiv.style.color = '#4ade80'; // Green
        }
    } else {
        gameStatusDiv.textContent = isMultiplayer ? "Opponent's turn..." : "AI is thinking...";
        gameStatusDiv.style.color = '#94a3b8';
    }

    renderHand();
}

function createCardElement(card) {
    const el = document.createElement('div');
    el.className = `card suit-${card.suit}`;
    const symbol = SUIT_SYMBOLS[card.suit];
    const rankLabel = card.rank; // Keep standard letters for UI

    el.innerHTML = `
        <div class="card-top-left"><span>${rankLabel}</span><span>${symbol}</span></div>
        <div class="card-center">${symbol}</div>
        <div class="card-bottom-right"><span>${rankLabel}</span><span>${symbol}</span></div>
    `;
    return el;
}

function reshuffleDiscardIntoDeck() {
    if (discardPile.length <= 1) return; // Nothing to shuffle

    const topCard = discardPile.pop();
    deck = [...discardPile];
    discardPile = [topCard];

    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// --- LOCAL AI GAME ---

function startAIGame() {
    isMultiplayer = false;
    lobbyScreen.classList.remove('active');
    gameScreen.classList.add('active');
    gameOverScreen.classList.add('hidden');
    opponentNameSpan.textContent = "AI Bot";

    deck = createDeck();
    dealInitialCards();
    isMyTurn = true; // Player always starts vs AI
    gameOver = false;

    renderGame();
}

function drawCardHandler() {
    if (!isMyTurn || gameOver) return;

    if (drawPenalty > 0) {
        // Must draw penalty cards
        for (let i = 0; i < drawPenalty; i++) {
            if (deck.length === 0) reshuffleDiscardIntoDeck();
            if (deck.length > 0) hand.push(deck.shift());
        }
        drawPenalty = 0;
    } else {
        // Draw 1 card
        if (deck.length === 0) reshuffleDiscardIntoDeck();
        if (deck.length > 0) hand.push(deck.shift());
    }

    if (isMultiplayer) {
        syncState(false); // pass turn
    } else {
        isMyTurn = false;
        renderGame();
        setTimeout(aiTurn, 1000);
    }
}

function playCard(handIndex) {
    if (!isMyTurn || gameOver) return;

    const playedCard = hand[handIndex];

    // Remove from hand, add to discard
    hand.splice(handIndex, 1);
    discardPile.push(playedCard);
    activeSuit = playedCard.suit;

    // Handle special cards
    if (playedCard.rank === 'Q') {
        suitSelector.classList.remove('hidden');
        // We don't end turn yet, wait for suit selection
        renderHand(); // disable other cards
        return;
    }

    applyCardEffectAndEndTurn(playedCard);
}

function handleSuitSelection(suit) {
    activeSuit = suit;
    suitSelector.classList.add('hidden');
    const topCard = discardPile[discardPile.length-1];
    applyCardEffectAndEndTurn(topCard);
}

function applyCardEffectAndEndTurn(card) {
    let skipNext = false;

    if (card.rank === '7') {
        drawPenalty += 2;
    } else if (card.rank === 'A') {
        skipNext = true;
    }

    checkWin();
    if (gameOver) return;

    if (isMultiplayer) {
        // If Ace, technically we skip opponent, so it remains our turn.
        // But for simplicity in 2 player, Ace means play again.
        if (!skipNext) {
            isMyTurn = false;
        }
        syncState(!skipNext);
    } else {
        if (!skipNext) {
            isMyTurn = false;
            renderGame();
            setTimeout(aiTurn, 1000);
        } else {
            renderGame(); // My turn again
        }
    }
}

function aiTurn() {
    if (gameOver) return;

    // 1. Try to play a card
    let playableIndices = [];
    opponentHand.forEach((card, index) => {
        // Temporarily mock canPlayCard for AI
        const topCard = discardPile[discardPile.length - 1];
        let canPlay = false;
        if (drawPenalty > 0) {
            canPlay = card.rank === '7';
        } else if (card.rank === 'Q') {
            canPlay = true;
        } else if (card.suit === activeSuit || card.rank === topCard.rank) {
            canPlay = true;
        }

        if(canPlay) playableIndices.push(index);
    });

    if (playableIndices.length > 0) {
        // Pick random playable card
        const playIndex = playableIndices[Math.floor(Math.random() * playableIndices.length)];
        const playedCard = opponentHand.splice(playIndex, 1)[0];
        discardPile.push(playedCard);
        opponentHandCount = opponentHand.length;

        if (playedCard.rank === 'Q') {
            // AI picks most common suit in its hand
            const suitCounts = { 'hearts':0, 'bells':0, 'acorns':0, 'leaves':0 };
            opponentHand.forEach(c => suitCounts[c.suit]++);
            activeSuit = Object.keys(suitCounts).reduce((a, b) => suitCounts[a] > suitCounts[b] ? a : b);
        } else {
            activeSuit = playedCard.suit;
        }

        let skipNext = false;
        if (playedCard.rank === '7') {
            drawPenalty += 2;
        } else if (playedCard.rank === 'A') {
            skipNext = true;
        }

        checkWin();
        if (gameOver) return;

        if (skipNext) {
            setTimeout(aiTurn, 1000); // AI plays again
        } else {
            isMyTurn = true;
            renderGame();
        }

    } else {
        // 2. Draw card(s)
        if (drawPenalty > 0) {
            for (let i = 0; i < drawPenalty; i++) {
                if (deck.length === 0) reshuffleDiscardIntoDeck();
                if (deck.length > 0) opponentHand.push(deck.shift());
            }
            drawPenalty = 0;
        } else {
            if (deck.length === 0) reshuffleDiscardIntoDeck();
            if (deck.length > 0) opponentHand.push(deck.shift());
        }
        opponentHandCount = opponentHand.length;
        isMyTurn = true;
        renderGame();
    }
}

function checkWin() {
    if (hand.length === 0) {
        gameOver = true;
        winnerMessage.textContent = "You Win!";
        gameOverScreen.classList.remove('hidden');
    } else if ((isMultiplayer && opponentHandCount === 0) || (!isMultiplayer && opponentHand.length === 0)) {
        gameOver = true;
        winnerMessage.textContent = "Opponent Wins!";
        gameOverScreen.classList.remove('hidden');
    }
}


// --- MULTIPLAYER (FIREBASE) ---

function createMultiplayerRoom() {
    roomId = Math.random().toString(36).substring(2, 9);
    isMultiplayer = true;
    isHost = true;

    // UI Update
    btnPlayAi.classList.add('hidden');
    btnCreateRoom.classList.add('hidden');
    document.querySelector('.divider').classList.add('hidden');
    inviteLinkContainer.classList.remove('hidden');
    waitingMessage.classList.remove('hidden');

    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    inviteLinkInput.value = link;

    connectionStatus.textContent = "Waiting for player...";

    // Init DB state
    const roomRef = ref(database, `prsi/${roomId}`);
    deck = createDeck();
    dealInitialCards(); // Generates hand, opponentHand (used as Player2's hand temporarily)

    const initialState = {
        players: {
            host: { id: playerId, hand: hand, handCount: hand.length },
            guest: null
        },
        gameState: {
            deck: deck,
            discardPile: discardPile,
            activeSuit: activeSuit,
            drawPenalty: drawPenalty,
            currentTurn: 'host',
            gameOver: false,
            winner: null
        },
        // We store guest's initial hand here temporarily until they join
        pendingGuestHand: opponentHand
    };

    set(roomRef, initialState);

    // Listen for guest joining
    onValue(ref(database, `prsi/${roomId}/players/guest`), (snapshot) => {
        if (snapshot.val() && !gameScreen.classList.contains('active')) {
            // Guest joined! Start game
            startMultiplayerGame();
        }
    });
}

function joinMultiplayerRoom(roomToJoin) {
    isMultiplayer = true;
    roomId = roomToJoin;
    isHost = false;

    connectionStatus.textContent = "Connecting to room...";

    const roomRef = ref(database, `prsi/${roomId}`);
    get(roomRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.players.guest) {
                alert("Room is already full!");
                window.location.search = "";
                return;
            }

            // Claim guest spot
            hand = data.pendingGuestHand; // Take our initial hand

            update(ref(database, `prsi/${roomId}/players`), {
                guest: { id: playerId, hand: hand, handCount: hand.length }
            }).then(() => {
                // Also remove pending hand
                remove(ref(database, `prsi/${roomId}/pendingGuestHand`));
                startMultiplayerGame();
            });

        } else {
            alert("Room not found!");
            window.location.search = "";
        }
    });
}

function startMultiplayerGame() {
    lobbyScreen.classList.add('active'); // Hide later
    lobbyScreen.classList.remove('active');
    gameScreen.classList.add('active');
    gameOverScreen.classList.add('hidden');
    opponentNameSpan.textContent = "Real Player";
    connectionStatus.textContent = "Connected";
    connectionStatus.className = "status-indicator connected";

    // Setup listener for game state
    onValue(ref(database, `prsi/${roomId}`), (snapshot) => {
        if (!snapshot.exists()) {
            alert("Room closed by host.");
            window.location.search = "";
            return;
        }

        const data = snapshot.val();

        // Sync state
        deck = data.gameState.deck || [];
        discardPile = data.gameState.discardPile || [];
        activeSuit = data.gameState.activeSuit;
        drawPenalty = data.gameState.drawPenalty;

        const myRole = isHost ? 'host' : 'guest';
        const opponentRole = isHost ? 'guest' : 'host';

        // Ensure my hand is synced (in case of draw)
        if (data.players[myRole]) {
            hand = data.players[myRole].hand || [];
        }

        if (data.players[opponentRole]) {
            opponentHandCount = data.players[opponentRole].handCount || 0;
        }

        isMyTurn = (data.gameState.currentTurn === myRole);
        gameOver = data.gameState.gameOver;

        if (gameOver) {
            winnerMessage.textContent = data.gameState.winner === myRole ? "You Win!" : "Opponent Wins!";
            gameOverScreen.classList.remove('hidden');
        }

        renderGame();
    });
}

// Function called when a player makes a move (draw or play)
function syncState(passTurn = true) {
    const myRole = isHost ? 'host' : 'guest';
    const opponentRole = isHost ? 'guest' : 'host';

    let nextTurn = myRole;
    if (passTurn) {
        nextTurn = opponentRole;
    }

    let winner = null;
    let isGameOver = false;
    if (hand.length === 0) {
        isGameOver = true;
        winner = myRole;
    }

    const updates = {};
    updates[`gameState/deck`] = deck;
    updates[`gameState/discardPile`] = discardPile;
    updates[`gameState/activeSuit`] = activeSuit;
    updates[`gameState/drawPenalty`] = drawPenalty;
    updates[`gameState/currentTurn`] = nextTurn;
    updates[`gameState/gameOver`] = isGameOver;
    updates[`gameState/winner`] = winner;

    updates[`players/${myRole}/hand`] = hand;
    updates[`players/${myRole}/handCount`] = hand.length;

    update(ref(database, `prsi/${roomId}`), updates);
}

function resetMultiplayerGame() {
    if (!isHost) return;

    deck = createDeck();
    hand = deck.splice(0, 4);
    const guestHand = deck.splice(0, 4);

    let firstCard;
    do {
        firstCard = deck.shift();
        if (firstCard.rank === '7' || firstCard.rank === 'A' || firstCard.rank === 'Q') {
            deck.push(firstCard);
        }
    } while (!firstCard);

    discardPile = [firstCard];
    activeSuit = firstCard.suit;
    drawPenalty = 0;

    const updates = {
        'gameState/deck': deck,
        'gameState/discardPile': discardPile,
        'gameState/activeSuit': activeSuit,
        'gameState/drawPenalty': 0,
        'gameState/currentTurn': 'host',
        'gameState/gameOver': false,
        'gameState/winner': null,
        'players/host/hand': hand,
        'players/host/handCount': hand.length,
        'players/guest/hand': guestHand,
        'players/guest/handCount': guestHand.length
    };

    update(ref(database, `prsi/${roomId}`), updates);
}

// Start
init();