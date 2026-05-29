// DOM Elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const baseHpSpan = document.getElementById('base-hp');
const waveNumSpan = document.getElementById('wave-num');
const materialsCountSpan = document.getElementById('materials-count');
const coinsCountSpan = document.getElementById('coins-count');
const persistentCoinsCountSpan = document.getElementById('persistent-coins-count');
const talentsCoinsDisplay = document.getElementById('talents-coins-display');
const earnedCoinsSpan = document.getElementById('earned-coins');

const shopCostSpan = document.getElementById('shop-cost');
const shopBlocksDiv = document.getElementById('shop-blocks');

const btnSpeedToggle = document.getElementById('btn-speed-toggle');
const btnNextWave = document.getElementById('btn-next-wave');
const gameOverScreen = document.getElementById('game-over-screen');
const finalWaveSpan = document.getElementById('final-wave');
const btnReturnMenu = document.getElementById('btn-return-menu');

const btnStartRun = document.getElementById('btn-start-run');
const btnOpenTalents = document.getElementById('btn-open-talents');
const btnCloseTalents = document.getElementById('btn-close-talents');

const mainMenuScreen = document.getElementById('main-menu-screen');
const talentsScreen = document.getElementById('talents-screen');
const gameScreen = document.getElementById('game-screen');
const gameStatsBar = document.getElementById('game-stats-bar');
const menuStatsBar = document.getElementById('menu-stats-bar');
const talentsGrid = document.getElementById('talents-grid');

// Constants
const CELL_SIZE = 30;
const GRID_W = canvas.width / CELL_SIZE; // 20
const GRID_H = canvas.height / CELL_SIZE; // 20

// Game State
let gameState = {
    baseHp: 100,
    maxBaseHp: 100, // can be upgraded
    wave: 1,
    materials: 20, // start with some to buy first block
    coins: 0,
    shopCost: 10,

    grid: [], // 2D array [x][y] storing blocks
    enemies: [],
    projectiles: [],
    particles: [],

    selectedShopItem: null, // the block currently held to be placed
    heldRotation: 0, // 0, 1, 2, 3

    waveActive: false,
    enemySpawnTimer: 0,
    enemiesToSpawn: 0,
    waveDelayTimer: 0,

    lastTime: 0,
    gameOver: false,
    speedMultiplier: 1
};

// Persistent State
let persistentState = {
    coins: 0,
    unlockedShapes: [0, 1], // indices in SHAPES (0=O, 1=I)
    unlockedRotations: {},  // map of shapeIndex -> num unlocked rotations (0, 1, 2, 3)
    unlockedShooters: [0],  // indices in SHOOTER_TYPES (0=Basic)
    unlockedMaterials: [0], // 0=Wood, 1=Stone, 2=Iron
    talents: {
        blockHpLevel: 0,
        weaponDmgLevel: 0,
        yieldLevel: 0, // resource gain bonus
        gameSpeedLevel: 0,
        maxShootersLevel: 0
    }
};

function savePersistentState() {
    localStorage.setItem('towerBuilderState', JSON.stringify(persistentState));
}

function loadPersistentState() {
    const saved = localStorage.getItem('towerBuilderState');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Merge to ensure we have default structure
            persistentState = { ...persistentState, ...parsed };
            // Ensure nested objects merge properly
            if (parsed.talents) persistentState.talents = { ...persistentState.talents, ...parsed.talents };
        } catch (e) {
            console.error('Failed to load tower builder save:', e);
        }
    }
}

// Tetromino Shapes (0,0 is top-left of bounding box)
const SHAPES = [
    [[1,1],[1,1]], // O
    [[1,1,1,1]],   // I
    [[0,1,0],[1,1,1]], // T
    [[1,0,0],[1,1,1]], // L
    [[0,0,1],[1,1,1]], // J
    [[0,1,1],[1,1,0]], // S
    [[1,1,0],[0,1,1]]  // Z
];

const SHOOTER_TYPES = [
    { name: 'Basic', color: '#38bdf8', range: 150, cooldown: 1.0, dmg: 10, speed: 200, splash: 0 },
    { name: 'Sniper', color: '#fbbf24', range: 300, cooldown: 2.0, dmg: 30, speed: 400, splash: 0 },
    { name: 'Splash', color: '#ef4444', range: 100, cooldown: 1.5, dmg: 15, speed: 150, splash: 50 },
    { name: 'Rapid', color: '#a855f7', range: 120, cooldown: 0.3, dmg: 4, speed: 250, splash: 0 }
];

const BLOCK_MATERIALS = [
    { name: 'Wood', color: '#854d0e', hp: 50 },
    { name: 'Stone', color: '#475569', hp: 100 },
    { name: 'Iron', color: '#e2e8f0', hp: 200 }
];

