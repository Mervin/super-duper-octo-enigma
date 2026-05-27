const TRANSLATIONS = {
    en: { msTitle: "Minesweeper", beginner: "Beginner", intermediate: "Intermediate", expert: "Expert", custom: "Custom", newGame: "New Game", backToHub: "Back to Hub" },
    cz: { msTitle: "Hledání min", beginner: "Začátečník", intermediate: "Pokročilý", expert: "Expert", custom: "Vlastní", newGame: "Nová Hra", backToHub: "Zpět do Hubu" }
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

const boardEl = document.getElementById("game-board");
const diffSelect = document.getElementById("difficulty");
const customInputs = document.getElementById("custom-inputs");
const btnNewGame = document.getElementById("btn-new-game");
const statusFace = document.getElementById("status-face");
const minesCountEl = document.getElementById("mines-count");
const timerEl = document.getElementById("timer");

let cols = 9, rows = 9, totalMines = 10;
let grid = [];
let minesLeft = 0;
let timer = 0;
let timerInt = null;
let gameOver = false;
let firstClick = true;

const COLORS = ["", "blue", "green", "red", "darkblue", "brown", "cyan", "black", "gray"];

diffSelect.addEventListener("change", () => {
    customInputs.classList.toggle("active", diffSelect.value === "custom");
});

btnNewGame.addEventListener("click", initGame);
statusFace.addEventListener("click", initGame);

function initGame() {
    clearInterval(timerInt);
    timer = 0;
    timerEl.textContent = "000";
    gameOver = false;
    firstClick = true;
    statusFace.textContent = "🙂";

    if (diffSelect.value === "beginner") { cols = 9; rows = 9; totalMines = 10; }
    else if (diffSelect.value === "intermediate") { cols = 16; rows = 16; totalMines = 40; }
    else if (diffSelect.value === "expert") { cols = 30; rows = 16; totalMines = 99; }
    else {
        cols = parseInt(document.getElementById("custom-w").value) || 20;
        rows = parseInt(document.getElementById("custom-h").value) || 20;
        totalMines = parseInt(document.getElementById("custom-m").value) || 50;
        totalMines = Math.min(totalMines, cols * rows - 1);
    }

    minesLeft = totalMines;
    updateMinesDisplay();

    boardEl.style.gridTemplateColumns = `repeat(${cols}, 30px)`;
    boardEl.innerHTML = "";
    grid = [];

    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.addEventListener("mousedown", handleCellClick);
            cell.addEventListener("contextmenu", e => e.preventDefault());
            boardEl.appendChild(cell);
            grid[r][c] = { r, c, isMine: false, revealed: false, flagged: false, count: 0, el: cell };
        }
    }
}

function placeMines(skipR, skipC) {
    let placed = 0;
    while (placed < totalMines) {
        let r = Math.floor(Math.random() * rows);
        let c = Math.floor(Math.random() * cols);
        if (!grid[r][c].isMine && !(Math.abs(r - skipR) <= 1 && Math.abs(c - skipC) <= 1)) {
            grid[r][c].isMine = true;
            placed++;
        }
    }
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!grid[r][c].isMine) {
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        let nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].isMine) count++;
                    }
                }
                grid[r][c].count = count;
            }
        }
    }
}

function handleCellClick(e) {
    if (gameOver) return;
    const r = parseInt(e.target.dataset.r);
    const c = parseInt(e.target.dataset.c);
    const cellData = grid[r][c];

    if (e.button === 2) { // Right click
        if (cellData.revealed) return;
        cellData.flagged = !cellData.flagged;
        cellData.el.textContent = cellData.flagged ? "🚩" : "";
        minesLeft += cellData.flagged ? -1 : 1;
        updateMinesDisplay();
        return;
    }

    if (e.button === 0) { // Left click
        if (cellData.flagged || cellData.revealed) return;

        if (firstClick) {
            firstClick = false;
            placeMines(r, c);
            timerInt = setInterval(() => {
                timer++;
                timerEl.textContent = timer.toString().padStart(3, '0');
            }, 1000);
        }

        if (cellData.isMine) {
            loseGame();
        } else {
            reveal(r, c);
            checkWin();
        }
    }
}

function reveal(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    const cell = grid[r][c];
    if (cell.revealed || cell.flagged) return;

    cell.revealed = true;
    cell.el.classList.add("revealed");

    if (cell.count > 0) {
        cell.el.textContent = cell.count;
        cell.el.style.color = COLORS[cell.count];
    } else {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                reveal(r + dr, c + dc);
            }
        }
    }
}

function loseGame() {
    gameOver = true;
    clearInterval(timerInt);
    statusFace.textContent = "😵";
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c].isMine) {
                grid[r][c].el.classList.add("mine");
                grid[r][c].el.textContent = "💣";
            }
        }
    }
}

function checkWin() {
    let unrevealed = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!grid[r][c].revealed) unrevealed++;
        }
    }
    if (unrevealed === totalMines) {
        gameOver = true;
        clearInterval(timerInt);
        statusFace.textContent = "😎";
        minesLeft = 0;
        updateMinesDisplay();
    }
}

function updateMinesDisplay() {
    let disp = Math.max(0, minesLeft);
    minesCountEl.textContent = disp.toString().padStart(3, '0');
}

initGame();
