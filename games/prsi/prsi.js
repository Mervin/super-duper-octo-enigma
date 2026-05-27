import { database } from '../../firebase-config.js';
import { ref, set, onValue, update, get, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const TRANSLATIONS = {
    en: {
        prsi_title: "Prší", prsi_lobby: "Lobby", prsi_play_ai: "Play vs AI", prsi_create_room: "Create Multiplayer Room",
        prsi_share_link: "Share this link to invite a player:", prsi_waiting: "Waiting for opponent to join...",
        prsi_rules_title: "Rules Hint", prsi_rule_7: "7: Next player draws 2 cards (unless they play a 7).",
        prsi_rule_ace: "Ace (Eso): Skips the next player (unless they play an Ace).",
        prsi_rule_svrsek: "Svršek (Over/Queen): Can be played on any suit, changes the active suit.",
        prsi_rule_match: "You must match the suit or the rank of the top card.",
        prsi_choose_suit: "Choose Suit:", prsi_play_again: "Play Again", prsi_leave: "Leave",
        prsi_you_win: "You Win!", prsi_opp_wins: "Opponent Wins!",
        prsi_turn_yours: "Your turn!", prsi_turn_opp: "Opponent's turn...", prsi_turn_ai: "AI is thinking...",
        prsi_draw_penalty: "Draw {0} cards or play a 7!",
        prsi_ai_bot: "AI Bot", prsi_real_player: "Real Player",
        prsi_status_ready: "Ready", prsi_status_waiting: "Waiting for player...",
        prsi_status_connecting: "Connecting to room...", prsi_status_connected: "Connected"
    },
    cz: {
        prsi_title: "Prší", prsi_lobby: "Lobby", prsi_play_ai: "Hrát proti AI", prsi_create_room: "Vytvořit Multiplayer Místnost",
        prsi_share_link: "Sdílejte tento odkaz pro pozvání hráče:", prsi_waiting: "Čekám na připojení soupeře...",
        prsi_rules_title: "Nápověda k pravidlům", prsi_rule_7: "7: Další hráč si lízne 2 karty (pokud nezahraje 7).",
        prsi_rule_ace: "Eso: Přeskočí dalšího hráče (pokud nezahraje Eso).",
        prsi_rule_svrsek: "Svršek: Může být zahrán na libovolnou barvu, mění aktivní barvu.",
        prsi_rule_match: "Musíte ctít barvu nebo hodnotu vrchní karty.",
        prsi_choose_suit: "Vyberte barvu:", prsi_play_again: "Hrát Znovu", prsi_leave: "Odejít",
        prsi_you_win: "Vyhrál jsi!", prsi_opp_wins: "Soupeř vyhrál!",
        prsi_turn_yours: "Jsi na tahu!", prsi_turn_opp: "Soupeř je na tahu...", prsi_turn_ai: "AI přemýšlí...",
        prsi_draw_penalty: "Lízni si {0} karet nebo zahraj 7!",
        prsi_ai_bot: "AI Bot", prsi_real_player: "Skutečný Hráč",
        prsi_status_ready: "Připraven", prsi_status_waiting: "Čekání na hráče...",
        prsi_status_connecting: "Připojování k místnosti...", prsi_status_connected: "Připojeno"
    }
};

let lang = localStorage.getItem("hub_lang") || "en";
const langSelect = document.getElementById('lang-select');
if (langSelect) {
    langSelect.value = lang;
    langSelect.addEventListener('change', (e) => {
        lang = e.target.value;
        localStorage.setItem("hub_lang", lang);
        updateTranslations();
    });
}

function updateTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
            if (el.tagName === "OPTION") el.textContent = TRANSLATIONS[lang][key];
            else el.textContent = TRANSLATIONS[lang][key];
        }
    });
    // Update dynamic text if game is running
    if (gameOver) {
        winnerMessage.textContent = TRANSLATIONS[lang][winnerMessage.dataset.winnerKey] || winnerMessage.textContent;
    }
    if (opponentNameSpan.textContent === TRANSLATIONS['en']['prsi_ai_bot'] || opponentNameSpan.textContent === TRANSLATIONS['cz']['prsi_ai_bot']) {
        opponentNameSpan.textContent = TRANSLATIONS[lang]['prsi_ai_bot'];
    } else if (opponentNameSpan.textContent === TRANSLATIONS['en']['prsi_real_player'] || opponentNameSpan.textContent === TRANSLATIONS['cz']['prsi_real_player']) {
        opponentNameSpan.textContent = TRANSLATIONS[lang]['prsi_real_player'];
    }
    renderGame(); // re-render status
}


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
    '7': 'VII', '8': 'VIII', '9': 'IX', '10': 'X',
    'J': 'Spodek', 'Q': 'Svršek', 'K': 'Král', 'A': 'Eso'
};