// Initialize Grid
function initGrid() {
    gameState.grid = [];
    for (let x = 0; x < GRID_W; x++) {
        gameState.grid[x] = [];
        for (let y = 0; y < GRID_H; y++) {
            gameState.grid[x][y] = null;
        }
    }

    // Place Base (3x3 at bottom center)
    const bx = Math.floor(GRID_W / 2) - 1;
    const by = GRID_H - 3;
    for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
            gameState.grid[bx+x][by+y] = { type: 'base', color: '#10b981' };
        }
    }
}

function rotateMatrix(matrix) {
    const N = matrix.length;
    const M = matrix[0].length;
    let res = [];
    for (let i = 0; i < M; i++) {
        res[i] = [];
        for (let j = 0; j < N; j++) {
            res[i][j] = matrix[N - 1 - j][i];
        }
    }
    return res;
}

// Generate Shop
function generateShop() {
    shopBlocksDiv.innerHTML = '';

    // Generate 5 random blocks
    for(let i=0; i<5; i++) {
        // Pick unlocked shape
        const shapeIdx = persistentState.unlockedShapes[Math.floor(Math.random() * persistentState.unlockedShapes.length)];
        let shapeOrig = SHAPES[shapeIdx];

        // Pick unlocked material
        const matIdx = persistentState.unlockedMaterials[Math.floor(Math.random() * persistentState.unlockedMaterials.length)];
        const material = BLOCK_MATERIALS[matIdx];

        // Pick unlocked weapon (or none, depending on chance)
        let shooterCells = [];

        let validCells = [];
        for (let y = 0; y < shapeOrig.length; y++) {
            for (let x = 0; x < shapeOrig[y].length; x++) {
                if (shapeOrig[y][x]) validCells.push({x, y});
            }
        }

        const maxShooters = Math.min(validCells.length, 1 + persistentState.talents.maxShootersLevel);

        let numShooters = 0;
        const shooterRoll = Math.random();
        if (shooterRoll < 0.10) {
            numShooters = 2;
        } else if (shooterRoll < 0.80) {
            numShooters = 1;
        }

        if (persistentState.talents.maxShootersLevel > 0) {
            for (let s = 0; s < persistentState.talents.maxShootersLevel; s++) {
                if (Math.random() < 0.3) {
                    numShooters++;
                }
            }
        }

        numShooters = Math.min(numShooters, maxShooters);

        if (numShooters > 0) {
            // Assign shooters to random cells
            for (let s = 0; s < numShooters && validCells.length > 0; s++) {
                const cellIdx = Math.floor(Math.random() * validCells.length);
                const cell = validCells[cellIdx];

                const shooterIdx = persistentState.unlockedShooters[Math.floor(Math.random() * persistentState.unlockedShooters.length)];
                const shooter = SHOOTER_TYPES[shooterIdx];

                shooterCells.push({ x: cell.x, y: cell.y, shooter: shooter });
                validCells.splice(cellIdx, 1);
            }
        }

        // Apply random unlocked rotation state
        const maxRots = persistentState.unlockedRotations[shapeIdx] || 0;
        const rotState = maxRots > 0 ? Math.floor(Math.random() * (maxRots + 1)) : 0;

        let newShape = shapeOrig;
        let newCells = shooterCells.map(c => ({...c}));

        for (let r = 0; r < rotState; r++) {
            const origH = newShape.length;
            newShape = rotateMatrix(newShape);
            newCells = newCells.map(c => {
                return { x: origH - 1 - c.y, y: c.x, shooter: c.shooter };
            });
        }

        const blockData = {
            shapeIdx: shapeIdx,
            shapeOrig: newShape,
            shape: newShape,
            shooterCells: newCells,
            currentShooterCells: newCells,
            material: material,
            color: material.color,
            rot: rotState
        };

        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-block-item';
        if (gameState.materials < gameState.shopCost) itemDiv.classList.add('disabled');

        const c = document.createElement('canvas');
        c.width = 80;
        c.height = 80;
        c.className = 'shop-block-canvas';
        drawMiniBlock(c, blockData);

        const label = document.createElement('span');
        label.style.fontSize = '0.8rem';

        let labelText = material.name;
        if (shooterCells.length > 0) {
            const shooterNames = [...new Set(shooterCells.map(sc => sc.shooter.name))];
            labelText += ' + ' + shooterNames.join(', ');
        }
        label.textContent = labelText;

        itemDiv.appendChild(c);
        itemDiv.appendChild(label);

        itemDiv.addEventListener('click', () => {
            if (gameState.materials >= gameState.shopCost) {
                gameState.selectedShopItem = { ...blockData };
            }
        });

        shopBlocksDiv.appendChild(itemDiv);
    }
}

