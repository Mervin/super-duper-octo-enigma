const fs = require('fs');

const card = { suit: '♠', value: '10', faceUp: true, color: 'black', id: '♠10' };
let num = parseInt(card.value);
let symbols = '';
const layouts = {
    10: [[25, 15, false], [75, 15, false], [50, 26, false], [25, 38, false], [75, 38, false], [25, 62, true], [75, 62, true], [50, 74, true], [25, 85, true], [75, 85, true]]
};
let layout = layouts[num] || [];
for(let pos of layout) {
    let flipClass = pos[2] ? 'flipped' : '';
    symbols += `<div class="sym ${flipClass}" style="left: ${pos[0]}%; top: ${pos[1]}%;">${card.suit}</div>\n`;
}
console.log("Spades symbols count:", symbols.split('<div').length - 1);

const card2 = { suit: '♥', value: '10', faceUp: true, color: 'red', id: '♥10' };
num = parseInt(card2.value);
symbols = '';
layout = layouts[num] || [];
for(let pos of layout) {
    let flipClass = pos[2] ? 'flipped' : '';
    symbols += `<div class="sym ${flipClass}" style="left: ${pos[0]}%; top: ${pos[1]}%;">${card2.suit}</div>\n`;
}
console.log("Hearts symbols count:", symbols.split('<div').length - 1);
