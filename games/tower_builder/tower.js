// DOM Elements
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const baseHpSpan = document.getElementById('base-hp');
const waveNumSpan = document.getElementById('wave-num');
const materialsCountSpan = document.getElementById('materials-count');
const coinsCountSpan = document.getElementById('coins-count');
const shopCostSpan = document.getElementById('shop-cost');
const shopBlocksDiv = document.getElementById('shop-blocks');

const btnRotate = document.getElementById('btn-rotate');
const btnNextWave = document.getElementById('btn-next-wave');
const gameOverScreen = document.getElementById('game-over-screen');
const finalWaveSpan = document.getElementById('final-wave');
const btnRestart = document.getElementById('btn-restart');

const btnUpgDmg = document.getElementById('btn-upg-dmg');
const btnUpgSpeed = document.getElementById('btn-upg-speed');
const btnUpgHp = document.getElementById('btn-upg-hp');
const costDmgSpan = document.getElementById('cost-dmg');
const costSpeedSpan = document.getElementById('cost-speed');
const costHpSpan = document.getElementById('cost-hp');

// Constants
const CELL_SIZE = 30;
const GRID_W = canvas.width / CELL_SIZE; // 20
const GRID_H = canvas.height / CELL_SIZE; // 20

// Game State
let gameState = {
    baseHp: 100,
    maxBaseHp: 100,
    wave: 1,
    materials: 20, // start with some to buy first block
    coins: 0,
    shopCost: 10,

    talents: {
        dmgBonus: 0,
        speedBonus: 0,
        costDmg: 10,
        costSpeed: 15,
        costHp: 20
    },

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
        const shapeIdx = Math.floor(Math.random() * SHAPES.length);
        const shooterIdx = Math.floor(Math.random() * SHOOTER_TYPES.length);

        const blockData = {
            shapeOrig: SHAPES[shapeIdx],
            shooter: SHOOTER_TYPES[shooterIdx],
            color: '#475569' // base wood/stone color
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
        label.textContent = blockData.shooter.name + ' Shooter';

        itemDiv.appendChild(c);
        itemDiv.appendChild(label);

        itemDiv.addEventListener('click', () => {
            if (gameState.materials >= gameState.shopCost) {
                gameState.selectedShopItem = { ...blockData, shape: blockData.shapeOrig, rot: 0 };
                // Highlight selection could be added here
            }
        });

        shopBlocksDiv.appendChild(itemDiv);
    }
}

function drawMiniBlock(canvas, data) {
    const cx = canvas.getContext('2d');
    const cs = 15;
    const shape = data.shapeOrig;

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

                // Draw shooter pip in center of block
                cx.fillStyle = data.shooter.color;
                cx.beginPath();
                cx.arc(offsetX + x*cs + cs/2, offsetY + y*cs + cs/2, cs/3, 0, Math.PI*2);
                cx.fill();
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

    costDmgSpan.textContent = gameState.talents.costDmg;
    costSpeedSpan.textContent = gameState.talents.costSpeed;
    costHpSpan.textContent = gameState.talents.costHp;

    btnUpgDmg.disabled = gameState.coins < gameState.talents.costDmg;
    btnUpgSpeed.disabled = gameState.coins < gameState.talents.costSpeed;
    btnUpgHp.disabled = gameState.coins < gameState.talents.costHp;
}

// Wave Logic
function startWave() {
    gameState.waveActive = true;
    gameState.enemiesToSpawn = 5 + Math.floor(gameState.wave * 2.5);
    gameState.enemySpawnTimer = 0;
}

function spawnEnemy() {
    const isFlying = Math.random() < 0.2 && gameState.wave > 2;
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
        gameOverScreen.classList.remove('hidden');
    }
    updateUI();
}