function drawMiniBlock(canvas, data) {
    const cx = canvas.getContext('2d');
    const cs = 15;
    const shape = data.shape; // Draw the rotated shape in shop

    const w = shape[0].length * cs;
    const h = shape.length * cs;
    const offsetX = (canvas.width - w) / 2;
    const offsetY = (canvas.height - h) / 2;

    cx.clearRect(0,0, canvas.width, canvas.height);

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                cx.fillStyle = data.color;
                cx.fillRect(offsetX + x*cs, offsetY + y*cs, cs, cs);
                cx.strokeStyle = '#1e293b';
                cx.strokeRect(offsetX + x*cs, offsetY + y*cs, cs, cs);

                // Draw shooter pip if this cell has a shooter
                let shooterCell = data.shooterCells.find(sc => sc.x === x && sc.y === y);
                if (shooterCell && shooterCell.shooter) {
                    cx.fillStyle = shooterCell.shooter.color;
                    cx.beginPath();
                    cx.arc(offsetX + x*cs + cs/2, offsetY + y*cs + cs/2, cs/3, 0, Math.PI*2);
                    cx.fill();
                }
            }
        }
    }
}

function updateUI() {
    baseHpSpan.textContent = Math.max(0, Math.floor(gameState.baseHp));
    waveNumSpan.textContent = gameState.wave;
    materialsCountSpan.textContent = gameState.materials;
    coinsCountSpan.textContent = gameState.coins;
    shopCostSpan.textContent = gameState.shopCost;

    document.querySelectorAll('.shop-block-item').forEach(el => {
        if (gameState.materials < gameState.shopCost) el.classList.add('disabled');
        else el.classList.remove('disabled');
    });

    persistentCoinsCountSpan.textContent = persistentState.coins;
    talentsCoinsDisplay.textContent = persistentState.coins;

    if (persistentState.talents.gameSpeedLevel > 0) {
        btnSpeedToggle.classList.remove('hidden');
        btnSpeedToggle.textContent = `Speed: ${gameState.speedMultiplier}x`;
    } else {
        btnSpeedToggle.classList.add('hidden');
    }

    renderTalents();
}

// Helper to check if a shape is unlocked
function isShapeUnlocked(idx) {
    return persistentState.unlockedShapes.includes(idx);
}

// Helper to check if a shooter is unlocked
function isShooterUnlocked(idx) {
    return persistentState.unlockedShooters.includes(idx);
}

// Helper to check if material is unlocked
function isMaterialUnlocked(idx) {
    return persistentState.unlockedMaterials.includes(idx);
}

