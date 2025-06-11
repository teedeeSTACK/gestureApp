document.addEventListener('DOMContentLoaded', function() {
    const gestureArea = document.getElementById('gestureArea');
    const gestureFeedback = document.querySelector('.gesture-feedback');
    const touchPoint = document.getElementById('touchPoint');
    const gestureOutput = document.getElementById('gestureOutput');
    const clearBtn = document.getElementById('clearBtn');
    const gestureListItems = document.querySelectorAll('.gesture-list li');
    
    // Set up canvas for touch tracing
    const canvas = document.getElementById('touchCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = gestureArea.offsetWidth;
    canvas.height = gestureArea.offsetHeight;
    
    // Variables for fading traces
    let traceOpacity = 1;
    let fadeInterval;
    const fadeDuration = 3000; // 3 seconds to fully fade
    let drawingHistory = [];
    
    // Adjust canvas on resize
    window.addEventListener('resize', function() {
        canvas.width = gestureArea.offsetWidth;
        canvas.height = gestureArea.offsetHeight;
        redrawCanvas();
    });
    
    // Initialize Hammer.js
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
    
    // Variables for touch tracking
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let touchCount = 0;
    
    // Clear canvas
    clearBtn.addEventListener('click', function() {
        clearCanvas();
        gestureOutput.innerHTML = '<p>Perform a gesture to see feedback here</p>';
    });
    
    // Set up gesture list interactions
    gestureListItems.forEach(item => {
        item.addEventListener('click', function() {
            const gesture = this.getAttribute('data-gesture');
            showGestureInstruction(gesture);
        });
    });
    
    // Show instructions for specific gesture
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
    
    // Handle touch start for drawing
    gestureArea.addEventListener('touchstart', handleTouchStart);
    gestureArea.addEventListener('mousedown', handleMouseDown);
    
    // Handle touch move for drawing
    gestureArea.addEventListener('touchmove', handleTouchMove);
    gestureArea.addEventListener('mousemove', handleMouseMove);
    
    // Handle touch end
    gestureArea.addEventListener('touchend', handleTouchEnd);
    gestureArea.addEventListener('mouseup', handleTouchEnd);
    gestureArea.addEventListener('mouseleave', handleTouchEnd);
    
    function handleTouchStart(e) {
        isDrawing = true;
        touchCount = e.touches ? e.touches.length : 1;
        
        const x = e.touches ? e.touches[0].clientX - gestureArea.getBoundingClientRect().left : e.clientX - gestureArea.getBoundingClientRect().left;
        const y = e.touches ? e.touches[0].clientY - gestureArea.getBoundingClientRect().top : e.clientY - gestureArea.getBoundingClientRect().top;
        
        lastX = x;
        lastY = y;
        
        // Reset opacity when new touch starts
        traceOpacity = 1;
        clearInterval(fadeInterval);
        ctx.globalAlpha = 1;
        drawingHistory = [];
        
        // Show touch point
        touchPoint.style.left = `${x}px`;
        touchPoint.style.top = `${y}px`;
        touchPoint.style.opacity = '1';
        touchPoint.style.width = `${touchCount * 20}px`;
        touchPoint.style.height = `${touchCount * 20}px`;
        
        // Record starting point
        drawingHistory.push({
            type: 'begin',
            x: x,
            y: y,
            width: touchCount * 20,
            time: Date.now()
        });
    }
    
    function handleMouseDown(e) {
        if (e.button !== 0) return; // Only left mouse button
        handleTouchStart(e);
    }
    
    function handleTouchMove(e) {
        if (!isDrawing) return;
        
        const x = e.touches ? e.touches[0].clientX - gestureArea.getBoundingClientRect().left : e.clientX - gestureArea.getBoundingClientRect().left;
        const y = e.touches ? e.touches[0].clientY - gestureArea.getBoundingClientRect().top : e.clientY - gestureArea.getBoundingClientRect().top;
        
        // Update touch point position
        touchPoint.style.left = `${x}px`;
        touchPoint.style.top = `${y}px`;
        
        // Draw the line with current opacity
        ctx.globalAlpha = traceOpacity;
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#007aff';
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Record the drawing action
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
        if (!isDrawing) return;
        handleTouchMove(e);
    }
    
    function handleTouchEnd() {
        isDrawing = false;
        
        // Hide touch point with delay
        setTimeout(() => {
            touchPoint.style.opacity = '0';
        }, 200);
        
        // Start fading out traces
        startFadingTraces();
    }
    
    // Function to fade traces
    function startFadingTraces() {
        // Clear any existing fade interval
        clearInterval(fadeInterval);
        
        // Reset opacity
        traceOpacity = 1;
        ctx.globalAlpha = traceOpacity;
        
        // Start fading
        fadeInterval = setInterval(() => {
            traceOpacity -= 0.05;
            ctx.globalAlpha = traceOpacity;
            
            // Redraw canvas with new opacity
            redrawCanvas();
            
            if (traceOpacity <= 0) {
                clearInterval(fadeInterval);
                clearCanvas();
            }
        }, fadeDuration / 20); // Divide by 20 for smooth fading (20 steps)
    }
    
    // Function to redraw the entire canvas from history
    function redrawCanvas() {
        clearCanvas(false); // Clear without resetting history
        
        // Redraw all paths with current opacity
        ctx.globalAlpha = traceOpacity;
        
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
    
    // Function to completely clear canvas
    function clearCanvas(resetHistory = true) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        traceOpacity = 1;
        
        if (resetHistory) {
            drawingHistory = [];
        }
    }
    
    // Gesture recognition handlers
    mc.on('tap', function(e) {
        showFeedback('tap', 'Tap detected');
        drawCircle(e.center.x, e.center.y, 30, 'rgba(52, 199, 89, 0.5)');
    });
    
    mc.on('doubletap', function(e) {
        showFeedback('doubletap', 'Double tap detected');
        drawCircle(e.center.x, e.center.y, 40, 'rgba(255, 149, 0, 0.5)');
    });
    
    mc.on('press', function(e) {
        showFeedback('press', 'Press and hold detected');
        drawCircle(e.center.x, e.center.y, 50, 'rgba(255, 59, 48, 0.5)');
    });
    
    mc.on('panstart panmove panend', function(e) {
        if (e.type === 'panstart') {
            showFeedback('pan', 'Swiping detected');
        }
        
        // Draw swipe path
        if (e.type !== 'panend') {
            drawCircle(e.center.x, e.center.y, 10, 'rgba(88, 86, 214, 0.5)');
        }
    });
    
    mc.on('pinchstart pinchmove pinchend', function(e) {
        if (e.type === 'pinchstart') {
            showFeedback('pinch', e.scale > 1 ? 'Pinch out (zoom in) detected' : 'Pinch in (zoom out) detected');
        }
        
        // Draw pinch points
        if (e.type !== 'pinchend') {
            drawCircle(e.pointers[0].clientX - gestureArea.getBoundingClientRect().left, 
                       e.pointers[0].clientY - gestureArea.getBoundingClientRect().top, 
                       15, 'rgba(175, 82, 222, 0.5)');
            drawCircle(e.pointers[1].clientX - gestureArea.getBoundingClientRect().left, 
                       e.pointers[1].clientY - gestureArea.getBoundingClientRect().top, 
                       15, 'rgba(175, 82, 222, 0.5)');
        }
    });
    
    mc.on('rotatestart rotatemove rotateend', function(e) {
        if (e.type === 'rotatestart') {
            showFeedback('rotate', 'Rotation detected');
        }
        
        // Draw rotation points
        if (e.type !== 'rotateend') {
            drawCircle(e.pointers[0].clientX - gestureArea.getBoundingClientRect().left, 
                       e.pointers[0].clientY - gestureArea.getBoundingClientRect().top, 
                       15, 'rgba(255, 45, 85, 0.5)');
            drawCircle(e.pointers[1].clientX - gestureArea.getBoundingClientRect().left, 
                       e.pointers[1].clientY - gestureArea.getBoundingClientRect().top, 
                       15, 'rgba(255, 45, 85, 0.5)');
            
            // Draw line between points
            ctx.beginPath();
            ctx.moveTo(e.pointers[0].clientX - gestureArea.getBoundingClientRect().left, 
                      e.pointers[0].clientY - gestureArea.getBoundingClientRect().top);
            ctx.lineTo(e.pointers[1].clientX - gestureArea.getBoundingClientRect().left, 
                      e.pointers[1].clientY - gestureArea.getBoundingClientRect().top);
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(255, 45, 85, 0.5)';
            ctx.stroke();
        }
    });
    
    // Show visual feedback for gestures
    function showFeedback(gestureType, message) {
        // Reset and apply new feedback
        gestureFeedback.className = 'gesture-feedback feedback-active';
        gestureFeedback.classList.add(`${gestureType}-feedback`);
        
        // Update output
        gestureOutput.innerHTML = `<p><strong>${gestureType}:</strong> ${message}</p>`;
        
        // Hide feedback after delay
        setTimeout(() => {
            gestureFeedback.classList.remove('feedback-active');
        }, 1000);
    }
    
    // Helper function to draw circles
    function drawCircle(x, y, radius, color) {
        ctx.globalAlpha = traceOpacity;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }
});