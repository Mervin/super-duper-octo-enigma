import { database } from '../../firebase-config.js';
import { ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// DOM
const renderContainer = document.getElementById('render-container');
const drawCanvas = document.getElementById('draw-canvas');
const ctx = drawCanvas.getContext('2d');
const statusMsg = document.getElementById('status-msg');

const tools = {
    draw: document.getElementById('btn-draw'),
    erase: document.getElementById('btn-erase'),
    startPos: document.getElementById('btn-start-pos'),
    finishPos: document.getElementById('btn-finish-pos'),
    danger: document.getElementById('btn-danger')
};

const btnPlay = document.getElementById('btn-play');
const btnStop = document.getElementById('btn-stop');
const btnClear = document.getElementById('btn-clear');
const btnShare = document.getElementById('btn-share');

const shareContainer = document.getElementById('share-container');
const shareLinkInput = document.getElementById('share-link');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnCloseShare = document.getElementById('btn-close-share');

const screens = {
    complete: document.getElementById('level-complete-screen'),
    failed: document.getElementById('level-failed-screen')
};

document.getElementById('btn-back-editor').addEventListener('click', stopSimulation);
document.getElementById('btn-retry').addEventListener('click', () => { stopSimulation(); startSimulation(); });
document.getElementById('btn-edit').addEventListener('click', stopSimulation);

// State
let currentTool = 'draw';
let isDrawing = false;
let isPlaying = false;
let currentPath = []; // Points for the line currently being drawn
let lastPoint = null;

// Track Data (to be serialized for sharing)
let trackData = {
    lines: [],    // { path: [{x,y}...], type: 'normal'|'danger' }
    startPos: { x: 100, y: 100 },
    finishPos: null // {x, y, w, h}
};

// Physics (Matter.js)
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Composite = Matter.Composite,
      Bodies = Matter.Bodies,
      Body = Matter.Body,
      Vector = Matter.Vector,
      Events = Matter.Events;

let engine, render, runner;
let riderBody = null;
let staticBodies = []; // Keeps track of bodies added to world to clear them later
let finishZone = null;
let dangerBodies = [];

// Pan & Zoom state (Camera)
let camera = { x: 0, y: 0, scale: 1 };
let isPanning = false;
let panStart = { x: 0, y: 0 };

// Initialize
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    setupTools();
    setupDrawing();
    initPhysics();
    setupCameraControls();

    checkUrlForTrack();
}

function resizeCanvas() {
    const wrapper = document.querySelector('.canvas-wrapper');
    drawCanvas.width = wrapper.clientWidth;
    drawCanvas.height = wrapper.clientHeight;

    if (render) {
        render.canvas.width = wrapper.clientWidth;
        render.canvas.height = wrapper.clientHeight;
        render.options.width = wrapper.clientWidth;
        render.options.height = wrapper.clientHeight;
    }

    redrawEditor();
}

function setupTools() {
    Object.keys(tools).forEach(key => {
        tools[key].addEventListener('click', () => {
            if (isPlaying) return;
            Object.values(tools).forEach(btn => btn.classList.remove('active'));
            tools[key].classList.add('active');
            currentTool = key;
        });
    });

    btnPlay.addEventListener('click', startSimulation);
    btnStop.addEventListener('click', stopSimulation);
    btnClear.addEventListener('click', clearTrack);
    btnShare.addEventListener('click', shareTrack);

    btnCopyLink.addEventListener('click', () => {
        shareLinkInput.select();
        document.execCommand('copy');
        btnCopyLink.textContent = "Copied!";
        setTimeout(() => btnCopyLink.textContent = "Copy", 2000);
    });
    btnCloseShare.addEventListener('click', () => shareContainer.classList.add('hidden'));
}

// --- EDITOR LOGIC (Screen Coordinates to World Coordinates) ---

function screenToWorld(sx, sy) {
    return {
        x: (sx - drawCanvas.width/2) / camera.scale + camera.x,
        y: (sy - drawCanvas.height/2) / camera.scale + camera.y
    };
}

function worldToScreen(wx, wy) {
    return {
        x: (wx - camera.x) * camera.scale + drawCanvas.width/2,
        y: (wy - camera.y) * camera.scale + drawCanvas.height/2
    };
}

