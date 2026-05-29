const TRANSLATIONS = {
    en: { islandTdTitle: "Island TD", gold: "Gold", lives: "Lives", wave: "Wave", backToHub: "Back to Hub", actions: "Actions", digPath: "Dig (10g)", buildTower: "Build Tower", waveControl: "Wave Control", startWave: "Start Wave", permaUpgrades: "Perma Upgrades", upgDmg: "Tower Dmg +1 (1 Relic)", fogInfo: "Fog: Unknown", pathInfo: "Path", grassInfo: "Grass", baseInfo: "Base", spawnInfo: "Spawn", obstacleInfo: "Obstacle" },
    cz: { islandTdTitle: "Ostrov TD", gold: "Zlato", lives: "Životy", wave: "Vlna", backToHub: "Zpět do Hubu", actions: "Akce", digPath: "Kopat (10g)", buildTower: "Postavit Věž", waveControl: "Ovládání Vln", startWave: "Spustit Vlnu", permaUpgrades: "Trvalá Vylepšení", upgDmg: "Poškození Věží +1 (1 Relikvie)", fogInfo: "Mlha: Neznámé", pathInfo: "Cesta", grassInfo: "Tráva", baseInfo: "Základna", spawnInfo: "Líheň", obstacleInfo: "Překážka" }
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
let mapRadius = 9 + (JSON.parse(localStorage.getItem('hub_td_talents'))?.['b-map'] || 0);

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
    camera: { x: 0, y: 0, zoom: 1 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    gold: 100,
    lives: 20 + (JSON.parse(localStorage.getItem('hub_td_talents'))?.['b-hp'] || 0) * 5,
    wave: 0,
    relics: parseInt(localStorage.getItem('hub_td_relics')) || 0,

    towers: [],
    enemies: [],
    projectiles: [],
    baseTile: null,
    traps: [],
    trapsBuiltTotal: 0,
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
    state.traps = [];
    state.trapsBuiltTotal = 0;

    let forcedSpawnPlaced = false;
    for (let q = -mapRadius; q <= mapRadius; q++) {
        for (let r = -mapRadius; r <= mapRadius; r++) {
            if (hexDistance(0, 0, q, r) <= mapRadius) {
                let type = 'fog';
                if (q === 0 && r === 0) type = 'base';

                let hiddenType = 'grass';
                if (type === 'fog') {
                    let rand = Math.random();
                    let dist = hexDistance(0, 0, q, r);

                    if (dist >= 4) {
                        if (rand < 0.1) hiddenType = 'spawn';
                        else if (rand < 0.2) hiddenType = 'treasure';
                        else if (rand < 0.3) hiddenType = 'obstacle';
                    } else if (dist === 2 || dist === 3) {
                        if (!forcedSpawnPlaced && rand < 0.1) {
                            hiddenType = 'spawn';
                            forcedSpawnPlaced = true;
                        } else if (rand < 0.1) {
                            hiddenType = 'treasure';
                        } else if (rand < 0.2) {
                            hiddenType = 'obstacle';
                        }
                    }
                }

                let tile = { q, r, type, hiddenType, dangerExposedWave: null };
                gridMap.set(q + "," + r, tile);

                if (type === 'base') state.baseTile = tile;
            }
        }
    }

    // Ensure we placed at least one forced spawn
    if (!forcedSpawnPlaced) {
        let q = 2, r = 0;
        let tile = gridMap.get(q + "," + r);
        if (tile) tile.hiddenType = 'spawn';
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

        let hasRevealedNeighbor = false;
        let neighbors = getNeighbors(t.q, t.r);
        for (let n of neighbors) {
            let key = n.q + "," + n.r;
            if (gridMap.has(key) && gridMap.get(key).type !== 'fog') {
                hasRevealedNeighbor = true;
                break;
            }
        }

        if (t.type === 'fog' && hasRevealedNeighbor) {
            let diff = "Safe";
            if (t.hiddenType === 'spawn') diff = "High Danger!";
            else if (t.hiddenType === 'treasure') diff = "Treasure Detected";
            else if (t.hiddenType === 'obstacle') diff = "Obstacle";
            text += ` (Preview: ${diff})`;
        }

        tileInfo.textContent = text;

        btnDig.disabled = t.type !== 'fog' || state.gold < 10 || !hasRevealedNeighbor;
        let buildCost = 20 + state.towers.length * 5;
        btnBuild.textContent = TRANSLATIONS[lang]["buildTower"] + " (" + buildCost + "g)";

        let tower = state.towers.find(tw => tw.r === t.r && tw.q === t.q);
        btnBuild.disabled = t.type !== 'grass' || state.gold < buildCost || !!tower;

        let btnSplash = document.getElementById('btn-build-splash');
        if (btnSplash) {
            if (getTalentLevel('t-art') > 0) {
                btnSplash.style.display = 'block';
                btnSplash.textContent = "Build Splash Tower (" + (buildCost + 10) + "g)";
                btnSplash.disabled = t.type !== 'grass' || state.gold < (buildCost + 10) || !!tower;
            } else {
                btnSplash.style.display = 'none';
            }
        }

        let btnTrap = document.getElementById('btn-build-trap');
        if (btnTrap) {
            if (getTalentLevel('b-trap') > 0) {
                btnTrap.style.display = 'block';
                let trapCost = 2 * (state.trapsBuiltTotal + 1);
                btnTrap.textContent = "Build Trap (" + trapCost + "g)";
                btnTrap.disabled = (t.type !== 'grass' && t.type !== 'path') || state.gold < trapCost || !!state.traps.find(tr => tr.r === t.r && tr.q === t.q) || !!tower;
            } else {
                btnTrap.style.display = 'none';
            }
        }

        const upgPanel = document.getElementById('tower-upgrades-panel');
        if (tower) {
            upgPanel.style.display = 'block';

            let maxLevel = 3;
            // Dmg
            let costDmg = 10 + tower.upgrades.dmg * 5;
            let btnDmg = document.getElementById('btn-upg-tower-dmg');
            btnDmg.textContent = tower.upgrades.dmg < maxLevel ? `Upg Dmg (+2) - ${costDmg}g` : "Max Level";
            btnDmg.disabled = tower.upgrades.dmg >= maxLevel || state.gold < costDmg;

            // Range
            let costRange = 15 + tower.upgrades.range * 10;
            let btnRange = document.getElementById('btn-upg-tower-range');
            btnRange.textContent = tower.upgrades.range < maxLevel ? `Upg Range (+1) - ${costRange}g` : "Max Level";
            btnRange.disabled = tower.upgrades.range >= maxLevel || state.gold < costRange;

            // CD
            let costCd = 10 + tower.upgrades.cd * 5;
            let btnCd = document.getElementById('btn-upg-tower-cd');
            btnCd.textContent = tower.upgrades.cd < maxLevel ? `Upg Speed (-10%) - ${costCd}g` : "Max Level";
            btnCd.disabled = tower.upgrades.cd >= maxLevel || state.gold < costCd;
        } else {
            upgPanel.style.display = 'none';
        }

    } else {
        tileInfo.textContent = "Select a tile";
        btnDig.disabled = true;
        btnBuild.disabled = true;
        if(document.getElementById('btn-build-splash')) document.getElementById('btn-build-splash').style.display = 'none';
        if(document.getElementById('btn-build-trap')) document.getElementById('btn-build-trap').style.display = 'none';
        document.getElementById('tower-upgrades-panel').style.display = 'none';
    }

    btnStart.disabled = state.waveActive || state.spawnTiles.length === 0;
}


function updateFogExposure() {
    for (let tile of gridMap.values()) {
        if (tile.type === 'fog') {
            let hasRevealedNeighbor = false;
            let neighbors = getNeighbors(tile.q, tile.r);
            for (let n of neighbors) {
                let key = n.q + "," + n.r;
                if (gridMap.has(key) && gridMap.get(key).type !== 'fog') {
                    hasRevealedNeighbor = true;
                    break;
                }
            }
            if (hasRevealedNeighbor && tile.dangerExposedWave === null) {
                tile.dangerExposedWave = state.wave;
            }
        }
    }
}

function processAutoUnlock() {
    let changed = false;
    for (let tile of gridMap.values()) {
        if (tile.type === 'fog' && tile.hiddenType === 'spawn' && tile.dangerExposedWave !== null) {
            if (state.wave - tile.dangerExposedWave >= 2) {
                tile.type = 'spawn';
                state.spawnTiles.push(tile);
                changed = true;
                // clear if it was selected
                if(state.selectedTile === tile) {
                    updateUI();
                }
            }
        }
    }
    if (changed) recalculatePaths();
        updateFogExposure();
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
        } else if (ht === 'obstacle') {
            state.selectedTile.type = 'obstacle';
        } else if (ht === 'path') {
            state.selectedTile.type = 'grass';
        } else {
            state.selectedTile.type = 'grass';
        }

        updateUI();
        recalculatePaths();
    }
};

