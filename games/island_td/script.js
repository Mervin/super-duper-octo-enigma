const TRANSLATIONS = {
    en: { islandTdTitle: "Island TD", gold: "Gold", lives: "Lives", wave: "Wave", backToHub: "Back to Hub", actions: "Actions", digPath: "Dig (10g)", buildTower: "Build Tower (20g)", waveControl: "Wave Control", startWave: "Start Wave", permaUpgrades: "Perma Upgrades", upgDmg: "Tower Dmg +1 (1 Relic)", fogInfo: "Fog: Unknown", pathInfo: "Path", grassInfo: "Grass", baseInfo: "Base", spawnInfo: "Spawn" },
    cz: { islandTdTitle: "Ostrov TD", gold: "Zlato", lives: "Životy", wave: "Vlna", backToHub: "Zpět do Hubu", actions: "Akce", digPath: "Kopat (10g)", buildTower: "Postavit Věž (20g)", waveControl: "Ovládání Vln", startWave: "Spustit Vlnu", permaUpgrades: "Trvalá Vylepšení", upgDmg: "Poškození Věží +1 (1 Relikvie)", fogInfo: "Mlha: Neznámé", pathInfo: "Cesta", grassInfo: "Tráva", baseInfo: "Základna", spawnInfo: "Líheň" }
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

// Hex Math (Axial coordinates q, r)
const HEX_SIZE = 18;
const HEX_W = Math.sqrt(3) * HEX_SIZE;
const HEX_H = 2 * HEX_SIZE;
const MAP_RADIUS = 9;

// Flat-topped hex to pixel
function hexToPixel(q, r) {
    const x = HEX_SIZE * 3/2 * q;
    const y = HEX_SIZE * Math.sqrt(3) * (r + q/2);
    // Center at 300, 300
    return { x: x + 300, y: y + 300 };
}

// Pixel to axial hex
function pixelToHex(x, y) {
    const ptX = x - 300;
    const ptY = y - 300;
    const q = (2/3 * ptX) / HEX_SIZE;
    const r = (-1/3 * ptX + Math.sqrt(3)/3 * ptY) / HEX_SIZE;
    return cubeToAxial(cubeRound(q, r, -q-r));
}

function cubeRound(fracQ, fracR, fracS) {
    let q = Math.round(fracQ);
    let r = Math.round(fracR);
    let s = Math.round(fracS);

    let q_diff = Math.abs(q - fracQ);
    let r_diff = Math.abs(r - fracR);
    let s_diff = Math.abs(s - fracS);

    if (q_diff > r_diff && q_diff > s_diff) q = -r - s;
    else if (r_diff > s_diff) r = -q - s;
    else s = -q - r;
    return {q, r, s};
}

function cubeToAxial(cube) {
    return { q: cube.q, r: cube.r };
}

function getNeighbors(q, r) {
    const dirs = [
        [+1, 0], [+1, -1], [0, -1], [-1, 0], [-1, +1], [0, +1]
    ];
    return dirs.map(d => ({ q: q + d[0], r: r + d[1] }));
}

// Map distance
function hexDistance(q1, r1, q2, r2) {
    return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}

// Game State
let gridMap = new Map(); // key: "q,r", value: tile obj
let state = {
    gold: 50,
    lives: 20,
    wave: 0,
    relics: parseInt(localStorage.getItem('hub_td_relics')) || 0,
    dmgBonus: parseInt(localStorage.getItem('hub_td_dmg')) || 0,
    towers: [],
    enemies: [],
    projectiles: [],
    baseTile: null,
    spawnTiles: [],
    waveActive: false,
    digCount: 0,
    selectedTile: null
};
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");


const btnDig = document.getElementById('btn-dig');
const btnBuild = document.getElementById('btn-build-tower');
const btnStart = document.getElementById('btn-start-wave');
const tileInfo = document.getElementById('tile-info');

// Init Grid
function initGrid() {
    gridMap.clear();
    state.spawnTiles = [];
    state.towers = [];
    state.enemies = [];
    state.projectiles = [];
    state.selectedTile = null;

    for (let q = -MAP_RADIUS; q <= MAP_RADIUS; q++) {
        for (let r = -MAP_RADIUS; r <= MAP_RADIUS; r++) {
            if (hexDistance(0, 0, q, r) <= MAP_RADIUS) {
                let type = 'fog';
                if (q === 0 && r === 0) type = 'base';

                let hiddenType = 'grass';
                if (type === 'fog') {
                    let rand = Math.random();
                    if (rand < 0.1) hiddenType = 'spawn';
                    else if (rand < 0.2) hiddenType = 'treasure';
                }

                let tile = { q, r, type, hiddenType };
                gridMap.set(q + "," + r, tile);

                if (type === 'base') state.baseTile = tile;
            }
        }
    }

    // Set immediate neighbors of base to grass
    let baseNeighbors = getNeighbors(0, 0);
    baseNeighbors.forEach(n => {
        let key = n.q + "," + n.r;
        if (gridMap.has(key)) {
            gridMap.get(key).type = 'grass';
        }
    });


}

function updateUI() {
    document.getElementById('gold-display').textContent = state.gold;
    document.getElementById('lives-display').textContent = state.lives;
    document.getElementById('wave-display').textContent = state.wave;
    document.getElementById('relics-display').textContent = state.relics;

    if (state.selectedTile) {
        const t = state.selectedTile;
        let infoKey = t.type + 'Info';
        let text = TRANSLATIONS[lang][infoKey] || t.type;

        if (t.type === 'fog') {
            let diff = "Safe";
            if (t.hiddenType === 'spawn') diff = "High Danger!";
            else if (t.hiddenType === 'treasure') diff = "Treasure Detected";
            text += ` (Preview: ${diff})`;
        }

        tileInfo.textContent = text;


        let hasRevealedNeighbor = false;
        let neighbors = getNeighbors(t.q, t.r);
        for (let n of neighbors) {
            let key = n.q + "," + n.r;
            if (gridMap.has(key) && gridMap.get(key).type !== 'fog') {
                hasRevealedNeighbor = true;
                break;
            }
        }

        btnDig.disabled = t.type !== 'fog' || state.gold < 10 || !hasRevealedNeighbor;
        btnBuild.disabled = t.type !== 'grass' || state.gold < 20 || !!state.towers.find(tw => tw.r === t.r && tw.c === t.c);
    } else {
        tileInfo.textContent = "Select a tile";
        btnDig.disabled = true;
        btnBuild.disabled = true;
    }

    btnStart.disabled = state.waveActive || state.spawnTiles.length === 0;
}

function selectTile(q, r) {
    let tile = gridMap.get(q + "," + r);
    if (!tile) return;

    if (state.selectedTile === tile) {
        if (state.selectedTile.type === 'fog' && !btnDig.disabled) {
            btnDig.onclick();
        } else if (state.selectedTile.type === 'grass' && !btnBuild.disabled) {
            btnBuild.onclick();
        }
        return;
    }
    state.selectedTile = tile;
    updateUI();
}

btnDig.onclick = () => {
    if (state.selectedTile && state.selectedTile.type === 'fog' && state.gold >= 10 && !btnDig.disabled) {
        state.gold -= 10;
        state.digCount++;
        let ht = state.selectedTile.hiddenType;

        if (state.digCount === 2) ht = 'spawn';

        if (ht === 'spawn') {
            state.selectedTile.type = 'spawn';
            state.spawnTiles.push(state.selectedTile);
        } else if (ht === 'treasure') {
            state.gold += 25;
            state.selectedTile.type = 'grass';
        } else if (ht === 'path') {
            // Keep old path check just in case, but treat as grass
            state.selectedTile.type = 'grass';
        } else {
            state.selectedTile.type = 'grass';
        }

        updateUI();
        recalculatePaths();
    }
};

btnBuild.onclick = () => {
    if (state.selectedTile && state.selectedTile.type === 'grass' && state.gold >= 20) {
        recalculatePaths();
        let currentlyConnectedSpawns = [];
        for (let spawnTile of state.spawnTiles) {
            let key = spawnTile.q + "," + spawnTile.r;
            if (pathMap.has(key)) currentlyConnectedSpawns.push(spawnTile);
        }

        recalculatePaths({q: state.selectedTile.q, r: state.selectedTile.r});
        let blocksPath = false;
        for (let spawnTile of currentlyConnectedSpawns) {
            let key = spawnTile.q + "," + spawnTile.r;
            if (!pathMap.has(key)) {
                blocksPath = true;
                break;
            }
        }

        if (blocksPath) {
            recalculatePaths();
            alert("Cannot block path to base!");
            return;
        }

        state.gold -= 20;
        let tower = {
            q: state.selectedTile.q, r: state.selectedTile.r,
            damage: 5 + state.dmgBonus, range: 3, cooldown: 0, maxCooldown: 30
        };
        state.towers.push(tower);
        updateUI();
        recalculatePaths();
    }
};

let pathMap = new Map(); // key: "q,r", value: {dist, next: {q,r}}
function recalculatePaths(ignoreTowerAt = null) {
    pathMap.clear();
    let queue = [{q: state.baseTile.q, r: state.baseTile.r, dist: 0}];
    pathMap.set(state.baseTile.q + "," + state.baseTile.r, {dist: 0, next: null});

    let head = 0;
    while(head < queue.length) {
        let curr = queue[head++];
        let neighbors = getNeighbors(curr.q, curr.r);

        for (let n of neighbors) {
            let key = n.q + "," + n.r;
            if (gridMap.has(key)) {
                let t = gridMap.get(key);
                let hasTower = !!state.towers.find(tw => tw.q === n.q && tw.r === n.r);
                if (ignoreTowerAt && ignoreTowerAt.q === n.q && ignoreTowerAt.r === n.r) hasTower = true;

                if ((t.type === 'grass' || t.type === 'spawn' || t.type === 'base') && !hasTower && !pathMap.has(key)) {
                    pathMap.set(key, {dist: curr.dist+1, next: {q: curr.q, r: curr.r}});
                    queue.push({q: n.q, r: n.r, dist: curr.dist+1});
                }
            }
        }
    }
}

let enemiesToSpawn = 0;
let spawnTimer = 0;

btnStart.onclick = () => {
    state.wave++;
    enemiesToSpawn = state.wave * 5;
    state.waveActive = true;
    updateUI();
};

function getPixels(r, c) {
    return { x: c * 30 + 15, y: r * 30 + 15 };
}

function drawHex(x, y, radius, fillColor, outlineColor) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = 2 * Math.PI / 6 * i;
        const x_i = x + radius * Math.cos(angle);
        const y_i = y + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x_i, y_i);
        else ctx.lineTo(x_i, y_i);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = outlineColor || 'rgba(0,0,0,0.2)';
    ctx.stroke();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let tile of gridMap.values()) {
        let p = hexToPixel(tile.q, tile.r);

        let color = '#333';
        if (tile.type === 'grass') color = '#4caf50';
        if (tile.type === 'base') color = '#2196f3';
        if (tile.type === 'spawn') color = '#f44336';

        let outline = 'rgba(0,0,0,0.2)';
        if (state.selectedTile === tile) outline = 'yellow';

        drawHex(p.x, p.y, HEX_SIZE - 1, color, outline);

        if (state.selectedTile === tile) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'yellow';
            ctx.stroke();
        }

        if (tile.type === 'base') {
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '12px monospace';
            ctx.fillText('B', p.x, p.y);
        } else if (tile.type === 'spawn') {
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '12px monospace';
            ctx.fillText('S', p.x, p.y);
        }
    }

    state.towers.forEach(tw => {
        let p = hexToPixel(tw.q, tw.r);
        ctx.fillStyle = '#607d8b';
        ctx.fillRect(p.x - 8, p.y - 8, 16, 16);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '10px monospace';
        ctx.fillText('T', p.x, p.y);
    });

    state.enemies.forEach(e => {
        ctx.beginPath();
        ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '8px monospace';
        ctx.fillText(Math.ceil(e.hp), e.x, e.y);
    });

    state.projectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.fill();
    });
}