function setupDrawing() {
    drawCanvas.addEventListener('mousedown', (e) => {
        if (isPlaying) return;

        // Handle Panning (Middle click or Space+Left Click ideally, but let's use Right Click for panning)
        if (e.button === 2) {
            isPanning = true;
            panStart = { x: e.clientX, y: e.clientY };
            return;
        }

        if (e.button !== 0) return;

        const pos = screenToWorld(e.offsetX, e.offsetY);

        if (currentTool === 'draw' || currentTool === 'danger') {
            isDrawing = true;
            currentPath = [pos];
            lastPoint = pos;
        } else if (currentTool === 'startPos') {
            trackData.startPos = pos;
            redrawEditor();
        } else if (currentTool === 'finishPos') {
            trackData.finishPos = { x: pos.x, y: pos.y, w: 100, h: 100 };
            redrawEditor();
        } else if (currentTool === 'erase') {
            eraseAt(pos);
        }
    });

    drawCanvas.addEventListener('mousemove', (e) => {
        if (isPanning) {
            const dx = (e.clientX - panStart.x) / camera.scale;
            const dy = (e.clientY - panStart.y) / camera.scale;
            camera.x -= dx;
            camera.y -= dy;
            panStart = { x: e.clientX, y: e.clientY };
            redrawEditor();
            updateMatterCamera();
            return;
        }

        if (!isDrawing || isPlaying) return;

        const pos = screenToWorld(e.offsetX, e.offsetY);

        // Smooth drawing by only adding points if distance > threshold
        if (Matter.Vector.magnitude(Matter.Vector.sub(pos, lastPoint)) > 10 / camera.scale) {
            currentPath.push(pos);
            lastPoint = pos;
            redrawEditor();
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 2) {
            isPanning = false;
        }
        if (e.button === 0 && isDrawing) {
            isDrawing = false;
            if (currentPath.length > 1) {
                trackData.lines.push({
                    path: currentPath,
                    type: currentTool === 'danger' ? 'danger' : 'normal'
                });
            }
            currentPath = [];
            redrawEditor();
        }
    });

    // Prevent context menu
    drawCanvas.addEventListener('contextmenu', e => e.preventDefault());

    // Zoom
    drawCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1;
        camera.scale = Math.max(0.1, Math.min(5, camera.scale * zoomAmount));
        redrawEditor();
        updateMatterCamera();
    });
}

function eraseAt(worldPos) {
    const threshold = 20 / camera.scale;
    trackData.lines = trackData.lines.filter(line => {
        for (let p of line.path) {
            if (Matter.Vector.magnitude(Matter.Vector.sub(p, worldPos)) < threshold) {
                return false; // Erase this line
            }
        }
        return true;
    });
    redrawEditor();
}

function redrawEditor() {
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    // Draw all lines
    trackData.lines.forEach(line => drawLine(line.path, line.type));

    // Draw current line
    if (currentPath.length > 0) {
        drawLine(currentPath, currentTool === 'danger' ? 'danger' : 'normal');
    }

    // Draw Start Pos
    if (trackData.startPos) {
        const sp = worldToScreen(trackData.startPos.x, trackData.startPos.y);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 10 * camera.scale, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText("Start", sp.x - 15, sp.y - 15);
    }

    // Draw Finish Pos
    if (trackData.finishPos) {
        const f = trackData.finishPos;
        const s_tl = worldToScreen(f.x - f.w/2, f.y - f.h/2);
        const s_w = f.w * camera.scale;
        const s_h = f.h * camera.scale;

        ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
        ctx.fillRect(s_tl.x, s_tl.y, s_w, s_h);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.strokeRect(s_tl.x, s_tl.y, s_w, s_h);

        // Checkerboard pattern
        ctx.fillStyle = '#22c55e';
        const cw = s_w/5;
        const ch = s_h/5;
        for(let i=0; i<5; i++) {
            for(let j=0; j<5; j++) {
                if((i+j)%2===0) ctx.fillRect(s_tl.x + i*cw, s_tl.y + j*ch, cw, ch);
            }
        }
    }
}