btnBuild.onclick = () => {
    let buildCost = 20 + state.towers.length * 5;
    if (state.selectedTile && state.selectedTile.type === 'grass' && state.gold >= buildCost) {
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

        state.gold -= buildCost;
        let baseCooldown = 30 * Math.pow(0.9, getTalentLevel('t-cd'));
        let tower = {
            q: state.selectedTile.q, r: state.selectedTile.r, type: 'normal',
            damage: 5 + getTalentLevel('t-dmg'), range: 3 + getTalentLevel('t-rng'), cooldown: 0, maxCooldown: baseCooldown,
            upgrades: { dmg: 0, range: 0, cd: 0 }
        };
        state.towers.push(tower);
        updateUI();
        recalculatePaths();
    }
};


document.getElementById('btn-build-trap').onclick = () => {
    let trapCost = 2 * (state.trapsBuiltTotal + 1);
    if (state.selectedTile && (state.selectedTile.type === 'grass' || state.selectedTile.type === 'path') && state.gold >= trapCost) {
        state.gold -= trapCost;
        state.trapsBuiltTotal++;
        state.traps.push({ q: state.selectedTile.q, r: state.selectedTile.r, dmg: 50 });
        updateUI();
    }
};

document.getElementById('btn-build-splash').onclick = () => {
    let buildCost = 30 + state.towers.length * 5;
    if (state.selectedTile && state.selectedTile.type === 'grass' && state.gold >= buildCost) {
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

        state.gold -= buildCost;
        let baseCooldown = 60 * Math.pow(0.9, getTalentLevel('t-cd'));
        let tower = {
            q: state.selectedTile.q, r: state.selectedTile.r, type: 'splash',
            damage: 8 + getTalentLevel('t-dmg'), range: 2 + getTalentLevel('t-rng'), cooldown: 0, maxCooldown: baseCooldown,
            upgrades: { dmg: 0, range: 0, cd: 0 }
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
    let swarmMult = 1 + getTalentLevel('e-swarm') * 0.1;
    if (state.wave % 10 === 0) {
        enemiesToSpawn = 1; // Boss wave
    } else {
        enemiesToSpawn = Math.floor(state.wave * 5 * swarmMult);
    }
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

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(state.camera.zoom, state.camera.zoom);
    ctx.translate(-canvas.width / 2 + state.camera.x, -canvas.height / 2 + state.camera.y);


    for (let tile of gridMap.values()) {
        let p = hexToPixel(tile.q, tile.r);

        let color = '#333';
        let isAdjacentFog = false;

        if (tile.type === 'fog') {
            let neighbors = getNeighbors(tile.q, tile.r);
            for (let n of neighbors) {
                let key = n.q + "," + n.r;
                if (gridMap.has(key) && gridMap.get(key).type !== 'fog') {
                    isAdjacentFog = true;
                    break;
                }
            }
            if (isAdjacentFog) {
                color = '#555';
            }
        } else if (tile.type === 'grass') {
            color = '#4caf50';
        } else if (tile.type === 'obstacle') {
            color = '#7f8c8d';
        } else if (tile.type === 'base') {
            color = '#2196f3';
        } else if (tile.type === 'obstacle') {
            ctx.fillStyle = '#2c3e50';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '12px monospace';
            ctx.fillText('X', p.x, p.y);
        } else if (tile.type === 'spawn') {
            color = '#f44336';
        }

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
        } else if (tile.type === 'fog' && isAdjacentFog) {
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '12px sans-serif';
            if (tile.hiddenType === 'spawn') {
                ctx.fillText('💀', p.x, p.y);
            } else if (tile.hiddenType === 'treasure') {
                ctx.fillText('💰', p.x, p.y);
            }
        }
    }

    state.towers.forEach(tw => {
        let p = hexToPixel(tw.q, tw.r);
        let totalUpg = tw.upgrades ? (tw.upgrades.dmg + tw.upgrades.range + tw.upgrades.cd) : 0;
        ctx.fillStyle = totalUpg > 4 ? '#ff9800' : (totalUpg > 0 ? '#03a9f4' : '#607d8b');
        ctx.fillRect(p.x - 8, p.y - 8, 16, 16);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '10px monospace';
        ctx.fillText((tw.type === 'splash' ? 'S' : 'T') + (totalUpg > 0 ? '+' : ''), p.x, p.y);
    });

    state.traps.forEach(tr => {
        let p = hexToPixel(tr.q, tr.r);
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 6);
        ctx.lineTo(p.x + 6, p.y + 6);
        ctx.lineTo(p.x - 6, p.y + 6);
        ctx.closePath();
        ctx.fill();
    });

    state.enemies.forEach(e => {
        let size = e.isBoss ? 12 : 8;
        ctx.beginPath();
        ctx.arc(e.x, e.y, size, 0, Math.PI * 2);
        ctx.fillStyle = e.isBoss ? 'purple' : 'red';
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

    ctx.restore();
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

            // If it's a boss wave, try to find a spawn tile further from the base
            if (state.wave % 10 === 0) {
                let sortedSpawns = [...state.spawnTiles].sort((a, b) => {
                    let dA = hexDistance(a.q, a.r, state.baseTile.q, state.baseTile.r);
                    let dB = hexDistance(b.q, b.r, state.baseTile.q, state.baseTile.r);
                    return dB - dA; // Descending
                });
                if (sortedSpawns.length > 0) {
                    spawnTile = sortedSpawns[0];
                }
            }

            let p = hexToPixel(spawnTile.q, spawnTile.r);

            let isBoss = (state.wave % 10 === 0);
            let baseHp = state.wave === 1 ? 5 : 10 * Math.pow(1.2, state.wave);
            let finalHp = isBoss ? baseHp * 10 : baseHp;
            if (getTalentLevel('e-elite') > 0) finalHp *= 1.2;

            let spdMult = 1 + getTalentLevel('e-spd') * 0.1;

            let enemy = {
                q: spawnTile.q, r: spawnTile.r,
                x: p.x, y: p.y,
                hp: finalHp,
                maxHp: finalHp,
                speed: (isBoss ? 0.5 : 1) * spdMult,
                isBoss: isBoss
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

            // Check trap collisions
            let trapIdx = state.traps.findIndex(tr => tr.q === hex.q && tr.r === hex.r);
            if (trapIdx !== -1) {
                let tr = state.traps[trapIdx];
                e.hp -= tr.dmg;
                state.traps.splice(trapIdx, 1);
                if (e.hp <= 0) {
                    let goldMult = 1 + getTalentLevel('b-gold') * 0.1 + getTalentLevel('e-swarm') * 0.1 + getTalentLevel('e-spd') * 0.1;
                    if (e.isBoss) {
                        state.gold += Math.floor(50 * goldMult);
                        state.relics += 1;
                        localStorage.setItem('hub_td_relics', state.relics);
                        expandMap();
                        alert("Boss Defeated! The map has expanded.");
                    } else {
                        state.gold += Math.floor(5 * goldMult);
                    }
                    if (getTalentLevel('e-elite') > 0 && Math.random() < 0.05) {
                        let r = Math.random();
                        if (r < 0.5) { state.gold += 20; }
                        else if (r < 0.8) { state.lives += 1; }
                    }
                    state.enemies.splice(i, 1);
                    updateUI();
                    continue;
                }
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
                    state.projectiles.push({ x: tPos.x, y: tPos.y, target: target, dmg: t.damage, isSplash: t.type === 'splash' });
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
                if (p.isSplash) {
                    state.enemies.forEach(e => {
                        if (Math.hypot(e.x - p.target.x, e.y - p.target.y) <= 40) {
                            e.hp -= p.dmg;
                        }
                    });
                } else {
                    p.target.hp -= p.dmg;
                }

                for (let j = state.enemies.length - 1; j >= 0; j--) {
                    let e = state.enemies[j];
                    if (e.hp <= 0) {
                        let goldMult = 1 + getTalentLevel('b-gold') * 0.1 + getTalentLevel('e-swarm') * 0.1 + getTalentLevel('e-spd') * 0.1;
                        if (e.isBoss) {
                            state.gold += Math.floor(50 * goldMult);
                            state.relics += 1;
                            localStorage.setItem('hub_td_relics', state.relics);
                            expandMap();
                            alert("Boss Defeated! The map has expanded.");
                        } else {
                            state.gold += Math.floor(5 * goldMult);
                        }

                        if (getTalentLevel('e-elite') > 0 && Math.random() < 0.05) {
                            // Bonus drop
                            let r = Math.random();
                            if (r < 0.5) { state.gold += 20; }
                            else if (r < 0.8) { state.lives += 1; }
                        }
                        state.enemies.splice(j, 1);
                        updateUI();
                    }
                }
                state.projectiles.splice(i, 1);
            } else {
                p.x += (dx/dist) * 5;
                p.y += (dy/dist) * 5;
            }
        }

        if (enemiesToSpawn === 0 && state.enemies.length === 0) {
            state.waveActive = false;
            processAutoUnlock();
            updateUI();
        }
    }

    draw();
    requestAnimationFrame(loop);
}


let talents = JSON.parse(localStorage.getItem('hub_td_talents')) || {
    't-dmg': 0, 't-rng': 0, 't-cd': 0, 't-art': 0,
    'b-hp': 0, 'b-gold': 0, 'b-map': 0, 'b-trap': 0,
    'e-swarm': 0, 'e-spd': 0, 'e-elite': 0
};

// Migrate old dmg bonus
if (localStorage.getItem('hub_td_dmg')) {
    talents['t-dmg'] = parseInt(localStorage.getItem('hub_td_dmg'));
    localStorage.removeItem('hub_td_dmg');
    localStorage.setItem('hub_td_talents', JSON.stringify(talents));
}

function getTalentLevel(id) {
    return talents[id] || 0;
}

function updateTalentUI() {
    document.getElementById('modal-relics-display').textContent = state.relics;
    document.querySelectorAll('.btn-talent').forEach(btn => {
        let id = btn.getAttribute('data-id');
        let max = parseInt(btn.getAttribute('data-max'));
        let costs = JSON.parse(btn.getAttribute('data-cost'));
        let lvl = getTalentLevel(id);

        document.getElementById(id + '-lvl').textContent = lvl;

        if (lvl >= max) {
            btn.textContent = "Maxed";
            btn.disabled = true;
        } else {
            let cost = costs[lvl];
            btn.querySelector('.cost-display').textContent = cost;
            btn.disabled = state.relics < cost;
        }
    });
}

document.getElementById('btn-open-talents').onclick = () => {
    document.getElementById('talent-modal').style.display = 'flex';
    updateTalentUI();
};
document.getElementById('btn-close-talents').onclick = () => {
    document.getElementById('talent-modal').style.display = 'none';
};

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.style.background = '#34495e');
        e.target.style.background = '#2980b9';

        document.querySelectorAll('.talent-tab').forEach(t => t.style.display = 'none');
        document.getElementById(e.target.getAttribute('data-target')).style.display = 'block';
    };
});

