document.addEventListener('DOMContentLoaded', function() {
    const gestureArea = document.getElementById('gestureArea');
    const gestureFeedback = document.querySelector('.gesture-feedback');
    const touchPoint = document.getElementById('touchPoint');
    const gestureOutput = document.getElementById('gestureOutput');
    const clearBtn = document.getElementById('clearBtn');
    const gestureListItems = document.querySelectorAll('.gesture-list li');
    
    // Set up canvas
    const canvas = document.getElementById('touchCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = gestureArea.offsetWidth;
    canvas.height = gestureArea.offsetHeight;
    
    // Tracing variables
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let traceOpacity = 1;
    let fadeInterval;
    const fadeDuration = 3000;
    let drawingHistory = [];
    
    // Initialize Hammer.js with adjusted thresholds
    const mc = new Hammer.Manager(gestureArea, {
        recognizers: [
            [Hammer.Tap, { event: 'tap', taps: 1, threshold: 9 }],
            [Hammer.Tap, { event: 'doubletap', taps: 2 }],
            [Hammer.Press, { time: 500 }],
            [Hammer.Pan, { direction: Hammer.DIRECTION_ALL, threshold: 5 }],
            [Hammer.Pinch, { enable: true, threshold: 0.1 }],
            [Hammer.Rotate, { enable: true, threshold: 5 }]
        ]
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        canvas.width = gestureArea.offsetWidth;
        canvas.height = gestureArea.offsetHeight;
        redrawCanvas();
    });
    
    // Clear button
    clearBtn.addEventListener('click', clearAll);

    // Gesture list instructions
    gestureListItems.forEach(item => {
        item.addEventListener('click', function() {
            const gesture = this.getAttribute('data-gesture');
            showGestureInstruction(gesture);
        });
    });

    // Unified gesture handler
    mc.on('tap press panstart pinchstart rotatestart', function(e) {
        if(isDrawing && e.type !== 'panstart') return;
        
        const gestureMap = {
            'tap': ['tap', 'Tap detected'],
            'press': ['press', 'Press detected'],
            'panstart': ['pan', 'Swipe detected'],
            'pinchstart': ['pinch', e.scale > 1 ? 'Pinch out detected' : 'Pinch in detected'],
            'rotatestart': ['rotate', 'Rotation detected']
        };
        
        const [gestureType, message] = gestureMap[e.type];
        showFeedback(gestureType, message);
        
        // Don't trace multi-touch gestures
        if(['pinchstart', 'rotatestart'].includes(e.type)) {
            isDrawing = false;
            return;
        }
        
        // Start tracing for single-touch gestures
        handleTouchStart(e);
    });

    // Handle double taps separately
    mc.on('doubletap', function(e) {
        showFeedback('doubletap', 'Double tap detected');
        drawCircle(getCoord(e, 'x'), getCoord(e, 'y'), 40, 'rgba(255, 149, 0, 0.5)');
    });

    // Touch/mouse handlers
    gestureArea.addEventListener('touchstart', handleTouchStart);
    gestureArea.addEventListener('mousedown', handleMouseDown);
    gestureArea.addEventListener('touchmove', handleTouchMove);
    gestureArea.addEventListener('mousemove', handleMouseMove);
    gestureArea.addEventListener('touchend', handleTouchEnd);
    gestureArea.addEventListener('mouseup', handleTouchEnd);
    gestureArea.addEventListener('mouseleave', handleTouchEnd);

    function handleTouchStart(e) {
        isDrawing = true;
        const x = getCoord(e, 'x');
        const y = getCoord(e, 'y');
        
        lastX = x;
        lastY = y;
        
        // Reset fading
        traceOpacity = 1;
        clearInterval(fadeInterval);
        ctx.globalAlpha = 1;
        drawingHistory = [];
        
        // Show touch point
        updateTouchPoint(x, y, e.touches ? e.touches.length : 1);
        
        // Record starting point
        drawingHistory.push({
            type: 'begin',
            x: x,
            y: y,
            time: Date.now()
        });
    }

    function handleMouseDown(e) {
        if (e.button === 0) handleTouchStart(e);
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

    function handleMouseMove(e) {
        if (isDrawing) handleTouchMove(e);
    }

    function handleTouchEnd() {
        isDrawing = false;
        touchPoint.style.opacity = '0';
        startFadingTraces();
    }

    function updateTouchPoint(x, y, count = 1) {
        touchPoint.style.left = `${x}px`;
        touchPoint.style.top = `${y}px`;
        touchPoint.style.width = `${count * 20}px`;
        touchPoint.style.height = `${count * 20}px`;
        touchPoint.style.opacity = '1';
    }

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

    function startFadingTraces() {
        clearInterval(fadeInterval);
        traceOpacity = 1;
        ctx.globalAlpha = traceOpacity;
        
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < drawingHistory.length; i++) {
            const action = drawingHistory[i];
            
            if (action.type === 'move') {
                ctx.beginPath();
                ctx.moveTo(action.fromX, action.fromY);
                ctx.lineTo(action.toX, action.toY);
                ctx.lineWidth = 5;
                ctx.strokeStyle = '#007aff';
                ctx.lineCap = 'round';
                ctx.stroke();
            }
        }
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        traceOpacity = 1;
        drawingHistory = [];
    }

    function clearAll() {
        clearCanvas();
        gestureOutput.innerHTML = '<p>Perform a gesture to see feedback here</p>';
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
});
