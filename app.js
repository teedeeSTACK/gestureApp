document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const gestureArea = document.getElementById('gestureArea');
    const gestureFeedback = document.querySelector('.gesture-feedback');
    const touchPoint = document.getElementById('touchPoint');
    const gestureOutput = document.getElementById('gestureOutput');
    const clearBtn = document.getElementById('clearBtn');
    const gestureListItems = document.querySelectorAll('.gesture-list li');
    const canvas = document.getElementById('touchCanvas');
    const ctx = canvas.getContext('2d');
    
    // Setup
    canvas.width = gestureArea.offsetWidth;
    canvas.height = gestureArea.offsetHeight;
    
    // State
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let traceOpacity = 1;
    let fadeInterval;
    const fadeDuration = 3000;
    let drawingHistory = [];
    let currentGesture = null;
    let panStartAngle = null;

    // Initialize Hammer.js
    const mc = new Hammer.Manager(gestureArea, {
        recognizers: [
            [Hammer.Tap, { event: 'tap', taps: 1 }],
            [Hammer.Tap, { event: 'doubletap', taps: 2 }],
            [Hammer.Press, { time: 500 }],
            [Hammer.Pan, { direction: Hammer.DIRECTION_ALL, threshold: 5 }],
            [Hammer.Pinch, { enable: true }],
            [Hammer.Rotate, { enable: true }]
        ]
    });

    // Event Listeners
    window.addEventListener('resize', handleResize);
    clearBtn.addEventListener('click', clearAll);
    gestureListItems.forEach(item => {
        item.addEventListener('click', () => showGestureInstruction(item.getAttribute('data-gesture')));
    });

    // Hammer.js Gesture Handlers
    mc.on('tap', (e) => handleGesture('tap', 'Tap detected', e));
    mc.on('doubletap', (e) => handleGesture('doubletap', 'Double tap detected', e));
    mc.on('press', (e) => handleGesture('press', 'Press detected', e));
    mc.on('panstart', (e) => {
        panStartAngle = getAngle(e.deltaX, e.deltaY);
        handleGesture('pan', 'Swipe started', e);
    });
    mc.on('panend', (e) => {
        const angle = getAngle(e.deltaX, e.deltaY);
        const direction = getSwipeDirection(angle);
        handleGesture('pan', `Swipe ${direction}`, e);
    });
    mc.on('pinchstart', (e) => handleGesture('pinch', 'Pinch started', e));
    mc.on('pinchend', (e) => {
        const type = e.scale > 1 ? 'Pinch out' : 'Pinch in';
        handleGesture('pinch', `${type} detected`, e);
    });
    mc.on('rotatestart', (e) => handleGesture('rotate', 'Rotation started', e));
    mc.on('rotateend', (e) => {
        const direction = e.rotation > 0 ? 'clockwise' : 'counter-clockwise';
        handleGesture('rotate', `Rotated ${direction}`, e);
    });

    // Touch/Mouse Handlers
    gestureArea.addEventListener('touchstart', handleTouchStart);
    gestureArea.addEventListener('mousedown', handleMouseDown);
    gestureArea.addEventListener('touchmove', handleTouchMove);
    gestureArea.addEventListener('mousemove', handleMouseMove);
    gestureArea.addEventListener('touchend', handleTouchEnd);
    gestureArea.addEventListener('mouseup', handleTouchEnd);
    gestureArea.addEventListener('mouseleave', handleTouchEnd);

    // Core Functions
    function handleGesture(type, message, event) {
        currentGesture = type;
        showFeedback(type, message);
        
        // Visual markers for gestures
        switch(type) {
            case 'tap':
                drawCircle(getCoord(event, 'x'), getCoord(event, 'y'), 30, 'rgba(52, 199, 89, 0.5)');
                break;
            case 'doubletap':
                drawCircle(getCoord(event, 'x'), getCoord(event, 'y'), 40, 'rgba(255, 149, 0, 0.5)');
                break;
            case 'press':
                drawCircle(getCoord(event, 'x'), getCoord(event, 'y'), 50, 'rgba(255, 59, 48, 0.5)');
                break;
        }
        
        // Start tracing for single-point gestures
        if(!['pinch', 'rotate'].includes(type)) {
            handleTouchStart(event);
        }
    }

    function handleTouchStart(e) {
        if(currentGesture && ['pinch', 'rotate'].includes(currentGesture)) return;
        
        // Stop any active fading
        clearInterval(fadeInterval);
        traceOpacity = 1;
        ctx.globalAlpha = traceOpacity;
        
        isDrawing = true;
        const x = getCoord(e, 'x');
        const y = getCoord(e, 'y');
        
        lastX = x;
        lastY = y;
        
        // Show touch point
        updateTouchPoint(x, y, e.touches ? e.touches.length : 1);
        
        // Record starting point
        drawingHistory = [{
            type: 'begin',
            x: x,
            y: y,
            time: Date.now()
        }];
    }

    function handleTouchMove(e) {
        if (!isDrawing) return;
        
        const x = getCoord(e, 'x');
        const y = getCoord(e, 'y');
        
        updateTouchPoint(x, y);
        
        // Draw the line
        ctx.globalAlpha = traceOpacity;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#007aff';
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Record the movement
        drawingHistory.push({
            type: 'move',
            fromX: lastX,
            fromY: lastY,
            toX: x,
            toY: y,
            time: Date.now()
        });
        
        lastX = x;
        lastY = y;
    }

    function handleTouchEnd() {
        if (!isDrawing) return;
        
        isDrawing = false;
        currentGesture = null;
        touchPoint.style.opacity = '0';
        
        // Start fading traces
        startFadingTraces();
    }

    // Direction Detection Functions
    function getAngle(dx, dy) {
        return Math.atan2(dy, dx) * 180 / Math.PI;
    }

    function getSwipeDirection(angle) {
        if (angle < 0) angle += 360;

        if (angle >= 337.5 || angle < 22.5) return "right";
        if (angle >= 22.5 && angle < 67.5) return "down-right";
        if (angle >= 67.5 && angle < 112.5) return "down";
        if (angle >= 112.5 && angle < 157.5) return "down-left";
        if (angle >= 157.5 && angle < 202.5) return "left";
        if (angle >= 202.5 && angle < 247.5) return "up-left";
        if (angle >= 247.5 && angle < 292.5) return "up";
        if (angle >= 292.5 && angle < 337.5) return "up-right";
    }

    // Fading Functions
    function startFadingTraces() {
        clearInterval(fadeInterval);
        traceOpacity = 1;
        
        // Create a snapshot of the current drawing
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCtx.drawImage(canvas, 0, 0);
        
        fadeInterval = setInterval(() => {
            traceOpacity -= 0.05;
            
            // Clear and redraw with new opacity
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = traceOpacity;
            ctx.drawImage(tempCanvas, 0, 0);
            
            if (traceOpacity <= 0) {
                clearInterval(fadeInterval);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }, fadeDuration / 20);
    }

    // Helper Functions
    function getCoord(e, axis) {
        const rect = gestureArea.getBoundingClientRect();
        if (e.touches) {
            return axis === 'x' 
                ? e.touches[0].clientX - rect.left 
                : e.touches[0].clientY - rect.top;
        }
        return axis === 'x' 
            ? e.clientX - rect.left 
            : e.clientY - rect.top;
    }

    function updateTouchPoint(x, y, count = 1) {
        touchPoint.style.left = `${x}px`;
        touchPoint.style.top = `${y}px`;
        touchPoint.style.width = `${count * 20}px`;
        touchPoint.style.height = `${count * 20}px`;
        touchPoint.style.opacity = '1';
    }

    function drawCircle(x, y, radius, color) {
        ctx.globalAlpha = traceOpacity;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function showFeedback(gestureType, message) {
        gestureFeedback.className = 'gesture-feedback feedback-active';
        gestureFeedback.classList.add(`${gestureType}-feedback`);
        gestureOutput.innerHTML = `<p><strong>${gestureType}:</strong> ${message}</p>`;
        
        setTimeout(() => {
            gestureFeedback.classList.remove('feedback-active');
        }, 1000);
    }

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

    function clearAll() {
        clearInterval(fadeInterval);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        traceOpacity = 1;
        drawingHistory = [];
        gestureOutput.innerHTML = '<p>Perform a gesture to see feedback here</p>';
    }

    function handleResize() {
        canvas.width = gestureArea.offsetWidth;
        canvas.height = gestureArea.offsetHeight;
    }

    function handleMouseDown(e) {
        if (e.button === 0) handleTouchStart(e);
    }

    function handleMouseMove(e) {
        if (isDrawing) handleTouchMove(e);
    }
});