document.querySelectorAll('.btn-talent').forEach(btn => {
    btn.onclick = () => {
        let id = btn.getAttribute('data-id');
        let max = parseInt(btn.getAttribute('data-max'));
        let costs = JSON.parse(btn.getAttribute('data-cost'));
        let lvl = getTalentLevel(id);

        if (lvl < max) {
            let cost = costs[lvl];
            if (state.relics >= cost) {
                state.relics -= cost;
                talents[id] = lvl + 1;
                localStorage.setItem('hub_td_relics', state.relics);
                localStorage.setItem('hub_td_talents', JSON.stringify(talents));
                updateTalentUI();
                updateUI(); // update main game UI
            }
        }
    };
});


initGrid();
updateFogExposure();
updateUI();
recalculatePaths();
draw();
requestAnimationFrame(loop);


function screenToWorld(sx, sy) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Convert screen coordinates to raw canvas coordinates
    const cx = (sx - rect.left) * scaleX;
    const cy = (sy - rect.top) * scaleY;

    // Apply reverse camera transform
    const wx = (cx - canvas.width / 2) / state.camera.zoom + canvas.width / 2 - state.camera.x;
    const wy = (cy - canvas.height / 2) / state.camera.zoom + canvas.height / 2 - state.camera.y;

    return { x: wx, y: wy };
}

