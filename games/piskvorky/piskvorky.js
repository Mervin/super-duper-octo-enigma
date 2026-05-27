import { database } from '../../firebase-config.js';
import { ref, set, onValue, update, get, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// DOM
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');

const btnWin3 = document.getElementById('btn-win-3');
const btnWin4 = document.getElementById('btn-win-4');
const btnWin5 = document.getElementById('btn-win-5');
const btnWinCustom = document.getElementById('btn-win-custom');
const inputWinCustom = document.getElementById('input-win-custom');
const btnPlayHotseat = document.getElementById('btn-play-hotseat');
const btnPlayAI = document.getElementById('btn-play-ai');
const btnCreateRoom = document.getElementById('btn-create-room');

const inviteLinkContainer = document.getElementById('invite-link-container');
const inviteLinkInput = document.getElementById('invite-link');
const btnCopyLink = document.getElementById('btn-copy-link');
const waitingMessage = document.getElementById('waiting-message');
const connectionStatus = document.getElementById('connection-status');

const playerXInfo = document.getElementById('player-x-info');
const playerOInfo = document.getElementById('player-o-info');
const turnIndicator = document.getElementById('turn-indicator');
const winnerMessage = document.getElementById('winner-message');
const btnPlayAgain = document.getElementById('btn-play-again');
const btnLeave = document.getElementById('btn-leave');

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game State
let mode = 'hotseat'; // hotseat, ai, mp
let roomId = null;
let isHost = true;
let winCondition = 5;

// Board State
// Using a Map for infinite grid. Key: "x,y", Value: 'X' or 'O'
let board = new Map();
let currentTurn = 'X'; // X always starts
let gameOver = false;
let winningLine = null; // [{x,y}, ...]

// View/Camera State
const CELL_SIZE = 40;
let camera = { x: 0, y: 0 }; // Center of grid
let isPanning = false;
let panStart = { x: 0, y: 0 };
let hoverCell = null;

// Initialization
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Toggle Win Cond
    btnWin3.addEventListener('click', () => setWinCond(3));
    btnWin4.addEventListener('click', () => setWinCond(4));
    btnWin5.addEventListener('click', () => setWinCond(5));
    btnWinCustom.addEventListener('click', () => setWinCond('custom'));

    inputWinCustom.addEventListener('change', () => {
        let val = parseInt(inputWinCustom.value);
        if (isNaN(val) || val < 3) val = 3;
        inputWinCustom.value = val;
        winCondition = val;
    });

    // Modes
    btnPlayHotseat.addEventListener('click', () => startGame('hotseat'));
    btnPlayAI.addEventListener('click', () => startGame('ai'));
    btnCreateRoom.addEventListener('click', createMultiplayerRoom);

    // Copy Link
    btnCopyLink.addEventListener('click', () => {
        inviteLinkInput.select();
        document.execCommand('copy');
        btnCopyLink.textContent = "Copied!";
        setTimeout(() => btnCopyLink.textContent = "Copy", 2000);
    });

    btnPlayAgain.addEventListener('click', resetGame);
    btnLeave.addEventListener('click', () => window.location.search = "");

    setupCanvasInput();
    checkUrlForRoom();

    requestAnimationFrame(render);
}

function setWinCond(val) {
    if (val === 'custom') {
        winCondition = parseInt(inputWinCustom.value) || 6;
        inputWinCustom.classList.remove('hidden');
    } else {
        winCondition = val;
        inputWinCustom.classList.add('hidden');
    }

    btnWin3.classList.toggle('active', val === 3);
    btnWin4.classList.toggle('active', val === 4);
    btnWin5.classList.toggle('active', val === 5);
    btnWinCustom.classList.toggle('active', val === 'custom');
}

