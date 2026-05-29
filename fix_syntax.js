const fs = require('fs');
let code = fs.readFileSync('games/island_td/script.js', 'utf8');

// The syntax error is due to an unmatched brace. Let's fix it by properly closing the onclick handlers.
let lines = code.split('\n');
let newLines = [];
let i = 0;
while (i < lines.length) {
    if (lines[i].includes(`let upgCdEl = document.getElementById('btn-upg-tower-cd');`)) {
        newLines.push(lines[i]);
        i++;
        newLines.push(lines[i]); // if (upgCdEl) {
        i++;
        newLines.push(lines[i]); // upgCdEl.onclick = () => {
        i++;
        newLines.push(lines[i]); // if(!state.selectedTile) return;
        i++;
        newLines.push(lines[i]); // let tower = ...
        i++;
        newLines.push(lines[i]); // if(tower && tower.upgrades.cd < 3) {
        i++;
        newLines.push(lines[i]); // let cost = 10 + tower.upgrades.cd * 5;
        i++;
        newLines.push(lines[i]); // if(state.gold >= cost) {
        i++;
        newLines.push(lines[i]); // state.gold -= cost;
        i++;
        newLines.push(lines[i]); // tower.upgrades.cd++;
        i++;
        newLines.push(lines[i]); // tower.maxCooldown = Math.max(5, Math.floor(tower.maxCooldown * 0.9));
        i++;
        newLines.push(lines[i]); // updateUI();
        i++;
        newLines.push(lines[i]); // }
        i++;
        newLines.push(lines[i]); // }
        i++;
        newLines.push(lines[i]); // };
        i++;
        newLines.push(`}`);
        // skip the stray brace if any
        if (lines[i] && lines[i].trim() === '}') i++;
        continue;
    }

    newLines.push(lines[i]);
    i++;
}
fs.writeFileSync('games/island_td/script.js', newLines.join('\n'));
