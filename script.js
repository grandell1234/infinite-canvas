const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let isDrawing = false;
let isErasing = false;
let currentColor = 'white';
let sparkleEffect = true;
let lastX = 0;
let lastY = 0;
let offsetX = 0;
let offsetY = 0;
let isMoving = false;
let startX = 0;
let startY = 0;
let drawnPaths = [];
let currentStroke = [];
let zoomLevel = 1;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function distanceToLine(x, y, line) {
    const a = { x: line.startX, y: line.startY };
    const b = { x: line.endX, y: line.endY };
    const p = { x, y };
    
    const lengthSquared = Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);
    if (lengthSquared === 0) return Math.sqrt(Math.pow(p.x - a.x, 2) + Math.pow(p.y - a.y, 2));
    
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
    
    const projection = {
        x: a.x + t * (b.x - a.x),
        y: a.y + t * (b.y - a.y)
    };
    
    return Math.sqrt(Math.pow(p.x - projection.x, 2) + Math.pow(p.y - projection.y, 2));
}

function draw(e) {
    if (!isDrawing) return;

    const currentX = (e.clientX / zoomLevel) + offsetX;
    const currentY = (e.clientY / zoomLevel) + offsetY;

    if (isErasing) {
        const eraserRadius = 10 * zoomLevel;
        drawnPaths = drawnPaths.filter(path => {
            if (path.isPoint) {
                const dx = path.startX - currentX;
                const dy = path.startY - currentY;
                return Math.sqrt(dx * dx + dy * dy) > eraserRadius;
            }
            const distance = distanceToLine(currentX, currentY, {
                startX: path.startX,
                startY: path.startY,
                endX: path.endX,
                endY: path.endY
            });
            return distance > eraserRadius;
        });
        
        drawBackground();
        redrawPaths();
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 5 * zoomLevel;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo((lastX - offsetX) * zoomLevel, (lastY - offsetY) * zoomLevel);
        ctx.lineTo((currentX - offsetX) * zoomLevel, (currentY - offsetY) * zoomLevel);
        ctx.stroke();

        if (sparkleEffect) {
            const sparkleSize = Math.min(2, Math.random() * 3) * zoomLevel;
            ctx.fillStyle = currentColor;
            ctx.beginPath();
            ctx.arc(
                (currentX - offsetX) * zoomLevel,
                (currentY - offsetY) * zoomLevel,
                sparkleSize,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        currentStroke.push({
            color: ctx.strokeStyle,
            lineWidth: 5,
            startX: lastX,
            startY: lastY,
            endX: currentX,
            endY: currentY,
            sparkle: sparkleEffect,
            sparkleX: currentX,
            sparkleY: currentY,
            sparkleRadius: Math.min(2, Math.random() * 3)
        });
    }

    [lastX, lastY] = [currentX, currentY];
}

function moveCanvas(e) {
    if (!isMoving) return;

    const newOffsetX = offsetX + (e.clientX - startX);
    const newOffsetY = offsetY + (e.clientY - startY);
    
    if (newOffsetX !== offsetX || newOffsetY !== offsetY) {
        offsetX = newOffsetX;
        offsetY = newOffsetY;
        drawBackground();
        redrawPaths();
    }

    startX = e.clientX;
    startY = e.clientY;
}

function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    const gridSize = 20 * zoomLevel;
    
    for (let x = (-offsetX * zoomLevel) % gridSize; x < canvas.width; x += gridSize) {
        for (let y = (-offsetY * zoomLevel) % gridSize; y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.arc(x, y, zoomLevel, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function redrawPaths() {
    drawnPaths.forEach(path => {
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.lineWidth * zoomLevel;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (path.isPoint) {
            ctx.beginPath();
            ctx.arc(
                (path.startX - offsetX) * zoomLevel, 
                (path.startY - offsetY) * zoomLevel, 
                (path.lineWidth / 4) * zoomLevel, 
                0, 
                Math.PI * 2
            );
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo((path.startX - offsetX) * zoomLevel, (path.startY - offsetY) * zoomLevel);
            ctx.lineTo((path.endX - offsetX) * zoomLevel, (path.endY - offsetY) * zoomLevel);
            ctx.stroke();

            if (path.sparkle) {
                ctx.fillStyle = path.color;
                ctx.beginPath();
                ctx.arc(
                    (path.sparkleX - offsetX) * zoomLevel, 
                    (path.sparkleY - offsetY) * zoomLevel, 
                    path.sparkleRadius * zoomLevel, 
                    0, 
                    Math.PI * 2
                );
                ctx.fill();
            }
        }
    });
}

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        isDrawing = true;
        lastX = (e.clientX / zoomLevel) + offsetX;
        lastY = (e.clientY / zoomLevel) + offsetY;
        
        currentStroke = [];
        
        ctx.strokeStyle = isErasing ? 'black' : currentColor;
        const baseLineWidth = isErasing ? 20 : 5;
        ctx.lineWidth = baseLineWidth * zoomLevel;
        ctx.lineCap = 'round';
        
        const pointSize = (baseLineWidth / 8) * zoomLevel;
        ctx.beginPath();
        ctx.arc(
            (lastX - offsetX) * zoomLevel,
            (lastY - offsetY) * zoomLevel,
            pointSize,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        currentStroke.push({
            color: ctx.strokeStyle,
            lineWidth: baseLineWidth,
            startX: lastX,
            startY: lastY,
            endX: lastX,
            endY: lastY,
            isPoint: true
        });
    } else if (e.button === 2) {
        isMoving = true;
        startX = e.clientX;
        startY = e.clientY;
    }
});

canvas.addEventListener('mousemove', (e) => {
    draw(e);
    moveCanvas(e);
});

canvas.addEventListener('mouseup', () => {
    if (isDrawing && currentStroke.length > 0) {
        drawnPaths.push(...currentStroke);
    }
    isDrawing = false;
    isMoving = false;
});

canvas.addEventListener('mouseout', () => {
    isDrawing = false;
    isMoving = false;
});

document.querySelectorAll('.color').forEach(color => {
    color.addEventListener('click', () => {
        currentColor = color.style.backgroundColor;
        isErasing = false;
    });
});

document.querySelector('.eraser').addEventListener('click', () => {
    isErasing = true;
    sparkleEffect = false;
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawBackground();
    redrawPaths();
});

drawBackground();

document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        const lastStrokeLength = currentStroke.length > 0 ? currentStroke.length : 
            drawnPaths.length - drawnPaths.findLastIndex(path => path.isPoint);
        if (lastStrokeLength > 0) {
            drawnPaths.splice(-lastStrokeLength);
            drawBackground();
            redrawPaths();
        }
    }
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const mouseX = (e.clientX / zoomLevel) + offsetX;
    const mouseY = (e.clientY / zoomLevel) + offsetY;
    
    const zoomFactor = 0.05;
    const oldZoom = zoomLevel;
    
    if (e.deltaY < 0) {
        zoomLevel *= (1 + zoomFactor);
    } else {
        zoomLevel *= (1 - zoomFactor);
    }
    
    zoomLevel = Math.min(Math.max(0.1, zoomLevel), 10);
    
    if (oldZoom !== zoomLevel) {
        offsetX = mouseX - (e.clientX / zoomLevel);
        offsetY = mouseY - (e.clientY / zoomLevel);
        
        drawBackground();
        redrawPaths();
    }
});