function resizeCanvas() {
    const wrapper = document.querySelector('.canvas-wrapper');
    canvas.width = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
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

// --- CORE LOGIC ---

function startGame(selectedMode) {
    mode = selectedMode;
    lobbyScreen.classList.remove('active');
    gameScreen.classList.add('active');

    // Resize canvas now that the container is visible
    resizeCanvas();

    board.clear();
    currentTurn = 'X';
    gameOver = false;
    winningLine = null;
    camera = { x: 0, y: 0 };

    updateUI();
}

function makeMove(gx, gy, isAiMove = false) {
    if (gameOver) return;
    const key = `${gx},${gy}`;
    if (board.has(key)) return;

    // Check turn validity for MP/AI
    if (mode === 'ai' && currentTurn === 'O' && !isAiMove) return; // Wait for AI
    if (mode === 'mp') {
        const mySymbol = isHost ? 'X' : 'O';
        if (currentTurn !== mySymbol) return;
    }

    // Place symbol
    board.set(key, currentTurn);

    // Check win
    const winStr = checkWin(gx, gy, currentTurn);
    if (winStr) {
        gameOver = true;
        winningLine = winStr;
    }

    if (mode === 'mp') {
        syncState(gx, gy, currentTurn, gameOver, winningLine);
    } else {
        if (!gameOver) {
            currentTurn = currentTurn === 'X' ? 'O' : 'X';
            if (mode === 'ai' && currentTurn === 'O') {
                setTimeout(aiMove, 500); // Small delay for UX
            }
        } else {
            showGameOver();
        }
    }

    updateUI();
}

function updateUI() {
    playerXInfo.classList.toggle('active-turn', currentTurn === 'X');
    playerOInfo.classList.toggle('active-turn', currentTurn === 'O');

    if (mode === 'hotseat') {
        playerXInfo.querySelector('.name').textContent = "Player 1 (X)";
        playerOInfo.querySelector('.name').textContent = "Player 2 (O)";
        turnIndicator.textContent = `Player ${currentTurn === 'X' ? '1' : '2'}'s Turn`;
    } else if (mode === 'ai') {
        playerXInfo.querySelector('.name').textContent = "You (X)";
        playerOInfo.querySelector('.name').textContent = "AI (O)";
        turnIndicator.textContent = currentTurn === 'X' ? "Your Turn" : "AI is thinking...";
    } else if (mode === 'mp') {
        const mySymbol = isHost ? 'X' : 'O';
        playerXInfo.querySelector('.name').textContent = isHost ? "You (X)" : "Opponent (X)";
        playerOInfo.querySelector('.name').textContent = isHost ? "Opponent (O)" : "You (O)";
        turnIndicator.textContent = currentTurn === mySymbol ? "Your Turn!" : "Opponent's Turn...";
    }
}

function showGameOver() {
    gameOverScreen.classList.remove('hidden');
    let msg = "";
    if (mode === 'hotseat') {
        msg = `Player ${currentTurn === 'X' ? '1' : '2'} Wins!`;
    } else if (mode === 'ai') {
        msg = currentTurn === 'X' ? "You Win!" : "AI Wins!";
    } else if (mode === 'mp') {
        const mySymbol = isHost ? 'X' : 'O';
        msg = currentTurn === mySymbol ? "You Win!" : "Opponent Wins!";
    }
    winnerMessage.textContent = msg;
}

function resetGame() {
    if (mode === 'mp') {
        if (isHost) resetMultiplayerGame();
    } else {
        gameOverScreen.classList.add('hidden');
        startGame(mode);
    }
}

// --- WIN LOGIC ---

function getBoardVal(x, y) {
    return board.get(`${x},${y}`);
}

function checkWin(cx, cy, player) {
    const dirs = [
        [1, 0], // Horizontal
        [0, 1], // Vertical
        [1, 1], // Diagonal \
        [1, -1] // Diagonal /
    ];

    for (let [dx, dy] of dirs) {
        let count = 1;
        let line = [{x: cx, y: cy}];

        // Check forward
        for (let i = 1; i < winCondition; i++) {
            if (getBoardVal(cx + dx*i, cy + dy*i) === player) {
                count++;
                line.push({x: cx + dx*i, y: cy + dy*i});
            } else break;
        }
        // Check backward
        for (let i = 1; i < winCondition; i++) {
            if (getBoardVal(cx - dx*i, cy - dy*i) === player) {
                count++;
                line.push({x: cx - dx*i, y: cy - dy*i});
            } else break;
        }

        if (count >= winCondition) {
            return line;
        }
    }
    return null;
}

// --- AI LOGIC (Simple defensive/offensive) ---

function aiMove() {
    if (gameOver) return;

    // 1. Gather all empty cells adjacent to played cells (to limit search space)
    let candidates = new Set();
    for (let key of board.keys()) {
        const [x, y] = key.split(',').map(Number);
        for(let dx=-1; dx<=1; dx++) {
            for(let dy=-1; dy<=1; dy++) {
                if(dx===0 && dy===0) continue;
                const nk = `${x+dx},${y+dy}`;
                if(!board.has(nk)) candidates.add(nk);
            }
        }
    }

    if (candidates.size === 0) {
        makeMove(0, 0, true); // First move if board empty somehow
        return;
    }

    let bestScore = -1;
    let bestMoves = [];

    // Simple heuristic: evaluate score for placing O
    for (let cand of candidates) {
        const [x, y] = cand.split(',').map(Number);
        let score = evaluatePos(x, y, 'O') * 1.1; // Slight preference to win
        score += evaluatePos(x, y, 'X'); // Block X's win

        if (score > bestScore) {
            bestScore = score;
            bestMoves = [{x, y}];
        } else if (score === bestScore) {
            bestMoves.push({x, y});
        }
    }

    // Pick random from best
    const move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    makeMove(move.x, move.y, true);
}

function evaluatePos(cx, cy, player) {
    const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    let maxConsecutive = 0;

    for (let [dx, dy] of dirs) {
        let count = 1; // Count if we place here
        let openEnds = 0;

        // Forward
        let i = 1;
        while (getBoardVal(cx + dx*i, cy + dy*i) === player) { count++; i++; }
        if (!getBoardVal(cx + dx*i, cy + dy*i)) openEnds++;

        // Backward
        i = 1;
        while (getBoardVal(cx - dx*i, cy - dy*i) === player) { count++; i++; }
        if (!getBoardVal(cx - dx*i, cy - dy*i)) openEnds++;

        // Scoring heuristic
        if (count >= winCondition) return 100000; // Winning move
        if (count === winCondition - 1 && openEnds > 0) return 10000; // Almost win/block
        if (count === winCondition - 2 && openEnds === 2) return 1000; // Open end builder

        maxConsecutive = Math.max(maxConsecutive, count + openEnds*0.5);
    }
    return maxConsecutive;
}

// --- MULTIPLAYER (FIREBASE) ---

function createMultiplayerRoom() {
    roomId = Math.random().toString(36).substring(2, 9);
    mode = 'mp';
    isHost = true;

    // UI
    document.querySelectorAll('.action-btn').forEach(btn => {
        if(btn.id !== 'btn-copy-link') btn.classList.add('hidden');
    });
    document.querySelector('.divider').classList.add('hidden');
    document.querySelector('.settings-group').classList.add('hidden');
    inviteLinkContainer.classList.remove('hidden');
    waitingMessage.classList.remove('hidden');

    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    inviteLinkInput.value = link;
    connectionStatus.textContent = "Waiting for player...";

    const roomRef = ref(database, `piskvorky/${roomId}`);
    set(roomRef, {
        settings: { winCondition: winCondition },
        state: { turn: 'X', gameOver: false, winningLine: null },
        board: {}, // Firebase doesn't support empty arrays/maps, but we can set properties later
        players: { host: true, guest: false }
    });

    onValue(ref(database, `piskvorky/${roomId}/players/guest`), (snapshot) => {
        if (snapshot.val() && !gameScreen.classList.contains('active')) {
            startMPGame();
        }
    });
}

function joinMultiplayerRoom(room) {
    mode = 'mp';
    roomId = room;
    isHost = false;
    connectionStatus.textContent = "Connecting...";

    get(ref(database, `piskvorky/${roomId}`)).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.players.guest) {
                alert("Room is full!");
                window.location.search = "";
                return;
            }

            winCondition = data.settings.winCondition;

            update(ref(database, `piskvorky/${roomId}/players`), { guest: true }).then(() => {
                startMPGame();
            });
        } else {
            alert("Room not found!");
            window.location.search = "";
        }
    });
}