function drawLine(path, type) {
    if (path.length < 2) return;

    ctx.beginPath();
    const start = worldToScreen(path[0].x, path[0].y);
    ctx.moveTo(start.x, start.y);

    for (let i = 1; i < path.length; i++) {
        const p = worldToScreen(path[i].x, path[i].y);
        ctx.lineTo(p.x, p.y);
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4 * camera.scale;

    if (type === 'danger') {
        ctx.strokeStyle = '#ef4444';
        // Add spikes visually
        ctx.stroke();
    } else {
        ctx.strokeStyle = '#cbd5e1';
        ctx.stroke();
    }
}

function clearTrack() {
    if (confirm("Clear all lines?")) {
        trackData.lines = [];
        redrawEditor();
    }
}

// --- PHYSICS & SIMULATION ---

function initPhysics() {
    engine = Engine.create();

    render = Render.create({
        element: renderContainer,
        engine: engine,
        options: {
            width: drawCanvas.width,
            height: drawCanvas.height,
            wireframes: false,
            background: 'transparent',
            hasBounds: true // Enable camera
        }
    });

    runner = Runner.create();

    // Collision Events
    Events.on(engine, 'collisionStart', (event) => {
        if (!isPlaying) return;
        const pairs = event.pairs;

        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];

            // Check Finish
            if ((pair.bodyA === riderBody && pair.bodyB === finishZone) ||
                (pair.bodyB === riderBody && pair.bodyA === finishZone)) {
                handleWin();
            }

            // Check Danger
            if (dangerBodies.includes(pair.bodyA) && isRiderPart(pair.bodyB) ||
                dangerBodies.includes(pair.bodyB) && isRiderPart(pair.bodyA)) {
                handleDeath();
            }
        }
    });
}

function isRiderPart(body) {
    // Rider is composite, but we check if the body belongs to the rider composite
    return body === riderBody; // simplified for ragdoll root or main body
}

function startSimulation() {
    if (isPlaying) return;
    isPlaying = true;

    // UI
    drawCanvas.classList.add('disabled');
    btnPlay.classList.add('hidden');
    btnStop.classList.remove('hidden');
    statusMsg.textContent = "Playing...";
    statusMsg.style.color = '#22c55e';
    screens.complete.classList.add('hidden');
    screens.failed.classList.add('hidden');

    // Build World
    Composite.clear(engine.world);
    Engine.clear(engine);
    staticBodies = [];
    dangerBodies = [];

    // 1. Build Lines
    trackData.lines.forEach(line => {
        for (let i = 0; i < line.path.length - 1; i++) {
            const p1 = line.path[i];
            const p2 = line.path[i+1];

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx*dx + dy*dy);
            const cx = p1.x + dx/2;
            const cy = p1.y + dy/2;
            const angle = Math.atan2(dy, dx);

            const body = Bodies.rectangle(cx, cy, len, 6, {
                isStatic: true,
                angle: angle,
                friction: 0.1,
                render: { fillStyle: line.type === 'danger' ? '#ef4444' : '#cbd5e1' }
            });

            Composite.add(engine.world, body);
            staticBodies.push(body);
            if (line.type === 'danger') dangerBodies.push(body);
        }
    });

    // 2. Build Finish Zone
    if (trackData.finishPos) {
        finishZone = Bodies.rectangle(trackData.finishPos.x, trackData.finishPos.y, trackData.finishPos.w, trackData.finishPos.h, {
            isStatic: true,
            isSensor: true, // Don't physically collide
            render: { fillStyle: 'rgba(34, 197, 94, 0.3)' }
        });
        Composite.add(engine.world, finishZone);
        staticBodies.push(finishZone);
    } else {
        finishZone = null;
    }

    // 3. Create Rider (Simple Stick Figure / Ball for now)
    // To make it interesting, a sled-like compound body
    const x = trackData.startPos.x;
    const y = trackData.startPos.y;

    riderBody = Bodies.circle(x, y - 20, 12, {
        restitution: 0.2,
        friction: 0.05,
        density: 0.05,
        render: { fillStyle: '#38bdf8' }
    });

    Composite.add(engine.world, riderBody);

    // Start Engine
    Render.run(render);
    Runner.run(runner, engine);

    // Setup camera tracking update loop
    Events.on(engine, 'beforeUpdate', trackCamera);

    // Hide editor drawing
    ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
}