const TALENT_TREE = [
    // --- Stats Branch (Center) ---
    { id: 'hp1', x: 400, y: 50, icon: '🧱', title: 'Block HP', desc: 'Increases base HP of blocks.', cost: 20, isPurchased: () => persistentState.talents.blockHpLevel > 0, onBuy: () => persistentState.talents.blockHpLevel++, reqs: [] },
    { id: 'hp2', x: 400, y: 150, icon: '🧱', title: 'Block HP II', desc: 'Further increases base HP.', cost: 30, isPurchased: () => persistentState.talents.blockHpLevel > 1, onBuy: () => persistentState.talents.blockHpLevel++, reqs: ['hp1'] },

    { id: 'dmg1', x: 500, y: 50, icon: '⚔️', title: 'Damage', desc: 'Increases shooter damage.', cost: 50, isPurchased: () => persistentState.talents.weaponDmgLevel > 0, onBuy: () => persistentState.talents.weaponDmgLevel++, reqs: [] },
    { id: 'dmg2', x: 500, y: 150, icon: '⚔️', title: 'Damage II', desc: 'Further increases damage.', cost: 75, isPurchased: () => persistentState.talents.weaponDmgLevel > 1, onBuy: () => persistentState.talents.weaponDmgLevel++, reqs: ['dmg1'] },

    { id: 'yield1', x: 450, y: 250, icon: '💰', title: 'Yield', desc: 'Higher drop chance for materials/coins.', cost: 100, isPurchased: () => persistentState.talents.yieldLevel > 0, onBuy: () => persistentState.talents.yieldLevel++, reqs: ['hp2', 'dmg2'] },
    { id: 'speed1', x: 450, y: 350, icon: '⏩', title: 'Game Speed', desc: 'Unlocks 2x game speed toggle.', cost: 150, isPurchased: () => persistentState.talents.gameSpeedLevel > 0, onBuy: () => persistentState.talents.gameSpeedLevel++, reqs: ['yield1'] },
    { id: 'speed2', x: 450, y: 450, icon: '⚡', title: 'Game Speed II', desc: 'Unlocks 3x game speed toggle.', cost: 300, isPurchased: () => persistentState.talents.gameSpeedLevel > 1, onBuy: () => persistentState.talents.gameSpeedLevel++, reqs: ['speed1'] },

    // --- Shapes Branch (Left) ---
    { id: 'shapeT', x: 250, y: 50, icon: '🟪', title: 'T-Shape', desc: 'Unlocks the T shape.', cost: 50, isPurchased: () => isShapeUnlocked(2), onBuy: () => persistentState.unlockedShapes.push(2), reqs: [] },
    { id: 'shapeL', x: 150, y: 150, icon: '🟧', title: 'L-Shape', desc: 'Unlocks the L shape.', cost: 50, isPurchased: () => isShapeUnlocked(3), onBuy: () => persistentState.unlockedShapes.push(3), reqs: ['shapeT'] },
    { id: 'shapeJ', x: 350, y: 150, icon: '🟦', title: 'J-Shape', desc: 'Unlocks the J shape.', cost: 50, isPurchased: () => isShapeUnlocked(4), onBuy: () => persistentState.unlockedShapes.push(4), reqs: ['shapeT'] },

    { id: 'shapeS', x: 150, y: 250, icon: '🟩', title: 'S-Shape', desc: 'Unlocks the S shape.', cost: 50, isPurchased: () => isShapeUnlocked(5), onBuy: () => persistentState.unlockedShapes.push(5), reqs: ['shapeL'] },
    { id: 'shapeZ', x: 350, y: 250, icon: '🟥', title: 'Z-Shape', desc: 'Unlocks the Z shape.', cost: 50, isPurchased: () => isShapeUnlocked(6), onBuy: () => persistentState.unlockedShapes.push(6), reqs: ['shapeJ'] },

    { id: 'rot1', x: 250, y: 350, icon: '🔄', title: 'Rotations', desc: 'Shop items can appear rotated.', cost: 100, isPurchased: () => persistentState.unlockedRotations[2] > 0, onBuy: () => {
        // Unlock rotation 1 for all unlocked shapes
        for(let i=1; i<SHAPES.length; i++) persistentState.unlockedRotations[i] = Math.max(persistentState.unlockedRotations[i] || 0, 1);
    }, reqs: ['shapeS', 'shapeZ'] },
    { id: 'rot2', x: 250, y: 450, icon: '🔁', title: 'Full Rotations', desc: 'Shop items can appear fully rotated.', cost: 200, isPurchased: () => persistentState.unlockedRotations[2] > 2, onBuy: () => {
        // Unlock full rotation (3) for all unlocked shapes
        for(let i=1; i<SHAPES.length; i++) persistentState.unlockedRotations[i] = 3;
    }, reqs: ['rot1'] },

    // --- Weapons Branch (Right) ---
    { id: 'matStone', x: 650, y: 50, icon: '🪨', title: 'Stone', desc: 'Blocks can spawn as Stone.', cost: 150, isPurchased: () => isMaterialUnlocked(1), onBuy: () => persistentState.unlockedMaterials.push(1), reqs: [] },

    { id: 'wepSniper', x: 550, y: 150, icon: '🏹', title: 'Sniper', desc: 'Allows Sniper shooters to appear.', cost: 100, isPurchased: () => isShooterUnlocked(1), onBuy: () => persistentState.unlockedShooters.push(1), reqs: ['matStone'] },
    { id: 'wepSplash', x: 750, y: 150, icon: '💣', title: 'Splash', desc: 'Allows Splash shooters to appear.', cost: 200, isPurchased: () => isShooterUnlocked(2), onBuy: () => persistentState.unlockedShooters.push(2), reqs: ['matStone'] },

    { id: 'wepRapid', x: 650, y: 250, icon: '🔫', title: 'Rapid', desc: 'Allows Rapid shooters to appear.', cost: 300, isPurchased: () => isShooterUnlocked(3), onBuy: () => persistentState.unlockedShooters.push(3), reqs: ['wepSniper', 'wepSplash'] },

    { id: 'matIron', x: 650, y: 350, icon: '⚙️', title: 'Iron', desc: 'Blocks can spawn as Iron.', cost: 300, isPurchased: () => isMaterialUnlocked(2), onBuy: () => persistentState.unlockedMaterials.push(2), reqs: ['wepRapid'] },

    { id: 'multi1', x: 650, y: 450, icon: '🎲', title: 'Multi Shooter', desc: 'Blocks can have up to 2 shooters.', cost: 400, isPurchased: () => persistentState.talents.maxShootersLevel > 0, onBuy: () => persistentState.talents.maxShootersLevel++, reqs: ['matIron'] },
    { id: 'multi2', x: 650, y: 550, icon: '🎰', title: 'Multi Shooter II', desc: 'Blocks can have up to 3 shooters.', cost: 600, isPurchased: () => persistentState.talents.maxShootersLevel > 1, onBuy: () => persistentState.talents.maxShootersLevel++, reqs: ['multi1'] }
];