function startMPGame() {
    lobbyScreen.classList.add('hidden');
    lobbyScreen.classList.remove('active');
    startGame('mp');
    connectionStatus.textContent = "Connected";
    connectionStatus.className = "status-indicator connected";

    onValue(ref(database, `piskvorky/${roomId}`), (snapshot) => {
        if (!snapshot.exists()) {
            alert("Host closed room.");
            window.location.search = "";
            return;
        }

        const data = snapshot.val();
        winCondition = data.settings.winCondition;

        // Parse board (Firebase stores maps as objects)
        board.clear();
        if (data.board) {
            Object.keys(data.board).forEach(k => {
                // Firebase keys can't have ',', we stored them as "x_y"
                const actualKey = k.replace('_', ',');
                board.set(actualKey, data.board[k]);
            });
        }

        currentTurn = data.state.turn;
        gameOver = data.state.gameOver;
        winningLine = data.state.winningLine || null;

        updateUI();
        if (gameOver) showGameOver();
    });
}

function syncState(gx, gy, turn, isOver, wLine) {
    const key = `${gx}_${gy}`; // Firebase safe key
    const updates = {};
    updates[`board/${key}`] = turn;
    updates[`state/turn`] = turn === 'X' ? 'O' : 'X';
    updates[`state/gameOver`] = isOver;
    if (wLine) updates[`state/winningLine`] = wLine;

    update(ref(database, `piskvorky/${roomId}`), updates);
}

function resetMultiplayerGame() {
    const updates = {
        'board': null,
        'state/turn': 'X',
        'state/gameOver': false,
        'state/winningLine': null
    };
    update(ref(database, `piskvorky/${roomId}`), updates).then(() => {
        gameOverScreen.classList.add('hidden');
    });
}

