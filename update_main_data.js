const fs = require('fs');

let mainJs = fs.readFileSync('main.js', 'utf8');

const elementsJson = fs.readFileSync('elements.json', 'utf8');
const moleculesJson = fs.readFileSync('molecules.json', 'utf8');

// Replace ELEMENTS
mainJs = mainJs.replace(/const ELEMENTS = \[[\s\S]*?\];/, `const ELEMENTS = ${elementsJson};`);

// Replace MOLECULES
mainJs = mainJs.replace(/const MOLECULES = \[[\s\S]*?\];/, `const MOLECULES = ${moleculesJson};`);

fs.writeFileSync('main.js', mainJs);