function renderTalents() {
    talentsNodesWrapper.innerHTML = '';

    // Clear existing lines
    while (talentsLines.firstChild) {
        talentsLines.removeChild(talentsLines.firstChild);
    }

    const svgNS = "http://www.w3.org/2000/svg";

    TALENT_TREE.forEach(talent => {
        // Draw lines to requirements
        talent.reqs.forEach(reqId => {
            const req = TALENT_TREE.find(t => t.id === reqId);
            if (req) {
                const line = document.createElementNS(svgNS, 'line');
                line.setAttribute('x1', req.x);
                line.setAttribute('y1', req.y);
                line.setAttribute('x2', talent.x);
                line.setAttribute('y2', talent.y);

                // Color line based on requirement met
                const isReqMet = req.isPurchased();
                line.setAttribute('stroke', isReqMet ? '#4ade80' : '#334155');
                line.setAttribute('stroke-width', '3');
                talentsLines.appendChild(line);
            }
        });

        // Create node
        const isPurchased = talent.isPurchased();
        const reqsMet = talent.reqs.every(reqId => TALENT_TREE.find(t => t.id === reqId).isPurchased());
        const isLocked = !isPurchased && !reqsMet;

        const node = document.createElement('div');
        node.className = `talents-node ${isPurchased ? 'purchased' : ''} ${isLocked ? 'locked' : ''}`;
        node.style.left = `${talent.x}px`;
        node.style.top = `${talent.y}px`;
        node.textContent = talent.icon;

        // Tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'talent-tooltip';

        const h4 = document.createElement('h4');
        h4.textContent = talent.title;
        tooltip.appendChild(h4);

        const p = document.createElement('p');
        p.textContent = talent.desc;
        tooltip.appendChild(p);

        if (!isPurchased) {
            const costSpan = document.createElement('div');
            costSpan.className = 'cost';
            costSpan.textContent = `Cost: ${talent.cost}c`;
            if (persistentState.coins < talent.cost) costSpan.style.color = '#ef4444';
            tooltip.appendChild(costSpan);

            if (isLocked) {
                const lockSpan = document.createElement('div');
                lockSpan.style.color = '#ef4444';
                lockSpan.style.fontSize = '0.8rem';
                lockSpan.style.marginTop = '5px';
                lockSpan.textContent = 'Locked (Requires preceding node)';
                tooltip.appendChild(lockSpan);
            }
        } else {
            const purSpan = document.createElement('div');
            purSpan.style.color = '#4ade80';
            purSpan.style.fontWeight = 'bold';
            purSpan.style.marginTop = '5px';
            purSpan.textContent = 'Purchased';
            tooltip.appendChild(purSpan);
        }

        node.appendChild(tooltip);

        // Click handler
        if (!isPurchased && reqsMet) {
            node.addEventListener('click', () => {
                if (persistentState.coins >= talent.cost) {
                    persistentState.coins -= talent.cost;
                    talent.onBuy();
                    savePersistentState();
                    updateUI();
                }
            });
        }

        talentsNodesWrapper.appendChild(node);
    });
}

// Wave Logic
function startWave() {
    gameState.waveActive = true;

    // Less enemies early on
    gameState.enemiesToSpawn = 3 + Math.floor(gameState.wave * 1.5);

    // Boss wave every 10 levels
    if (gameState.wave % 10 === 0) {
        gameState.enemiesToSpawn += 1; // 1 big boss plus the additional standard enemies
        gameState.bossSpawned = false; // Track if we've spawned the boss yet
    }

    gameState.enemySpawnTimer = 0;
}

function spawnEnemy() {
    let isBoss = false;

    // Spawn exactly one boss per boss wave, usually as the first enemy
    if (gameState.wave % 10 === 0 && !gameState.bossSpawned) {
        isBoss = true;
        gameState.bossSpawned = true;
    }

    const isFlying = !isBoss && Math.random() < 0.2; // Bosses don't fly

    // Softer HP scaling for early game
    let hp = 10 + (gameState.wave * 10);

    if (isBoss) {
        hp = hp * 5; // Boss has 5x health
    }

    const speed = isBoss ? 15 : (isFlying ? 40 : 25);

    // Ground enemies spawn bottom left/right and move to center
    // Flying enemies spawn top and move down to center

    let x, y, vx, vy;
    const targetX = canvas.width / 2;
    const targetY = canvas.height - (3 * CELL_SIZE);

    if (isFlying) {
        x = Math.random() * canvas.width;
        y = -20;
        const angle = Math.atan2(targetY - y, targetX - x);
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
    } else {
        x = Math.random() < 0.5 ? -20 : canvas.width + 20;
        y = canvas.height - (isBoss ? 20 : 12); // Walk strictly on the bottom floor
        vx = x < targetX ? speed : -speed; // Move directly horizontally
        vy = 0;
    }

    gameState.enemies.push({
        x, y, vx, vy, hp, maxHp: hp, isFlying, isBoss, targetX, targetY,
        radius: isBoss ? 24 : (isFlying ? 8 : 12),
        color: isBoss ? '#991b1b' : (isFlying ? '#c084fc' : '#f43f5e')
    });
}

function takeDamage(amt) {
    gameState.baseHp -= amt;
    if (gameState.baseHp <= 0) {
        gameState.baseHp = 0;
        gameState.gameOver = true;
        finalWaveSpan.textContent = gameState.wave;
        earnedCoinsSpan.textContent = gameState.coins;
        gameOverScreen.classList.remove('hidden');
    }
    updateUI();
}