// --- RENDERING & INPUT ---

function screenToGrid(sx, sy) {
    // Camera is the grid coordinate at the center of the canvas
    const centerOffX = canvas.width / 2;
    const centerOffY = canvas.height / 2;

    // Pixel offset from center
    const px = sx - centerOffX;
    const py = sy - centerOffY;

    // Convert to grid
    const gx = Math.floor(px / CELL_SIZE + camera.x);
    const gy = Math.floor(py / CELL_SIZE + camera.y);
    return { x: gx, y: gy };
}

function gridToScreen(gx, gy) {
    const centerOffX = canvas.width / 2;
    const centerOffY = canvas.height / 2;

    const sx = (gx - camera.x) * CELL_SIZE + centerOffX;
    const sy = (gy - camera.y) * CELL_SIZE + centerOffY;
    return { x: sx, y: sy };
}

function setupCanvasInput() {
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 2) {
            isPanning = true;
            panStart = { x: e.clientX, y: e.clientY };
        } else if (e.button === 0) {
            if (gameOver || !gameScreen.classList.contains('active')) return;
            const pos = screenToGrid(e.offsetX, e.offsetY);
            makeMove(pos.x, pos.y);
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isPanning) {
            const dx = (e.clientX - panStart.x) / CELL_SIZE;
            const dy = (e.clientY - panStart.y) / CELL_SIZE;
            camera.x -= dx;
            camera.y -= dy;
            panStart = { x: e.clientX, y: e.clientY };
        } else {
            hoverCell = screenToGrid(e.offsetX, e.offsetY);
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 2) isPanning = false;
    });

    canvas.addEventListener('mouseleave', () => { hoverCell = null; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
}

function render() {
    if (!gameScreen.classList.contains('active')) {
        requestAnimationFrame(render);
        return;
    }

    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    const startGrid = screenToGrid(0, 0);
    const endGrid = screenToGrid(canvas.width, canvas.height);

    for (let x = startGrid.x - 1; x <= endGrid.x + 1; x++) {
        const s = gridToScreen(x, 0);
        ctx.beginPath(); ctx.moveTo(s.x, 0); ctx.lineTo(s.x, canvas.height); ctx.stroke();
    }
    for (let y = startGrid.y - 1; y <= endGrid.y + 1; y++) {
        const s = gridToScreen(0, y);
        ctx.beginPath(); ctx.moveTo(0, s.y); ctx.lineTo(canvas.width, s.y); ctx.stroke();
    }

    // Draw Hover
    if (hoverCell && !gameOver) {
        let isMyTurn = true;
        if (mode === 'mp') {
            const mySymbol = isHost ? 'X' : 'O';
            if (currentTurn !== mySymbol) isMyTurn = false;
        } else if (mode === 'ai') {
            if (currentTurn !== 'X') isMyTurn = false;
        }

        if (isMyTurn && !board.has(`${hoverCell.x},${hoverCell.y}`)) {
            const s = gridToScreen(hoverCell.x, hoverCell.y);
            ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
            ctx.fillRect(s.x, s.y, CELL_SIZE, CELL_SIZE);
        }
    }

    // Draw Marks
    for (let [key, player] of board.entries()) {
        const [x, y] = key.split(',').map(Number);
        const s = gridToScreen(x, y);

        ctx.lineWidth = 3;
        ctx.lineCap = 'round';

        const cx = s.x + CELL_SIZE / 2;
        const cy = s.y + CELL_SIZE / 2;
        const padding = 10;

        if (player === 'X') {
            ctx.strokeStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(s.x + padding, s.y + padding);
            ctx.lineTo(s.x + CELL_SIZE - padding, s.y + CELL_SIZE - padding);
            ctx.moveTo(s.x + CELL_SIZE - padding, s.y + padding);
            ctx.lineTo(s.x + padding, s.y + CELL_SIZE - padding);
            ctx.stroke();
        } else {
            ctx.strokeStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(cx, cy, (CELL_SIZE / 2) - padding, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // Draw Winning Line
    if (winningLine) {
        ctx.strokeStyle = '#4ade80'; // Green
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();

        // Sort line to draw from start to end cleanly
        winningLine.sort((a,b) => (a.x===b.x) ? a.y - b.y : a.x - b.x);

        const start = gridToScreen(winningLine[0].x, winningLine[0].y);
        const end = gridToScreen(winningLine[winningLine.length-1].x, winningLine[winningLine.length-1].y);

        ctx.moveTo(start.x + CELL_SIZE/2, start.y + CELL_SIZE/2);
        ctx.lineTo(end.x + CELL_SIZE/2, end.y + CELL_SIZE/2);
        ctx.stroke();
    }

    requestAnimationFrame(render);
}

// Start
init();