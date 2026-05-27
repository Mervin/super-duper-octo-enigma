const fs = require('fs');

let mainJs = fs.readFileSync('main.js', 'utf8');

const elementsJson = fs.readFileSync('elements.json', 'utf8');
const moleculesJson = fs.readFileSync('molecules.json', 'utf8');

// Use a more specific regex to avoid matching across other arrays
mainJs = mainJs.replace(/const ELEMENTS = \[\s*\{[\s\S]*?\}\s*\]\s*;/m, `const ELEMENTS = ${elementsJson};`);
mainJs = mainJs.replace(/const MOLECULES = \[\s*\{[\s\S]*?\}\s*\]\s*;/m, `const MOLECULES = ${moleculesJson};`);

fs.writeFileSync('main.js', mainJs);
