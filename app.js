document.addEventListener('DOMContentLoaded', function () {
    const gestureArea = document.getElementById('gestureArea');
    const gestureFeedback = document.querySelector('.gesture-feedback');
    const touchPoint = document.getElementById('touchPoint');
    const gestureOutput = document.getElementById('gestureOutput');
    const clearBtn = document.getElementById('clearBtn');
    const gestureListItems = document.querySelectorAll('.gesture-list li');
    const canvas = document.getElementById('touchCanvas');
    const ctx = canvas.getContext('2d');

    // HiDPI Canvas Setup
    function setupCanvasSize() {
        const scale = window.devicePixelRatio || 1;
        canvas.width = gestureArea.offsetWidth * scale;
        canvas.height = gestureArea.offsetHeight * scale;
        canvas.style.width = `${gestureArea.offsetWidth}px`;
        canvas.style.height = `${gestureArea.offsetHeight}px`;
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
    }

    setupCanvasSize();
    window.addEventListener('resize', () => {
        setupCanvasSize();
        redrawCanvas();
    });

    // Gesture Manager
    const mc = new Hammer.Manager(gestureArea, {
        recognizers: [
            [Hammer.Tap, { event: 'tap', taps: 1 }],
            [Hammer.Tap, { event: 'doubletap', taps: 2 }],
            [Hammer.Press, { time: 500 }],
            [Hammer.Pan, { direction: Hammer.DIRECTION_ALL, threshold: 10 }],
            [Hammer.Pinch, { enable: true }],
            [Hammer.Rotate, { enable: true }]
        ]
    });

    // Drawing control
    let isDrawing = false;
    let suppressDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let touchCount = 0;
    let traceOpacity = 1;
    let fadeInterval;
    const fadeDuration = 3000;
    let drawingHistory = [];

    // Clear canvas
    clearBtn.addEventListener('click', () => {
        clearCanvas();
        gestureOutput.innerHTML = '<p>Perform a gesture to see feedback here</p>';
    });

    // Keyboard shortcut (R = reset)
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'r') clearCanvas();
    });

    // Gesture list interaction + highlight
    gestureListItems.forEach(item => {
        item.addEventListener('click', function () {
            gestureListItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            showGestureInstruction(this.getAttribute('data-gesture'));
        });
    });

    function showGestureInstruction(gesture) {
        const instructions = {
            tap: 'Tap once anywhere in the blue area',
            doubletap: 'Quickly tap twice in the same spot',
            press: 'Press and hold for about half a second',
            pan: 'Swipe in any direction (try up, down, left, right)',
            pinch: 'Place two fingers and pinch in or out',
            rotate: 'Place two fingers and rotate them'
        };
        gestureOutput.innerHTML = `<p><strong>${gesture}:</strong> ${instructions[gesture]}</p>`;
    }

    // Drawing handlers
    gestureArea.addEventListener('touchstart', handleStart);
    gestureArea.addEventListener('mousedown', e => { if (e.button === 0) handleStart(e); });
    gestureArea.addEventListener('touchmove', handleMove);
    gestureArea.addEventListener('mousemove', handleMove);
    gestureArea.addEventListener('touchend', handleEnd);
    gestureArea.addEventListener('mouseup', handleEnd);
    gestureArea.addEventListener('mouseleave', handleEnd);

    function handleStart(e) {
        if (suppressDrawing) return;
        isDrawing = true;
        touchCount = e.touches ? e.touches.length : 1;

        const { x, y } = getRelativePos(e);
        lastX = x;
        lastY = y;

        resetFade();
        drawingHistory = [];

        // Visual touch point
        touchPoint.style.left = `${x}px`;
        touchPoint.style.top = `${y}px`;
        touchPoint.style.opacity = '1';
        touchPoint.style.width = `${touchCount * 20}px`;
        touchPoint.style.height = `${touchCount * 20}px`;

        drawingHistory.push({ type: 'begin', x, y, width: touchCount * 20, time: Date.now() });
    }

    function handleMove(e) {
        if (!isDrawing || suppressDrawing) return;

        const { x, y } = getRelativePos(e);

        ctx.globalAlpha = traceOpacity;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#007aff';
        ctx.lineCap = 'round';
        ctx.stroke();

        touchPoint.style.left = `${x}px`;
        touchPoint.style.top = `${y}px`;

        drawingHistory.push({ type: 'move', fromX: lastX, fromY: lastY, toX: x, toY: y, time: Date.now() });

        lastX = x;
        lastY = y;
    }

    function handleEnd() {
        isDrawing = false;
        setTimeout(() => { touchPoint.style.opacity = '0'; }, 200);
        startFadingTraces();
    }

    function getRelativePos(e) {
        const bounds = gestureArea.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - bounds.left, y: clientY - bounds.top };
    }

    function resetFade() {
        traceOpacity = 1;
        clearInterval(fadeInterval);
        ctx.globalAlpha = 1;
    }

    function startFadingTraces() {
        clearInterval(fadeInterval);
        traceOpacity = 1;

        fadeInterval = setInterval(() => {
            traceOpacity -= 0.05;
            ctx.globalAlpha = traceOpacity;
            redrawCanvas();
            if (traceOpacity <= 0) {
                clearInterval(fadeInterval);
                clearCanvas();
            }
        }, fadeDuration / 20);
    }

    function redrawCanvas() {
        clearCanvas(false);
        ctx.globalAlpha = traceOpacity;
        drawingHistory.forEach(action => {
            if (action.type === 'move') {
                ctx.beginPath();
                ctx.moveTo(action.fromX, action.fromY);
                ctx.lineTo(action.toX, action.toY);
                ctx.lineWidth = 5;
                ctx.strokeStyle = '#007aff';
                ctx.stroke();
            }
        });
    }

    function clearCanvas(resetHistory = true) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        traceOpacity = 1;
        if (resetHistory) drawingHistory = [];
    }

    // Gesture recognition + suppress drawing during gestures
    mc.on('tap', e => {
        suppressDrawing = true;
        showFeedback('tap', 'Tap detected');
        drawCircle(e.center.x, e.center.y, 30, 'rgba(52, 199, 89, 0.5)');
        resetSuppress();
    });

    mc.on('doubletap', e => {
        suppressDrawing = true;
        showFeedback('doubletap', 'Double tap detected');
        drawCircle(e.center.x, e.center.y, 40, 'rgba(255, 149, 0, 0.5)');
        resetSuppress();
    });

    mc.on('press', e => {
        suppressDrawing = true;
        showFeedback('press', 'Press and hold detected');
        drawCircle(e.center.x, e.center.y, 50, 'rgba(255, 59, 48, 0.5)');
        resetSuppress();
    });

    mc.on('panstart panmove panend', e => {
        suppressDrawing = true;
        if (e.type === 'panstart') {
            showFeedback('pan', 'Swiping detected');
        } else if (e.type === 'panend') {
            const directions = {
                2: 'left',
                4: 'right',
                8: 'up',
                16: 'down'
            };
            const dir = directions[e.direction] || 'unknown direction';
            showFeedback('pan', `Swipe ${dir} detected`);
        }
        drawCircle(e.center.x, e.center.y, 10, 'rgba(88, 86, 214, 0.5)');
        if (e.type === 'panend') resetSuppress();
    });

    mc.on('pinchstart pinchmove pinchend', e => {
        suppressDrawing = true;
        if (e.type === 'pinchstart') {
            showFeedback('pinch', e.scale > 1 ? 'Pinch out (zoom in) detected' : 'Pinch in (zoom out) detected');
        }
        e.pointers.forEach(p => {
            const { left, top } = gestureArea.getBoundingClientRect();
            drawCircle(p.clientX - left, p.clientY - top, 15, 'rgba(175, 82, 222, 0.5)');
        });
        if (e.type === 'pinchend') resetSuppress();
    });

    mc.on('rotatestart rotatemove rotateend', e => {
        suppressDrawing = true;
        if (e.type === 'rotatestart') showFeedback('rotate', 'Rotation detected');
        if (e.pointers.length === 2) {
            const { left, top } = gestureArea.getBoundingClientRect();
            const [p1, p2] = e.pointers;
            drawCircle(p1.clientX - left, p1.clientY - top, 15, 'rgba(255, 45, 85, 0.5)');
            drawCircle(p2.clientX - left, p2.clientY - top, 15, 'rgba(255, 45, 85, 0.5)');
            ctx.beginPath();
            ctx.moveTo(p1.clientX - left, p1.clientY - top);
            ctx.lineTo(p2.clientX - left, p2.clientY - top);
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(255, 45, 85, 0.5)';
            ctx.stroke();
        }
        if (e.type === 'rotateend') resetSuppress();
    });

    function resetSuppress() {
        setTimeout(() => suppressDrawing = false, 300);
    }

    function showFeedback(type, message) {
        gestureFeedback.className = 'gesture-feedback feedback-active';
        gestureFeedback.classList.add(`${type}-feedback`);
        gestureOutput.innerHTML = `<p><strong>${type}:</strong> ${message}</p>`;
        setTimeout(() => gestureFeedback.classList.remove('feedback-active'), 1000);
    }

    function drawCircle(x, y, r, color) {
        ctx.globalAlpha = traceOpacity;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }
});
