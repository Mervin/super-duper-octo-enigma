const TRANSLATIONS = {
    en: { islandTdTitle: "Island TD", gold: "Gold", lives: "Lives", wave: "Wave", backToHub: "Back to Hub", actions: "Actions", digPath: "Dig Path (10g)", buildTower: "Build Tower (20g)", waveControl: "Wave Control", startWave: "Start Wave", permaUpgrades: "Perma Upgrades", upgDmg: "Tower Dmg +1 (1 Relic)", fogInfo: "Fog: Unknown", pathInfo: "Path", grassInfo: "Grass", baseInfo: "Base", spawnInfo: "Spawn" },
    cz: { islandTdTitle: "Ostrov TD", gold: "Zlato", lives: "Životy", wave: "Vlna", backToHub: "Zpět do Hubu", actions: "Akce", digPath: "Kopat Cestu (10g)", buildTower: "Postavit Věž (20g)", waveControl: "Ovládání Vln", startWave: "Spustit Vlnu", permaUpgrades: "Trvalá Vylepšení", upgDmg: "Poškození Věží +1 (1 Relikvie)", fogInfo: "Mlha: Neznámé", pathInfo: "Cesta", grassInfo: "Tráva", baseInfo: "Základna", spawnInfo: "Líheň" }
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

// Game State
const W = 20, H = 20;
let grid = [];
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
    pathTiles: [],
    waveActive: false,
    selectedTile: null
};

const gridEl = document.getElementById('grid');
const entitiesEl = document.getElementById('entities-layer');
const btnDig = document.getElementById('btn-dig');
const btnBuild = document.getElementById('btn-build-tower');
const btnStart = document.getElementById('btn-start-wave');
const tileInfo = document.getElementById('tile-info');

// Init Grid
function initGrid() {
    gridEl.innerHTML = '';
    grid = [];
    state.pathTiles = [];
    state.spawnTiles = [];
    state.towers = [];
    state.enemies = [];

    // Center base
    const br = Math.floor(H/2), bc = Math.floor(W/2);

    for (let r=0; r<H; r++) {
        grid[r] = [];
        for (let c=0; c<W; c++) {
            let type = 'fog';
            if (r === br && c === bc) type = 'base';
            else if (Math.abs(r-br) <= 1 && Math.abs(c-bc) <= 1) type = 'grass';

            let tile = { r, c, type, el: document.createElement('div') };
            tile.el.className = `tile ${type}`;
            if (type === 'base') tile.el.textContent = 'B';

            tile.el.onclick = () => selectTile(r, c);

            gridEl.appendChild(tile.el);
            grid[r][c] = tile;

            if (type === 'base') state.baseTile = tile;
        }
    }
}

function updateUI() {
    document.getElementById('gold-display').textContent = state.gold;
    document.getElementById('lives-display').textContent = state.lives;
    document.getElementById('wave-display').textContent = state.wave;
    document.getElementById('relics-display').textContent = state.relics;

    if (state.selectedTile) {
        const t = state.selectedTile;
        let infoKey = t.type + 'Info';
        tileInfo.textContent = TRANSLATIONS[lang][infoKey] || t.type;

        btnDig.disabled = t.type !== 'fog' || state.gold < 10;
        btnBuild.disabled = t.type !== 'grass' || state.gold < 20 || !!state.towers.find(tw => tw.r === t.r && tw.c === t.c);
    } else {
        tileInfo.textContent = "Select a tile";
        btnDig.disabled = true;
        btnBuild.disabled = true;
    }

    btnStart.disabled = state.waveActive || state.spawnTiles.length === 0;
}

function selectTile(r, c) {
    if (state.selectedTile) state.selectedTile.el.classList.remove('selected');
    state.selectedTile = grid[r][c];
    state.selectedTile.el.classList.add('selected');
    updateUI();
}

btnDig.onclick = () => {
    if (state.selectedTile && state.selectedTile.type === 'fog' && state.gold >= 10) {
        state.gold -= 10;
        let r = Math.random();
        if (r < 0.1) {
            state.selectedTile.type = 'spawn';
            state.selectedTile.el.textContent = 'S';
            state.spawnTiles.push(state.selectedTile);
        } else if (r < 0.2) {
            state.gold += 25; // Treasure
            state.selectedTile.type = 'grass';
        } else if (r < 0.6) {
            state.selectedTile.type = 'path';
            state.pathTiles.push(state.selectedTile);
        } else {
            state.selectedTile.type = 'grass';
        }

        state.selectedTile.el.className = `tile ${state.selectedTile.type} selected`;
        updateUI();
        recalculatePaths();
    }
};

btnBuild.onclick = () => {
    if (state.selectedTile && state.selectedTile.type === 'grass' && state.gold >= 20) {
        state.gold -= 20;
        let tower = {
            r: state.selectedTile.r, c: state.selectedTile.c,
            damage: 5 + state.dmgBonus, range: 3, cooldown: 0, maxCooldown: 30,
            el: document.createElement('div')
        };
        tower.el.textContent = 'T';
        state.selectedTile.el.appendChild(tower.el);
        state.towers.push(tower);
        updateUI();
    }
};

