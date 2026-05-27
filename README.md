# Idle Games Hub

A web-based hub containing a collection of idle, strategy, and classic games. All games are built using HTML, CSS, and Vanilla JavaScript, requiring no build steps. They also feature English/Czech localization toggles.

## Available Games

### 1. Atomic Idle
Harvest quarks, synthesize base elements, merge upwards to create heavier elements, and discover complex molecules. Features a prestige "Cosmic Reset" system.

### 2. Farm Idle
A Farmville-like clone where you manage plots of land, plant seeds, wait in real-time, and harvest crops for profit. Includes offline progression!

### 3. Island TD
A rogue-like Tower Defense game. Click on fog-of-war tiles to reveal the island, uncover treasures, or accidentally dig a path for enemies to spawn. Build towers and survive waves to earn permanent upgrades.

### 4. Minesweeper
The classic puzzle game. Supports standard difficulties (Beginner, Intermediate, Expert) and custom grid/mine settings.

### 5. Solitaire
Classic Klondike Solitaire with drag-and-drop mechanics.

### 6. Spider Solitaire
Spider Solitaire supporting 1-suit, 2-suit, and 4-suit difficulties. Drag and drop sequences to complete your decks.

## How to run locally

Since there are no build steps, you can simply serve the directory using any static file server.

For example, using Python 3:
```bash
python3 -m http.server 3000
```
Then navigate to `http://localhost:3000` in your web browser. Click on any game card to launch it!