function loop() {
    if (state.lives <= 0) {
        alert("Game Over! Relics earned: " + Math.floor(state.wave/5));
        state.relics += Math.floor(state.wave/5);
        localStorage.setItem('hub_td_relics', state.relics);
        location.reload();
        return;
    }

    if (state.waveActive) {
        if (enemiesToSpawn > 0 && spawnTimer <= 0) {
            let spawnTile = state.spawnTiles[Math.floor(Math.random()*state.spawnTiles.length)];
            let p = hexToPixel(spawnTile.q, spawnTile.r);
            let enemy = {
                q: spawnTile.q, r: spawnTile.r,
                x: p.x, y: p.y,
                hp: 10 * Math.pow(1.2, state.wave),
                maxHp: 10 * Math.pow(1.2, state.wave),
                speed: 1
            };
            state.enemies.push(enemy);
            enemiesToSpawn--;
            spawnTimer = 30;
        } else spawnTimer--;

        for (let i = state.enemies.length - 1; i >= 0; i--) {
            let e = state.enemies[i];
            let hex = pixelToHex(e.x, e.y);

            if (hex.q === state.baseTile.q && hex.r === state.baseTile.r) {
                state.lives--;
                state.enemies.splice(i, 1);
                updateUI();
                continue;
            }

            let key = hex.q + "," + hex.r;
            let pInfo = pathMap.get(key);
            if (pInfo && pInfo.next) {
                let targetPx = hexToPixel(pInfo.next.q, pInfo.next.r);
                let dx = targetPx.x - e.x;
                let dy = targetPx.y - e.y;
                let dist = Math.hypot(dx, dy);

                if (dist > e.speed) {
                    e.x += (dx/dist) * e.speed;
                    e.y += (dy/dist) * e.speed;
                } else {
                    e.x = targetPx.x;
                    e.y = targetPx.y;
                }
            } else {
                let basePx = hexToPixel(state.baseTile.q, state.baseTile.r);
                e.x += (basePx.x - e.x) * 0.01;
                e.y += (basePx.y - e.y) * 0.01;
            }
        }

        state.towers.forEach(t => {
            if (t.cooldown > 0) t.cooldown--;
            else {
                let tPos = hexToPixel(t.q, t.r);
                let target = state.enemies.find(e => Math.hypot(e.x - tPos.x, e.y - tPos.y) <= t.range * HEX_SIZE * 2);
                if (target) {
                    state.projectiles.push({ x: tPos.x, y: tPos.y, target: target, dmg: t.damage });
                    t.cooldown = t.maxCooldown;
                }
            }
        });

        for (let i = state.projectiles.length - 1; i >= 0; i--) {
            let p = state.projectiles[i];
            if (!state.enemies.includes(p.target)) {
                state.projectiles.splice(i, 1);
                continue;
            }

            let dx = p.target.x - p.x;
            let dy = p.target.y - p.y;
            let dist = Math.hypot(dx, dy);

            if (dist < 5) {
                p.target.hp -= p.dmg;
                if (p.target.hp <= 0) {
                    state.gold += 2;
                    state.enemies.splice(state.enemies.indexOf(p.target), 1);
                    updateUI();
                }
                state.projectiles.splice(i, 1);
            } else {
                p.x += (dx/dist) * 5;
                p.y += (dy/dist) * 5;
            }
        }

        if (enemiesToSpawn === 0 && state.enemies.length === 0) {
            state.waveActive = false;
            updateUI();
        }
    }

    draw();
    requestAnimationFrame(loop);
}

document.getElementById('btn-upg-dmg').onclick = () => {
    if (state.relics >= 1) {
        state.relics--;
        state.dmgBonus++;
        localStorage.setItem('hub_td_relics', state.relics);
        localStorage.setItem('hub_td_dmg', state.dmgBonus);
        updateUI();
    }
};

initGrid();
updateUI();
recalculatePaths();
draw();
requestAnimationFrame(loop);

canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const hex = pixelToHex(x, y);
        let key = hex.q + "," + hex.r;
        if (gridMap.has(key)) {
            selectTile(hex.q, hex.r);
        }
    });
