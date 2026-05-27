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

const btnRotate = document.getElementById('btn-rotate');
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
    gameOver: false
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
        yieldLevel: 0 // resource gain bonus
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

    // Generate 3 random blocks
    for(let i=0; i<3; i++) {
        // Pick unlocked shape
        const shapeIdx = persistentState.unlockedShapes[Math.floor(Math.random() * persistentState.unlockedShapes.length)];
        const shapeOrig = SHAPES[shapeIdx];

        // Pick unlocked material
        const matIdx = persistentState.unlockedMaterials[Math.floor(Math.random() * persistentState.unlockedMaterials.length)];
        const material = BLOCK_MATERIALS[matIdx];

        // Pick unlocked weapon (or none, depending on chance)
        let shooter = null;
        let shooterCells = [];
        const shooterRoll = Math.random();

        let numShooters = 0;
        if (shooterRoll < 0.10) {
            numShooters = 2; // 10% chance for 2 shooters
        } else if (shooterRoll < 0.80) {
            numShooters = 1; // 70% chance for 1 shooter
        } // else 20% chance for 0 shooters

        if (numShooters > 0) {
            const shooterIdx = persistentState.unlockedShooters[Math.floor(Math.random() * persistentState.unlockedShooters.length)];
            shooter = SHOOTER_TYPES[shooterIdx];

            // Find valid cell positions
            let validCells = [];
            for (let y = 0; y < shapeOrig.length; y++) {
                for (let x = 0; x < shapeOrig[y].length; x++) {
                    if (shapeOrig[y][x]) validCells.push({x, y});
                }
            }

            // Assign shooters to random cells
            for (let s = 0; s < numShooters && validCells.length > 0; s++) {
                const cellIdx = Math.floor(Math.random() * validCells.length);
                shooterCells.push(validCells[cellIdx]);
                validCells.splice(cellIdx, 1);
            }
        }

        const blockData = {
            shapeIdx: shapeIdx,
            shapeOrig: shapeOrig,
            shooter: shooter,
            shooterCells: shooterCells,
            material: material,
            color: material.color
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
        label.textContent = material.name + (shooter ? ` + ${shooter.name}` : '');

        itemDiv.appendChild(c);
        itemDiv.appendChild(label);

        itemDiv.addEventListener('click', () => {
            if (gameState.materials >= gameState.shopCost) {
                // When we hold it, we reset rotation to 0
                gameState.selectedShopItem = { ...blockData, shape: blockData.shapeOrig, rot: 0 };
            }
        });

        shopBlocksDiv.appendChild(itemDiv);
    }
}