// Main Loop
function update(dt) {
    if (gameState.gameOver) return;
    if (!gameState.grid || gameState.grid.length === 0) return;

    // Wave Management (only if game has started properly)
    if (gameState.waveActive) {
        if (gameState.enemiesToSpawn > 0) {
            gameState.enemySpawnTimer -= dt;
            if (gameState.enemySpawnTimer <= 0) {
                spawnEnemy();
                gameState.enemiesToSpawn--;
                gameState.enemySpawnTimer = 1.0 - Math.min(0.8, gameState.wave * 0.05); // faster spawn
            }
        } else if (gameState.enemies.length === 0) {
            // Wave Complete
            gameState.waveActive = false;
            gameState.wave++;
            gameState.waveDelayTimer = 5.0; // 5 sec between waves
            updateUI();
        }
    } else {
        gameState.waveDelayTimer -= dt;
        if (gameState.waveDelayTimer <= 0) {
            startWave();
        }
    }

    // Enemies
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        let e = gameState.enemies[i];

        let moveX = e.vx * dt;
        let moveY = e.vy * dt;

        // Predict next position to check for block collisions
        let nextX = e.x + moveX;
        let nextY = e.y + moveY;

        // Convert to grid coordinates
        let gx = Math.floor(nextX / CELL_SIZE);
        let gy = Math.floor(nextY / CELL_SIZE);

        let blocked = false;

        // Check grid only if it's initialized
        let gridReady = gameState.grid && gameState.grid.length > 0;

        // Check collision for all enemies (flying no longer bypasses blocks)
        if (gridReady && gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H) {
            let block = gameState.grid[gx][gy];
            if (block) {
                blocked = true;

                if (block.type === 'base') {
                    // Instantly damage base and remove enemy
                    takeDamage(10);
                    gameState.enemies.splice(i, 1);
                    continue;
                } else if (block.type === 'tower') {
                    // Attack the block
                    if (!e.attackCooldown) e.attackCooldown = 0;
                    e.attackCooldown -= dt;

                    if (e.attackCooldown <= 0) {
                        block.hp -= 10; // base enemy damage to blocks
                        e.attackCooldown = 1.0; // 1 sec attack rate

                        // Visual feedback
                        createExplosion(e.x, e.y, 5, '#cbd5e1'); // Dust particle

                        if (block.hp <= 0) {
                            gameState.grid[gx][gy] = null; // Destroy block
                            createExplosion(gx * CELL_SIZE + CELL_SIZE/2, gy * CELL_SIZE + CELL_SIZE/2, 15, block.color);
                        }
                    }
                }
            }
        }

        if (!blocked) {
            e.x = nextX;
            e.y = nextY;
        }

        // Check if flying enemy reached base or ground enemy somehow clipped past
        const dist = Math.hypot(e.targetX - e.x, e.targetY - e.y);
        if (dist < 30) {
            takeDamage(10);
            gameState.enemies.splice(i, 1);
            continue;
        }

        // Failsafe: remove enemies that go way out of bounds
        if (e.y > canvas.height + 100 || e.x < -100 || e.x > canvas.width + 100) {
            gameState.enemies.splice(i, 1);
            continue;
        }
    }

    // Towers Shoot
    const speedMult = 1.0;
    for (let x = 0; x < GRID_W; x++) {
        for (let y = 0; y < GRID_H; y++) {
            const block = gameState.grid[x][y];
            if (block && block.shooter) {
                if (!block.cooldownTimer) block.cooldownTimer = 0;
                block.cooldownTimer -= dt * speedMult;

                if (block.cooldownTimer <= 0 && gameState.enemies.length > 0) {
                    // Find target
                    const cx = x * CELL_SIZE + CELL_SIZE/2;
                    const cy = y * CELL_SIZE + CELL_SIZE/2;
                    let target = null;
                    let minDist = block.shooter.range;

                    for (let e of gameState.enemies) {
                        const dist = Math.hypot(e.x - cx, e.y - cy);
                        if (dist < minDist) {
                            minDist = dist;
                            target = e;
                        }
                    }

                    if (target) {
                        block.cooldownTimer = block.shooter.cooldown;
                        const angle = Math.atan2(target.y - cy, target.x - cx);
                        gameState.projectiles.push({
                            x: cx, y: cy,
                            vx: Math.cos(angle) * block.shooter.speed,
                            vy: Math.sin(angle) * block.shooter.speed,
                            dmg: block.shooter.dmg + (persistentState.talents.weaponDmgLevel * 2),
                            splash: block.shooter.splash,
                            color: block.shooter.color,
                            targetId: target // rudimentary tracking
                        });
                    }
                }
            }
        }
    }

    // Projectiles
    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
        let p = gameState.projectiles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Collision with enemies
        let hit = false;
        for (let j = gameState.enemies.length - 1; j >= 0; j--) {
            let e = gameState.enemies[j];
            if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + 5) {
                hit = true;

                // Damage
                if (p.splash > 0) {
                    // Area damage
                    createExplosion(p.x, p.y, p.splash, p.color);
                    for (let k = gameState.enemies.length - 1; k >= 0; k--) {
                        let se = gameState.enemies[k];
                        if (Math.hypot(se.x - p.x, se.y - p.y) < p.splash) {
                            damageEnemy(k, p.dmg);
                        }
                    }
                } else {
                    // Single target
                    damageEnemy(j, p.dmg);
                }
                break;
            }
        }

        if (hit || p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
            gameState.projectiles.splice(i, 1);
        }
    }

    // Particles
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        let p = gameState.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
            gameState.particles.splice(i, 1);
        } else {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.alpha = p.life / p.maxLife;
        }
    }
}