let pathMap = [];
function recalculatePaths() {
    // Basic BFS from base to all spawns using paths and base
    pathMap = Array(H).fill(null).map(() => Array(W).fill(null));
    let q = [{r: state.baseTile.r, c: state.baseTile.c, dist: 0}];
    pathMap[state.baseTile.r][state.baseTile.c] = {dist: 0, next: null};

    let head = 0;
    while(head < q.length) {
        let curr = q[head++];
        let dirs = [[0,1],[1,0],[0,-1],[-1,0]];
        for (let d of dirs) {
            let nr = curr.r + d[0], nc = curr.c + d[1];
            if (nr>=0 && nr<H && nc>=0 && nc<W) {
                let t = grid[nr][nc];
                if ((t.type === 'path' || t.type === 'spawn') && !pathMap[nr][nc]) {
                    pathMap[nr][nc] = {dist: curr.dist+1, next: {r: curr.r, c: curr.c}};
                    q.push({r: nr, c: nc, dist: curr.dist+1});
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

function loop() {
    if (state.lives <= 0) {
        alert("Game Over! Relics earned: " + Math.floor(state.wave/5));
        state.relics += Math.floor(state.wave/5);
        localStorage.setItem('hub_td_relics', state.relics);
        location.reload();
        return;
    }

    if (state.waveActive) {
        // Spawning
        if (enemiesToSpawn > 0 && spawnTimer <= 0) {
            let spawnTile = state.spawnTiles[Math.floor(Math.random()*state.spawnTiles.length)];
            let enemy = {
                r: spawnTile.r, c: spawnTile.c,
                x: getPixels(spawnTile.r, spawnTile.c).x,
                y: getPixels(spawnTile.r, spawnTile.c).y,
                hp: 10 * Math.pow(1.2, state.wave),
                maxHp: 10 * Math.pow(1.2, state.wave),
                speed: 1,
                el: document.createElement('div')
            };
            enemy.el.className = 'enemy';
            entitiesEl.appendChild(enemy.el);
            state.enemies.push(enemy);
            enemiesToSpawn--;
            spawnTimer = 30;
        } else {
            spawnTimer--;
        }

        // Enemy movement
        for (let i = state.enemies.length - 1; i >= 0; i--) {
            let e = state.enemies[i];
            let gridR = Math.floor(e.y / 30);
            let gridC = Math.floor(e.x / 30);

            if (gridR === state.baseTile.r && gridC === state.baseTile.c) {
                state.lives--;
                e.el.remove();
                state.enemies.splice(i, 1);
                updateUI();
                continue;
            }

            let pInfo = pathMap[gridR] && pathMap[gridR][gridC];
            if (pInfo && pInfo.next) {
                let targetX = getPixels(pInfo.next.r, pInfo.next.c).x;
                let targetY = getPixels(pInfo.next.r, pInfo.next.c).y;
                let dx = targetX - e.x;
                let dy = targetY - e.y;
                let dist = Math.hypot(dx, dy);

                if (dist > e.speed) {
                    e.x += (dx/dist) * e.speed;
                    e.y += (dy/dist) * e.speed;
                } else {
                    e.x = targetX;
                    e.y = targetY;
                }
            } else {
                // No path to base (shouldn't happen if pathing is right, but just in case)
                e.x += (getPixels(state.baseTile.r, state.baseTile.c).x - e.x) * 0.01;
                e.y += (getPixels(state.baseTile.r, state.baseTile.c).y - e.y) * 0.01;
            }

            e.el.style.left = e.x + 'px';
            e.el.style.top = e.y + 'px';
            e.el.textContent = Math.ceil(e.hp);
        }

        // Towers Attack
        state.towers.forEach(t => {
            if (t.cooldown > 0) t.cooldown--;
            else {
                let tPos = getPixels(t.r, t.c);
                let target = state.enemies.find(e => Math.hypot(e.x - tPos.x, e.y - tPos.y) <= t.range * 30);
                if (target) {
                    // Shoot
                    let proj = { x: tPos.x, y: tPos.y, target: target, dmg: t.damage, el: document.createElement('div') };
                    proj.el.className = 'projectile';
                    entitiesEl.appendChild(proj.el);
                    state.projectiles.push(proj);
                    t.cooldown = t.maxCooldown;
                }
            }
        });

        // Projectiles
        for (let i = state.projectiles.length - 1; i >= 0; i--) {
            let p = state.projectiles[i];
            if (!state.enemies.includes(p.target)) {
                p.el.remove();
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
                    p.target.el.remove();
                    state.enemies.splice(state.enemies.indexOf(p.target), 1);
                    updateUI();
                }
                p.el.remove();
                state.projectiles.splice(i, 1);
            } else {
                p.x += (dx/dist) * 5;
                p.y += (dy/dist) * 5;
                p.el.style.left = p.x + 'px';
                p.el.style.top = p.y + 'px';
            }
        }

        if (enemiesToSpawn === 0 && state.enemies.length === 0) {
            state.waveActive = false;
            updateUI();
        }
    }

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
requestAnimationFrame(loop);