canvas.addEventListener('mousedown', (e) => {
    state.isDragging = true;
    state.dragStart = { x: e.clientX, y: e.clientY };
    state.lastCamera = { x: state.camera.x, y: state.camera.y };
});

window.addEventListener('mousemove', (e) => {
    if (state.isDragging) {
        const dx = e.clientX - state.dragStart.x;
        const dy = e.clientY - state.dragStart.y;

        // Scale drag movement based on zoom
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;

        state.camera.x = state.lastCamera.x + (dx * scaleX) / state.camera.zoom;
        state.camera.y = state.lastCamera.y + (dy * scaleX) / state.camera.zoom;
    }
});

window.addEventListener('mouseup', (e) => {
    if (state.isDragging) {
        state.isDragging = false;

        // If we didn't move much, treat it as a click
        const dx = Math.abs(e.clientX - state.dragStart.x);
        const dy = Math.abs(e.clientY - state.dragStart.y);

        if (dx < 5 && dy < 5) {
            const worldPos = screenToWorld(e.clientX, e.clientY);
            const hex = pixelToHex(worldPos.x, worldPos.y);
            let key = hex.q + "," + hex.r;
            if (gridMap.has(key)) {
                selectTile(hex.q, hex.r);
            }
        }
    }
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomAmount = 0.1;
    if (e.deltaY < 0) {
        state.camera.zoom = Math.min(3, state.camera.zoom + zoomAmount);
    } else {
        state.camera.zoom = Math.max(0.3, state.camera.zoom - zoomAmount);
    }
});