function damageEnemy(index, amt) {
    if (index < 0 || index >= gameState.enemies.length) return;
    let e = gameState.enemies[index];
    e.hp -= amt;
    if (e.hp <= 0) {
        // Die
        const yieldBonus = persistentState.talents.yieldLevel * 0.1; // +10% per level

        if (e.isBoss) {
            // Bosses drop huge rewards
            gameState.materials += Math.floor(10 + yieldBonus * 20);
            gameState.coins += Math.floor(5 + yieldBonus * 10);
        } else {
            // Guaranteed material drops so player can build at least one block per wave
            gameState.materials += 1 + Math.floor(Math.random() * 2); // 1-2 materials
            if (Math.random() < yieldBonus) gameState.materials += 1;

            if (Math.random() < (0.4 + yieldBonus)) gameState.coins += 1;
        }

        updateUI();
        gameState.enemies.splice(index, 1);
    }
}

function createExplosion(x, y, radius, color) {
    for(let i=0; i<10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 50 + 20;
        gameState.particles.push({
            x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
            life: 0.3, maxLife: 0.3, color: color, size: 3
        });
    }
}

function draw() {
    // Clear
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (subtle)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= canvas.width; i += CELL_SIZE) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i <= canvas.height; i += CELL_SIZE) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    if (!gameState.grid || gameState.grid.length === 0) return;

    // Draw Placed Blocks
    for (let x = 0; x < GRID_W; x++) {
        for (let y = 0; y < GRID_H; y++) {
            const block = gameState.grid[x][y];
            if (block) {
                if (block.type === 'base') {
                    ctx.fillStyle = block.color;
                    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    ctx.strokeStyle = '#000';
                    ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                } else if (block.type === 'tower') {
                    ctx.fillStyle = block.color;
                    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    ctx.strokeStyle = '#000';
                    ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

                    if (block.shooter) {
                        ctx.fillStyle = block.shooter.color;
                        ctx.beginPath();
                        ctx.arc(x * CELL_SIZE + CELL_SIZE/2, y * CELL_SIZE + CELL_SIZE/2, CELL_SIZE/3, 0, Math.PI*2);
                        ctx.fill();
                    }

                    // Draw HP bar for damaged blocks
                    if (block.hp < block.material.hp + (persistentState.talents.blockHpLevel * 10)) {
                        const maxHp = block.material.hp + (persistentState.talents.blockHpLevel * 10);
                        ctx.fillStyle = '#ef4444';
                        ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, 4);
                        ctx.fillStyle = '#22c55e';
                        ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, (CELL_SIZE - 4) * (block.hp / maxHp), 4);
                    }
                }
            }
        }
    }

    // Draw Selected Item Shadow (Mouse tracking happens via events, but we draw here)
    if (gameState.selectedShopItem && mouseGridX !== null) {
        const item = gameState.selectedShopItem;
        const shape = item.shape;
        let valid = canPlace(shape, mouseGridX, mouseGridY);
        let shooterCells = item.currentShooterCells || item.shooterCells;

        ctx.globalAlpha = 0.5;
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    ctx.fillStyle = valid ? '#4ade80' : '#f87171'; // Green or Red
                    ctx.fillRect((mouseGridX + x) * CELL_SIZE, (mouseGridY + y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);

                    let shooterCell = shooterCells.find(c => c.x === x && c.y === y);
                    if (shooterCell && shooterCell.shooter) {
                        ctx.fillStyle = shooterCell.shooter.color;
                        ctx.beginPath();
                        ctx.arc((mouseGridX + x) * CELL_SIZE + CELL_SIZE/2, (mouseGridY + y) * CELL_SIZE + CELL_SIZE/2, CELL_SIZE/3, 0, Math.PI*2);
                        ctx.fill();
                    }
                }
            }
        }
        ctx.globalAlpha = 1.0;
    }

    // Draw Enemies
    for (let e of gameState.enemies) {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        if (e.isFlying) {
            ctx.moveTo(e.x, e.y - e.radius);
            ctx.lineTo(e.x - e.radius, e.y + e.radius);
            ctx.lineTo(e.x + e.radius, e.y + e.radius);
        } else {
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI*2);
        }
        ctx.fill();

        // HP bar
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(e.x - 10, e.y - e.radius - 8, 20, 4);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(e.x - 10, e.y - e.radius - 8, 20 * (e.hp/e.maxHp), 4);
    }

    // Draw Projectiles
    for (let p of gameState.projectiles) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
        ctx.fill();
    }

    // Particles
    for (let p of gameState.particles) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
}