// Main Loop
function update(dt) {
    if (gameState.gameOver) return;

    // Wave Management
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

    // Enemies
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        let e = gameState.enemies[i];
        e.x += e.vx * dt;
        e.y += e.vy * dt;

        // Check if reached base
        const dist = Math.hypot(e.targetX - e.x, e.targetY - e.y);
        if (dist < 30) {
            takeDamage(10);
            gameState.enemies.splice(i, 1);
            continue;
        }
    }

    // Towers Shoot
    const speedMult = 1 + gameState.talents.speedBonus;
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
                            dmg: block.shooter.dmg + gameState.talents.dmgBonus,
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
        if (Math.random() < 0.5) gameState.materials += 1;
        if (Math.random() < 0.3) gameState.coins += 1;
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
            }
        }
    }

    // Draw Selected Item Shadow (Mouse tracking happens via events, but we draw here)
    if (gameState.selectedShopItem && mouseGridX !== null) {
        const shape = gameState.selectedShopItem.shape;
        let valid = canPlace(shape, mouseGridX, mouseGridY);

        ctx.globalAlpha = 0.5;
        ctx.fillStyle = valid ? '#4ade80' : '#f87171'; // Green or Red
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    ctx.fillRect((mouseGridX + x) * CELL_SIZE, (mouseGridY + y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
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
    gameState.selectedShopItem.shape = rotateMatrix(gameState.selectedShopItem.shape);
}

function canPlace(shape, gx, gy) {
    // Check bounds
    if (gx < 0 || gy < 0 || gx + shape[0].length > GRID_W || gy + shape.length > GRID_H) return false;

    // Check overlap
    let adjBase = false;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const cx = gx + x;
                const cy = gy + y;
                if (gameState.grid[cx][cy] !== null) return false; // Overlap

                // Check adjacency (must touch existing block or base)
                // We check 4 neighbors
                if (!adjBase) {
                    if (cx>0 && gameState.grid[cx-1][cy]) adjBase = true;
                    if (cx<GRID_W-1 && gameState.grid[cx+1][cy]) adjBase = true;
                    if (cy>0 && gameState.grid[cx][cy-1]) adjBase = true;
                    if (cy<GRID_H-1 && gameState.grid[cx][cy+1]) adjBase = true;
                }
            }
        }
    }
    return adjBase;
}

function placeBlock() {
    const shape = gameState.selectedShopItem.shape;
    if (canPlace(shape, mouseGridX, mouseGridY)) {
        // Pay cost
        gameState.materials -= gameState.shopCost;

        // Place
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    gameState.grid[mouseGridX + x][mouseGridY + y] = {
                        type: 'tower',
                        color: gameState.selectedShopItem.color,
                        shooter: gameState.selectedShopItem.shooter,
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

// Talents
btnUpgDmg.addEventListener('click', () => {
    if (gameState.coins >= gameState.talents.costDmg) {
        gameState.coins -= gameState.talents.costDmg;
        gameState.talents.dmgBonus += 1;
        gameState.talents.costDmg = Math.floor(gameState.talents.costDmg * 1.5);
        updateUI();
    }
});
btnUpgSpeed.addEventListener('click', () => {
    if (gameState.coins >= gameState.talents.costSpeed) {
        gameState.coins -= gameState.talents.costSpeed;
        gameState.talents.speedBonus += 0.1;
        gameState.talents.costSpeed = Math.floor(gameState.talents.costSpeed * 1.5);
        updateUI();
    }
});
btnUpgHp.addEventListener('click', () => {
    if (gameState.coins >= gameState.talents.costHp) {
        gameState.coins -= gameState.talents.costHp;
        gameState.maxBaseHp += 20;
        gameState.baseHp += 20;
        gameState.talents.costHp = Math.floor(gameState.talents.costHp * 1.5);
        updateUI();
    }
});

btnRestart.addEventListener('click', () => {
    location.reload();
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
initGrid();
generateShop();
updateUI();
gameState.waveDelayTimer = 5.0; // Initial start delay
requestAnimationFrame(loop);