// Remove old click listener if it was there


function expandMap() {
    mapRadius++;
    for (let q = -mapRadius; q <= mapRadius; q++) {
        for (let r = -mapRadius; r <= mapRadius; r++) {
            let key = q + "," + r;
            if (hexDistance(0, 0, q, r) === mapRadius && !gridMap.has(key)) {
                let hiddenType = 'grass';
                let rand = Math.random();
                let dist = hexDistance(0, 0, q, r);
                if (rand < 0.1 && dist >= 4) hiddenType = 'spawn';
                else if (rand < 0.2) hiddenType = 'treasure';
                else if (rand < 0.3) hiddenType = 'obstacle';

                let tile = { q, r, type: 'fog', hiddenType, dangerExposedWave: null };
                gridMap.set(key, tile);
            }
        }
    }
}

// Camera controls
document.getElementById('btn-zoom-in').addEventListener('click', () => {
    state.camera.zoom = Math.min(3, state.camera.zoom + 0.2);
});
document.getElementById('btn-zoom-out').addEventListener('click', () => {
    state.camera.zoom = Math.max(0.3, state.camera.zoom - 0.2);
});
document.getElementById('btn-zoom-reset').addEventListener('click', () => {
    state.camera.zoom = 1;
    state.camera.x = 0;
    state.camera.y = 0;
});