// Input Handling
let mouseGridX = null;
let mouseGridY = null;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    mouseGridX = Math.floor(mx / CELL_SIZE);
    mouseGridY = Math.floor(my / CELL_SIZE);
});

canvas.addEventListener('mouseleave', () => {
    mouseGridX = null;
    mouseGridY = null;
});

canvas.addEventListener('click', () => {
    if (gameState.selectedShopItem && mouseGridX !== null) {
        placeBlock();
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

function canPlace(shape, gx, gy) {
    // Check bounds
    if (gx < 0 || gy < 0 || gx + shape[0].length > GRID_W || gy + shape.length > GRID_H) return false;

    // Check overlap
    let supported = false;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const cx = gx + x;
                const cy = gy + y;
                if (gameState.grid[cx][cy] !== null) return false; // Overlap

                // Check placement rule: must have a block directly underneath
                // meaning the space (cy+1) must be occupied by an existing block/base,
                // or it must be placed directly on the floor (GRID_H - 1).
                if (!supported) {
                    if (cy === GRID_H - 1 || (cy < GRID_H - 1 && gameState.grid[cx][cy + 1])) {
                        supported = true;
                    }
                }
            }
        }
    }
    return supported;
}

function placeBlock() {
    const item = gameState.selectedShopItem;
    const shape = item.shape;
    if (canPlace(shape, mouseGridX, mouseGridY)) {
        // Pay cost
        gameState.materials -= gameState.shopCost;

        // Increase cost
        gameState.shopCost += 5;

        // Ensure we have currentShooterCells calculated (if not rotated yet, it's the original)
        let shooterCells = item.currentShooterCells || item.shooterCells;

        // Place
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    let isShooterCell = shooterCells.some(c => c.x === x && c.y === y);

                    gameState.grid[mouseGridX + x][mouseGridY + y] = {
                        type: 'tower',
                        color: item.color,
                        material: item.material,
                        hp: item.material.hp + (persistentState.talents.blockHpLevel * 10),
                        shooter: isShooterCell ? item.shooter : null,
                        cooldownTimer: 0
                    };
                }
            }
        }

        // Generate new shop
        gameState.selectedShopItem = null;
        generateShop();
        updateUI();
    }
}

btnSpeedToggle.addEventListener('click', () => {
    const maxSpeed = 1 + persistentState.talents.gameSpeedLevel;
    gameState.speedMultiplier += 1;
    if (gameState.speedMultiplier > maxSpeed) {
        gameState.speedMultiplier = 1;
    }
    updateUI();
});

btnNextWave.addEventListener('click', () => {
    if (!gameState.waveActive && gameState.waveDelayTimer > 0) {
        // Bonus for early call
        gameState.coins += Math.floor(gameState.waveDelayTimer);
        gameState.waveDelayTimer = 0; // Starts immediately
        updateUI();
    }
});

btnStartRun.addEventListener('click', () => {
    mainMenuScreen.classList.add('hidden');
    menuStatsBar.style.display = 'none';
    gameScreen.classList.remove('hidden');
    gameStatsBar.style.display = 'flex';

    // Reset game state for new run
    gameState.baseHp = gameState.maxBaseHp;
    gameState.wave = 1;
    gameState.materials = 20;
    gameState.coins = 0;
    gameState.shopCost = 10;
    gameState.enemies = [];
    gameState.projectiles = [];
    gameState.particles = [];
    gameState.waveActive = false;
    gameState.gameOver = false;
    gameState.waveDelayTimer = 5.0;
    gameState.speedMultiplier = 1;

    initGrid();
    generateShop();
    updateUI();
});

btnOpenTalents.addEventListener('click', () => {
    mainMenuScreen.classList.add('hidden');
    menuStatsBar.style.display = 'none';
    talentsScreen.classList.remove('hidden');
    updateUI();
});

btnCloseTalents.addEventListener('click', () => {
    talentsScreen.classList.add('hidden');
    mainMenuScreen.classList.remove('hidden');
    menuStatsBar.style.display = 'flex';
    updateUI();
});

btnReturnMenu.addEventListener('click', () => {
    // Save coins
    persistentState.coins += gameState.coins;
    savePersistentState();
    gameState.coins = 0;

    gameOverScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    gameStatsBar.style.display = 'none';
    mainMenuScreen.classList.remove('hidden');
    menuStatsBar.style.display = 'flex';
    updateUI();
});

// Main Loop Wrapper
function loop(timestamp) {
    let dt = (timestamp - gameState.lastTime) / 1000 || 0;
    gameState.lastTime = timestamp;

    if (gameState.speedMultiplier > 1) {
        dt *= gameState.speedMultiplier;
    }

    update(dt);
    draw();

    requestAnimationFrame(loop);
}

// Init
loadPersistentState();
updateUI();
requestAnimationFrame(loop);