// Initialization
function init() {
    updateTranslations();
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
        connectionStatus.textContent = TRANSLATIONS[lang]['prsi_status_ready'];
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
            gameStatusDiv.textContent = TRANSLATIONS[lang]['prsi_draw_penalty'].replace('{0}', drawPenalty);
            gameStatusDiv.style.color = '#ef4444'; // Red
        } else {
            gameStatusDiv.textContent = TRANSLATIONS[lang]['prsi_turn_yours'];
            gameStatusDiv.style.color = '#4ade80'; // Green
        }
    } else {
        gameStatusDiv.textContent = isMultiplayer ? TRANSLATIONS[lang]['prsi_turn_opp'] : TRANSLATIONS[lang]['prsi_turn_ai'];
        gameStatusDiv.style.color = '#94a3b8';
    }

    renderHand();
}

function createCardElement(card) {
    const el = document.createElement('div');

    // Add specific classes for Spodek/Svršek styling
    let specialClass = '';
    if (card.rank === 'J') specialClass = 'spodek';
    if (card.rank === 'Q') specialClass = 'svrsek';

    el.className = `card suit-${card.suit} ${specialClass}`;

    const symbol = SUIT_SYMBOLS[card.suit];
    const rankLabel = RANK_LABELS[card.rank];

    let centerGraphic = symbol;
    if (card.rank === 'A') centerGraphic = '🦅'; // Eagle or shield for Ace
    if (card.rank === 'K') centerGraphic = '👑'; // Crown for King
    if (card.rank === 'Q' || card.rank === 'J') centerGraphic = '⚔️'; // Weapons/knights
    if (card.rank === '7' || card.rank === '8' || card.rank === '9' || card.rank === '10') {
        // Number cards show multiple symbols traditionally, but we'll stick to a big one
        centerGraphic = symbol;
    }

    el.innerHTML = `
        <div class="card-half-top">
            <span class="card-value">${['7','8','9','10'].includes(card.rank) ? rankLabel : ''}</span>
            <span class="card-suit">${symbol}</span>
            <div class="card-center-graphic">${centerGraphic}</div>
            <span class="card-name">${['J','Q','K','A'].includes(card.rank) ? rankLabel : ''}</span>
        </div>
        <div class="card-half-bottom">
            <span class="card-value">${['7','8','9','10'].includes(card.rank) ? rankLabel : ''}</span>
            <span class="card-suit">${symbol}</span>
            <div class="card-center-graphic">${centerGraphic}</div>
            <span class="card-name">${['J','Q','K','A'].includes(card.rank) ? rankLabel : ''}</span>
        </div>
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
    opponentNameSpan.textContent = TRANSLATIONS[lang]['prsi_ai_bot'];

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

    // Always render game so the last card played is visually moved to discard pile
    renderGame();

    if (isMultiplayer) {
        // If game is over, we still need to sync the win state to the opponent!
        if (gameOver) {
            syncState(false);
            return;
        }
        // If Ace, technically we skip opponent, so it remains our turn.
        // But for simplicity in 2 player, Ace means play again.
        if (!skipNext) {
            isMyTurn = false;
        }
        syncState(!skipNext);
    } else {
        if (gameOver) return;
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
        winnerMessage.dataset.winnerKey = 'prsi_you_win';
        winnerMessage.textContent = TRANSLATIONS[lang]['prsi_you_win'];
        gameOverScreen.classList.remove('hidden');
    } else if ((isMultiplayer && opponentHandCount === 0) || (!isMultiplayer && opponentHand.length === 0)) {
        gameOver = true;
        winnerMessage.dataset.winnerKey = 'prsi_opp_wins';
        winnerMessage.textContent = TRANSLATIONS[lang]['prsi_opp_wins'];
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

    connectionStatus.textContent = TRANSLATIONS[lang]['prsi_status_waiting'];

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

    connectionStatus.textContent = TRANSLATIONS[lang]['prsi_status_connecting'];

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
    opponentNameSpan.textContent = TRANSLATIONS[lang]['prsi_real_player'];
    connectionStatus.textContent = TRANSLATIONS[lang]['prsi_status_connected'];
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
            const isWin = data.gameState.winner === myRole;
            const key = isWin ? 'prsi_you_win' : 'prsi_opp_wins';
            winnerMessage.dataset.winnerKey = key;
            winnerMessage.textContent = TRANSLATIONS[lang][key];
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