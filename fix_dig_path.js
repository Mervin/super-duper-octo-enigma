const fs = require('fs');
let code = fs.readFileSync('games/island_td/script.js', 'utf8');

// Fix updateFogExposure call in btnDig.onclick
code = code.replace(
`        updateUI();
        recalculatePaths();
    }
};`,
`        updateFogExposure();
        updateUI();
        recalculatePaths();
    }
};`);

fs.writeFileSync('games/island_td/script.js', code);