// Tower Upgrade Handlers
document.getElementById('btn-upg-tower-dmg').onclick = () => {
    if(!state.selectedTile) return;
    let tower = state.towers.find(tw => tw.r === state.selectedTile.r && tw.q === state.selectedTile.q);
    if(tower && tower.upgrades.dmg < 3) {
        let cost = 10 + tower.upgrades.dmg * 5;
        if(state.gold >= cost) {
            state.gold -= cost;
            tower.upgrades.dmg++;
            tower.damage += 2;
            updateUI();
        }
    }
};

document.getElementById('btn-upg-tower-range').onclick = () => {
    if(!state.selectedTile) return;
    let tower = state.towers.find(tw => tw.r === state.selectedTile.r && tw.q === state.selectedTile.q);
    if(tower && tower.upgrades.range < 3) {
        let cost = 15 + tower.upgrades.range * 10;
        if(state.gold >= cost) {
            state.gold -= cost;
            tower.upgrades.range++;
            tower.range += 1;
            updateUI();
        }
    }
};

document.getElementById('btn-upg-tower-cd').onclick = () => {
    if(!state.selectedTile) return;
    let tower = state.towers.find(tw => tw.r === state.selectedTile.r && tw.q === state.selectedTile.q);
    if(tower && tower.upgrades.cd < 3) {
        let cost = 10 + tower.upgrades.cd * 5;
        if(state.gold >= cost) {
            state.gold -= cost;
            tower.upgrades.cd++;
            tower.maxCooldown = Math.max(5, Math.floor(tower.maxCooldown * 0.9));
            updateUI();
        }
    }
};