function drawMiniBlock(canvas, data) {
    const cx = canvas.getContext('2d');
    const cs = 15;
    const shape = data.shapeOrig; // Draw the unrotated original shape in shop

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
                let hasShooter = data.shooterCells.some(sc => sc.x === x && sc.y === y);
                if (hasShooter && data.shooter) {
                    cx.fillStyle = data.shooter.color;
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

    renderTalents();
}

function renderTalents() {
    talentsGrid.innerHTML = '';

    // Abstracted helper to create a talent card
    const createCard = (title, desc, cost, isPurchased, onBuy) => {
        const div = document.createElement('div');
        div.className = `talent-card ${isPurchased ? 'purchased' : ''}`;

        const h4 = document.createElement('h4');
        h4.textContent = title;

        const p = document.createElement('p');
        p.textContent = desc;

        div.appendChild(h4);
        div.appendChild(p);

        if (!isPurchased) {
            const btn = document.createElement('button');
            btn.className = 'action-btn small';
            btn.textContent = `Buy (${cost}c)`;
            btn.disabled = persistentState.coins < cost;
            btn.onclick = () => {
                if (persistentState.coins >= cost) {
                    persistentState.coins -= cost;
                    onBuy();
                    savePersistentState();
                    updateUI();
                }
            };
            div.appendChild(btn);
        } else {
            const span = document.createElement('span');
            span.style.color = '#22c55e';
            span.textContent = 'Purchased';
            div.appendChild(span);
        }

        talentsGrid.appendChild(div);
    };

    // 1. Shapes & Rotations
    const SHAPE_NAMES = ['O', 'I', 'T', 'L', 'J', 'S', 'Z'];
    for (let i = 2; i < SHAPES.length; i++) { // O (0) and I (1) unlocked by default
        const isUnlocked = persistentState.unlockedShapes.includes(i);
        createCard(
            `Unlock ${SHAPE_NAMES[i]} Shape`,
            `Adds the ${SHAPE_NAMES[i]} shape to the shop`,
            50,
            isUnlocked,
            () => persistentState.unlockedShapes.push(i)
        );
    }

    // Rotations (available for unlocked shapes)
    for (let i of persistentState.unlockedShapes) {
        if (i === 0) continue; // O shape doesn't need rotation
        const currentRots = persistentState.unlockedRotations[i] || 0;
        if (currentRots < 3) {
            createCard(
                `${SHAPE_NAMES[i]} Rotation +1`,
                `Unlock rotation state ${currentRots + 1} for ${SHAPE_NAMES[i]}`,
                30 + (currentRots * 20),
                false,
                () => persistentState.unlockedRotations[i] = (persistentState.unlockedRotations[i] || 0) + 1
            );
        }
    }

    // 2. Weapons
    for (let i = 1; i < SHOOTER_TYPES.length; i++) {
        const isUnlocked = persistentState.unlockedShooters.includes(i);
        createCard(
            `Unlock ${SHOOTER_TYPES[i].name}`,
            `Allows ${SHOOTER_TYPES[i].name} shooters to appear`,
            100 * i,
            isUnlocked,
            () => persistentState.unlockedShooters.push(i)
        );
    }

    // 3. Materials
    for (let i = 1; i < BLOCK_MATERIALS.length; i++) {
        const isUnlocked = persistentState.unlockedMaterials.includes(i);
        createCard(
            `Unlock ${BLOCK_MATERIALS[i].name}`,
            `Blocks can spawn as ${BLOCK_MATERIALS[i].name} (More HP)`,
            150 * i,
            isUnlocked,
            () => persistentState.unlockedMaterials.push(i)
        );
    }

    // 4. Stats
    const hpLvl = persistentState.talents.blockHpLevel;
    if (hpLvl < 10) {
        createCard(
            `Block HP +10 (Lvl ${hpLvl})`,
            `Increases base HP of all placed blocks.`,
            20 + (hpLvl * 10),
            false,
            () => persistentState.talents.blockHpLevel++
        );
    }

    const dmgLvl = persistentState.talents.weaponDmgLevel;
    if (dmgLvl < 10) {
        createCard(
            `Weapon Dmg +2 (Lvl ${dmgLvl})`,
            `Increases damage of all shooters.`,
            50 + (dmgLvl * 25),
            false,
            () => persistentState.talents.weaponDmgLevel++
        );
    }

    const yieldLvl = persistentState.talents.yieldLevel;
    if (yieldLvl < 5) {
        createCard(
            `Resource Yield (Lvl ${yieldLvl})`,
            `Enemies have higher chance to drop materials and coins.`,
            100 + (yieldLvl * 100),
            false,
            () => persistentState.talents.yieldLevel++
        );
    }
}

// Wave Logic
function startWave() {
    gameState.waveActive = true;
    gameState.enemiesToSpawn = 5 + Math.floor(gameState.wave * 2.5);
    gameState.enemySpawnTimer = 0;
}

function spawnEnemy() {
    const isFlying = Math.random() < 0.2; // They can spawn on wave 1 now
    const hp = 20 + (gameState.wave * 15);
    const speed = isFlying ? 40 : 25;

    // Ground enemies spawn bottom left/right and move to center
    // Flying enemies spawn top and move down to center

    let x, y, vx, vy;
    const targetX = canvas.width / 2;
    const targetY = canvas.height - (3 * CELL_SIZE);

    if (isFlying) {
        x = Math.random() * canvas.width;
        y = -20;
    } else {
        x = Math.random() < 0.5 ? -20 : canvas.width + 20;
        y = canvas.height - 10;
    }

    const angle = Math.atan2(targetY - y, targetX - x);
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;

    gameState.enemies.push({
        x, y, vx, vy, hp, maxHp: hp, isFlying, targetX, targetY,
        radius: isFlying ? 8 : 12,
        color: isFlying ? '#c084fc' : '#f43f5e'
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

    // Wave Management (only if game has started properly)
    if (gameState.grid && gameState.grid.length > 0) {
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
                // Increase shop cost slightly every few waves
                if (gameState.wave % 3 === 0) gameState.shopCost += 5;
                updateUI();
            }
        } else {
            gameState.waveDelayTimer -= dt;
            if (gameState.waveDelayTimer <= 0) {
                startWave();
            }
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

        // Flying enemies bypass blocks
        if (!e.isFlying && gridReady && gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H) {
            let block = gameState.grid[gx][gy];
            if (block && block.type === 'tower') {
                blocked = true;

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

        if (!blocked) {
            e.x = nextX;
            e.y = nextY;
        }

        // Check if reached base
        const dist = Math.hypot(e.targetX - e.x, e.targetY - e.y);
        if (dist < 30) {
            takeDamage(10);
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
        if (Math.random() < (0.5 + yieldBonus)) gameState.materials += 1;
        if (Math.random() < (0.3 + yieldBonus)) gameState.coins += 1;
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

    // Draw Placed Blocks
    for (let x = 0; x < GRID_W; x++) {
        for (let y = 0; y < GRID_H; y++) {
            const block = gameState.grid[x][y];
            if (block) {
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
                if (block.type === 'tower' && block.hp < block.material.hp + (persistentState.talents.blockHpLevel * 10)) {
                    const maxHp = block.material.hp + (persistentState.talents.blockHpLevel * 10);
                    ctx.fillStyle = '#ef4444';
                    ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, 4);
                    ctx.fillStyle = '#22c55e';
                    ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, (CELL_SIZE - 4) * (block.hp / maxHp), 4);
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

                    let isShooterCell = shooterCells.some(c => c.x === x && c.y === y);
                    if (isShooterCell && item.shooter) {
                        ctx.fillStyle = item.shooter.color;
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
    if (gameState.selectedShopItem) {
        rotateSelectedBlock();
    }
});

btnRotate.addEventListener('click', () => {
    if (gameState.selectedShopItem) rotateSelectedBlock();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        if (gameState.selectedShopItem) rotateSelectedBlock();
    }
});

function rotateSelectedBlock() {
    const item = gameState.selectedShopItem;
    const maxRots = persistentState.unlockedRotations[item.shapeIdx] || 0;

    // Calculate how many times it has been rotated from the original shape
    // item.rot stores the current rotation state (0, 1, 2, 3)
    if (maxRots === 0) return; // Cannot rotate

    item.rot = (item.rot + 1) % 4;
    if (item.rot > maxRots) {
        item.rot = 0; // Reset to original if we exceed unlocked rotations
    }

    // Re-apply rotations from original shape based on new item.rot
    let newShape = item.shapeOrig;
    let newCells = item.shooterCells.map(c => ({...c}));

    for (let r = 0; r < item.rot; r++) {
        // We also need to rotate the coordinates of the shooters
        // rotateMatrix rotates clockwise: newX = origH - 1 - origY, newY = origX
        const origH = newShape.length;
        newShape = rotateMatrix(newShape);
        newCells = newCells.map(c => {
            return { x: origH - 1 - c.y, y: c.x };
        });
    }

    item.shape = newShape;
    item.currentShooterCells = newCells;
}

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
                // meaning the space (cy+1) must be occupied by an existing block/base.
                if (!supported) {
                    if (cy < GRID_H - 1 && gameState.grid[cx][cy + 1]) {
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
    const dt = (timestamp - gameState.lastTime) / 1000 || 0;
    gameState.lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(loop);
}

// Init
loadPersistentState();
updateUI();
requestAnimationFrame(loop);