function stopSimulation() {
    isPlaying = false;

    // UI
    drawCanvas.classList.remove('disabled');
    btnPlay.classList.remove('hidden');
    btnStop.classList.add('hidden');
    statusMsg.textContent = "Editor Mode";
    statusMsg.style.color = '#94a3b8';
    screens.complete.classList.add('hidden');
    screens.failed.classList.add('hidden');

    // Stop Engine
    Render.stop(render);
    Runner.stop(runner);
    Events.off(engine, 'beforeUpdate', trackCamera);

    // Clear World
    Composite.clear(engine.world);
    Engine.clear(engine);

    // Restore Editor Camera
    updateMatterCamera(); // Reset matter bounds just in case
    redrawEditor();
}

function trackCamera() {
    if (!riderBody) return;

    // Smoothly follow rider
    const targetX = riderBody.position.x;
    const targetY = riderBody.position.y;

    camera.x += (targetX - camera.x) * 0.1;
    camera.y += (targetY - camera.y) * 0.1;

    updateMatterCamera();

    // Death by falling too far down
    if (riderBody.position.y > camera.y + 2000) {
        handleDeath();
    }
}

function updateMatterCamera() {
    if (!render) return;

    const w = drawCanvas.width / camera.scale;
    const h = drawCanvas.height / camera.scale;

    Render.lookAt(render, {
        min: { x: camera.x - w/2, y: camera.y - h/2 },
        max: { x: camera.x + w/2, y: camera.y + h/2 }
    });
}

function handleWin() {
    if(!isPlaying) return;
    Events.off(engine, 'beforeUpdate', trackCamera);
    screens.complete.classList.remove('hidden');
}

function handleDeath() {
    if(!isPlaying) return;
    Events.off(engine, 'beforeUpdate', trackCamera);
    screens.failed.classList.remove('hidden');
}

// --- SHARING (FIREBASE) ---

function shareTrack() {
    if (trackData.lines.length === 0) {
        alert("Draw a track first!");
        return;
    }

    statusMsg.textContent = "Saving...";

    // Compress data slightly (round numbers to reduce string size)
    const compressedLines = trackData.lines.map(line => ({
        type: line.type,
        p: line.path.map(pt => [Math.round(pt.x), Math.round(pt.y)])
    }));

    const dataToSave = {
        l: compressedLines,
        s: { x: Math.round(trackData.startPos.x), y: Math.round(trackData.startPos.y) },
        f: trackData.finishPos ? {
            x: Math.round(trackData.finishPos.x),
            y: Math.round(trackData.finishPos.y),
            w: Math.round(trackData.finishPos.w),
            h: Math.round(trackData.finishPos.h)
        } : null
    };

    const trackId = Math.random().toString(36).substring(2, 9);

    set(ref(database, `tracks/${trackId}`), dataToSave).then(() => {
        statusMsg.textContent = "Editor Mode";
        const link = `${window.location.origin}${window.location.pathname}?track=${trackId}`;
        shareLinkInput.value = link;
        shareContainer.classList.remove('hidden');
    }).catch(e => {
        console.error(e);
        statusMsg.textContent = "Error saving";
    });
}

function checkUrlForTrack() {
    const urlParams = new URLSearchParams(window.location.search);
    const trackId = urlParams.get('track');
    if (trackId) {
        statusMsg.textContent = "Loading Track...";
        get(child(ref(database), `tracks/${trackId}`)).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();

                // Decompress
                trackData.lines = (data.l || []).map(line => ({
                    type: line.type,
                    path: line.p.map(arr => ({ x: arr[0], y: arr[1] }))
                }));
                trackData.startPos = { x: data.s.x, y: data.s.y };
                trackData.finishPos = data.f ? { x: data.f.x, y: data.f.y, w: data.f.w, h: data.f.h } : null;

                // Center camera on start
                camera.x = trackData.startPos.x;
                camera.y = trackData.startPos.y;

                statusMsg.textContent = "Editor Mode";
                redrawEditor();
                updateMatterCamera();
            } else {
                alert("Track not found!");
                statusMsg.textContent = "Editor Mode";
            }
        });
    }
}

// Start
window.onload = init;