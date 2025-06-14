document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const gestureArea = document.getElementById('gestureArea');
    const gestureFeedback = document.querySelector('.gesture-feedback');
    const gestureOutput = document.getElementById('gestureOutput');
    const clearBtn = document.getElementById('clearBtn');
    const handToggle = document.getElementById('handToggle');
    const instructionsSection = document.getElementById('instructionsSection');
    const gestureListItems = document.querySelectorAll('.gesture-list li');
    const canvas = document.getElementById('touchCanvas');
    const ctx = canvas.getContext('2d');
    const contentContainer = document.querySelector('.content-container');
    
    // Setup
    function initCanvas() {
        canvas.width = gestureArea.offsetWidth;
        canvas.height = gestureArea.offsetHeight;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }
    initCanvas();
    
    // State
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentGame = null;
    let score = 0;
    let gameActive = false;
    let targets = [];
    let currentPath = null;
    let pressTimer = null;
    let fadingInterval = null;
    let fadeAlpha = 1;
    const FADE_SPEED = 0.01;
    let isRightHanded = true;

    // Initialize Hammer.js
    const mc = new Hammer.Manager(gestureArea, {
        recognizers: [
            [Hammer.Tap, { event: 'singletap', taps: 1 }],
            [Hammer.Tap, { event: 'doubletap', taps: 2 }],
            [Hammer.Press, { time: 500 }],
            [Hammer.Pan, { threshold: 0, pointers: 1 }],
            [Hammer.Pinch, { threshold: 0 }],
            [Hammer.Rotate, { threshold: 0 }]
        ]
    });

    // Configure recognizer relationships
    mc.get('pinch').recognizeWith('rotate');
    mc.get('rotate').recognizeWith('pinch');
    mc.get('pan').requireFailure('pinch');
    mc.get('pan').requireFailure('rotate');

    // Event Listeners
    window.addEventListener('resize', initCanvas);
    clearBtn.addEventListener('click', resetAll);
    handToggle.addEventListener('click', toggleHandOrientation);
    
    gestureListItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            clearWithEffect();
            setTimeout(() => startGame(item.dataset.gesture), 300);
        });
    });

    // Hand orientation toggle
    function toggleHandOrientation() {
        isRightHanded = !isRightHanded;
        
        if (isRightHanded) {
            instructionsSection.classList.remove('instructions-left');
            instructionsSection.classList.add('instructions-right');
            handToggle.innerHTML = '<i class="fas fa-hand-point-right"></i> Right Hand';
        } else {
            instructionsSection.classList.remove('instructions-right');
            instructionsSection.classList.add('instructions-left');
            handToggle.innerHTML = '<i class="fas fa-hand-point-left"></i> Left Hand';
        }
        
        // Force reflow to ensure smooth transition
        void instructionsSection.offsetWidth;
    }

    // Drawing with Hammer.js pan events
    mc.on('panstart', (e) => {
        if (gameActive) return;
        startDrawing(e);
    });
    
    mc.on('panmove', (e) => {
        if (gameActive) return;
        draw(e);
    });
    
    mc.on('panend', () => {
        if (!gameActive) endDrawing();
    });

    // ======================
    // RELOAD & CLEARING FUNCTIONS
    // ======================

    function clearWithEffect() {
    // Stop any ongoing fade effects but preserve drawing state
    if (fadingInterval) {
        clearInterval(fadingInterval);
        fadingInterval = null;
    }
    
    // Add visual effect
    gestureArea.style.transition = 'opacity 0.2s';
    gestureArea.style.opacity = '0.7';
    
    // Clear immediately but keep the ability to draw again
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reset visual state
    setTimeout(() => {
        gestureArea.style.opacity = '1';
        fadeAlpha = 1; // Reset alpha for new drawings
    }, 200);
}

    function resetAll() {
    endCurrentGame();
    clearWithEffect();
    gestureOutput.innerHTML = '<p>Perform a gesture to see feedback</p>';
    
    // Reset drawing state completely
    resetDrawingState();
}

function resetDrawingState() {
    isDrawing = false;
    fadeAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Clear any pending fade intervals
    if (fadingInterval) {
        clearInterval(fadingInterval);
        fadingInterval = null;
    }
    
    // Reset canvas styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0, 122, 255, 1)'; // Reset to initial color
    ctx.lineWidth = 5;
    ctx.globalAlpha = 1;
}

    // ======================
    // DRAWING FUNCTIONS
    // ======================
    function initDrawingState() {
    isDrawing = false;
    lastX = 0;
    lastY = 0;
    fadeAlpha = 1;
    fadingInterval = null;
    
    ctx.strokeStyle = 'rgba(0, 122, 255, 1)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 1;
}


    function startDrawing(e) {
    if (gameActive) return;
    
    // Clear any existing fade
    if (fadingInterval) {
        clearInterval(fadingInterval);
        fadingInterval = null;
    }
    
    isDrawing = true;
    fadeAlpha = 1; // Reset alpha for new drawing
    ctx.strokeStyle = `rgba(0, 122, 255, ${fadeAlpha})`; // Ensure color is set
    const pos = getPosition(e.srcEvent);
    [lastX, lastY] = [pos.x, pos.y];
}

function draw(e) {
    if (!isDrawing || gameActive) return;
    
    const pos = getPosition(e.srcEvent);
    
    // Draw with current fade alpha
    ctx.strokeStyle = `rgba(0, 122, 255, ${fadeAlpha})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    [lastX, lastY] = [pos.x, pos.y];
}

function endDrawing() {
    if (!isDrawing || gameActive) return;
    
    isDrawing = false;
    startFading();
}

function startFading() {
    // Clear any existing fade interval
    if (fadingInterval) {
        clearInterval(fadingInterval);
    }
    
    fadingInterval = setInterval(() => {
        fadeAlpha = Math.max(0, fadeAlpha - FADE_SPEED);
        
        if (fadeAlpha <= 0) {
            clearInterval(fadingInterval);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        
        // Redraw existing content with new alpha
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.globalAlpha = fadeAlpha;
        tempCtx.drawImage(canvas, 0, 0);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
    }, 50);
}

    function getPosition(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    // ======================
    // GAME SYSTEM
    // ======================

    function startGame(gestureType) {
        clearWithEffect();
        endCurrentGame();
        gameActive = true;
        score = 0;
        currentGame = gestureType;
        
        gestureOutput.innerHTML = `
            <div class="game-header">
                <h3>${gestureType.toUpperCase()} PRACTICE</h3>
                <div class="score">Score: <span>0</span></div>
            </div>
            <p>${getGameInstruction(gestureType)}</p>
        `;
        
        switch(gestureType) {
            case 'tap':
                setupTapGame();
                break;
            case 'doubletap':
                setupDoubleTapGame();
                break;
            case 'press':
                setupPressGame();
                break;
            case 'pan':
                setupSwipeGame();
                break;
            case 'pinch':
                setupPinchGame();
                break;
            case 'rotate':
                setupRotateGame();
                break;
        }
    }

    function endCurrentGame() {
    gameActive = false;
    currentGame = null; // Explicitly set to null
    score = 0; // Reset score
    targets = [];
    currentPath = null;
    clearTimeout(pressTimer);
    
    if (fadingInterval) {
        clearInterval(fadingInterval);
        fadingInterval = null;
    }
    
    isDrawing = false;
    fadeAlpha = 1;
    
    mc.off('singletap doubletap press panend pinchend rotateend');
}

    // ======================
    // TAP GAME
    // ======================

    function setupTapGame() {
        createTapTarget();
        mc.on('singletap', handleTap);
    }

    function createTapTarget() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const size = 40 + Math.random() * 30;
        const x = size + Math.random() * (canvas.width - size * 2);
        const y = size + Math.random() * (canvas.height - size * 2);
        
        targets = [{ x, y, size }];
        
        ctx.fillStyle = 'rgba(0, 122, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#007aff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function handleTap(e) {
        if (!gameActive || currentGame !== 'tap') return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.center.x - rect.left;
        const y = e.center.y - rect.top;
        
        targets.forEach(target => {
            const dist = Math.sqrt((x - target.x) ** 2 + (y - target.y) ** 2);
            if (dist <= target.size) {
                score++;
                updateScore();
                showSuccess(target.x, target.y, 'Good!');
                setTimeout(createTapTarget, 500);
            }
        });
    }

    // ======================
    // DOUBLE TAP GAME
    // ======================

    function setupDoubleTapGame() {
        createDoubleTapTarget();
        mc.on('doubletap', handleDoubleTap);
    }

    function createDoubleTapTarget() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const size = 50;
        const x = size + Math.random() * (canvas.width - size * 2);
        const y = size + Math.random() * (canvas.height - size * 2);
        
        targets = [{ x, y, size }];
        
        ctx.fillStyle = 'rgba(255, 149, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff9500';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function handleDoubleTap(e) {
        if (!gameActive || currentGame !== 'doubletap') return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.center.x - rect.left;
        const y = e.center.y - rect.top;
        
        targets.forEach(target => {
            const dist = Math.sqrt((x - target.x) ** 2 + (y - target.y) ** 2);
            if (dist <= target.size) {
                score++;
                updateScore();
                showSuccess(target.x, target.y, 'Perfect!');
                setTimeout(createDoubleTapTarget, 500);
            }
        });
    }

    // ======================
    // PRESS GAME
    // ======================

    function setupPressGame() {
        createPressTarget();
        mc.on('press', handlePress);
    }

    function createPressTarget() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const size = 60;
        const x = size + Math.random() * (canvas.width - size * 2);
        const y = size + Math.random() * (canvas.height - size * 2);
        
        targets = [{ x, y, size }];
        
        ctx.fillStyle = 'rgba(255, 59, 48, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff3b30';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function handlePress(e) {
        if (!gameActive || currentGame !== 'press') return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.center.x - rect.left;
        const y = e.center.y - rect.top;
        
        targets.forEach(target => {
            const dist = Math.sqrt((x - target.x) ** 2 + (y - target.y) ** 2);
            if (dist <= target.size) {
                score++;
                updateScore();
                showSuccess(target.x, target.y, 'Well held!');
                setTimeout(createPressTarget, 800);
            }
        });
    }

    // ======================
    // SWIPE GAME
    // ======================

    function setupSwipeGame() {
        createSwipePath();
        mc.on('panend', handleSwipe);
    }

    function createSwipePath() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const startX = 50 + Math.random() * 100;
        const startY = 50 + Math.random() * 100;
        const endX = canvas.width - 50 - Math.random() * 100;
        const endY = canvas.height - 50 - Math.random() * 100;
        
        currentPath = { startX, startY, endX, endY };
        
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#5856d6';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw start/end points
        ctx.fillStyle = '#5856d6';
        ctx.beginPath();
        ctx.arc(startX, startY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(endX, endY, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    function handleSwipe(e) {
        if (!gameActive || currentGame !== 'pan') return;
        
        const angle = Math.atan2(e.deltaY, e.deltaX) * 180 / Math.PI;
        const pathAngle = Math.atan2(
            currentPath.endY - currentPath.startY, 
            currentPath.endX - currentPath.startX
        ) * 180 / Math.PI;
        
        if (Math.abs(angle - pathAngle) < 30) {
            score++;
            updateScore();
            showSuccess(currentPath.endX, currentPath.endY, 'Great swipe!');
            setTimeout(createSwipePath, 800);
        }
    }

    // ======================
    // PINCH GAME
    // ======================

    function setupPinchGame() {
        createPinchTargets();
        mc.on('pinchend', handlePinch);
    }

    function createPinchTargets() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const distance = 120;
        const size = 40;
        
        targets = [
            { x: centerX - distance, y: centerY, size },
            { x: centerX + distance, y: centerY, size }
        ];
        
        ctx.fillStyle = 'rgba(175, 82, 222, 0.3)';
        targets.forEach(target => {
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#af52de';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }

    function handlePinch(e) {
        if (!gameActive || currentGame !== 'pinch') return;
        
        const [target1, target2] = targets;
        const dist1 = distance(e.pointers[0], target1);
        const dist2 = distance(e.pointers[1], target2);
        
        if (dist1 < target1.size && dist2 < target2.size) {
            score++;
            updateScore();
            showSuccess(canvas.width/2, canvas.height/2, 'Perfect pinch!');
            setTimeout(createPinchTargets, 800);
        }
    }

    // ======================
    // ROTATE GAME
    // ======================

    function setupRotateGame() {
        createRotateTargets();
        mc.on('rotateend', handleRotate);
    }

    function createRotateTargets() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const distance = 100;
        const size = 30;
        
        targets = [
            { x: centerX - distance, y: centerY, size },
            { x: centerX + distance, y: centerY, size }
        ];
        
        ctx.fillStyle = 'rgba(52, 199, 89, 0.3)';
        targets.forEach(target => {
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#34c759';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }

    function handleRotate(e) {
        if (!gameActive || currentGame !== 'rotate') return;
        
        const [target1, target2] = targets;
        const dist1 = distance(e.pointers[0], target1);
        const dist2 = distance(e.pointers[1], target2);
        
        if (dist1 < target1.size && dist2 < target2.size && Math.abs(e.rotation) > 30) {
            score++;
            updateScore();
            showSuccess(canvas.width/2, canvas.height/2, 
                e.rotation > 0 ? 'Nice rotation!' : 'Good counter-rotation!');
            setTimeout(createRotateTargets, 800);
        }
    }

    // ======================
    // HELPER FUNCTIONS
    // ======================

    function distance(point, target) {
        const rect = canvas.getBoundingClientRect();
        const x = point.clientX - rect.left;
        const y = point.clientY - rect.top;
        return Math.sqrt((x - target.x) ** 2 + (y - target.y) ** 2);
    }

    function updateScore() {
        const scoreEl = gestureOutput.querySelector('.score span');
        if (scoreEl) scoreEl.textContent = score;
    }

    function showSuccess(x, y, message) {
        ctx.fillStyle = 'rgba(52, 199, 89, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, 50, 0, Math.PI * 2);
        ctx.fill();
        
        const feedback = document.createElement('div');
        feedback.className = 'success-feedback';
        feedback.textContent = message;
        feedback.style.left = `${x}px`;
        feedback.style.top = `${y}px`;
        gestureArea.appendChild(feedback);
        
        setTimeout(() => feedback.remove(), 1000);
    }

    /*function returnToFreeMode() {
        endCurrentGame();
        clearWithEffect();
        isDrawing = false;
        fadeAlpha = 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }*/

    function getGameInstruction(gesture) {
        const instructions = {
            tap: 'Tap the blue circles as they appear!',
            doubletap: 'Double tap the orange circles!',
            press: 'Press and hold the red circles!',
            pan: 'Swipe along the dotted path!',
            pinch: 'Pinch the purple circles together!',
            rotate: 'Rotate the green circles around each other!',
            free: 'Return to free drawing mode'
        };
        return instructions[gesture];
    }

    // Basic gesture detection (non-game mode)
    mc.on('singletap', () => showFeedback('Tap detected', 'tap'));
    mc.on('doubletap', () => showFeedback('Double tap detected', 'doubletap'));
    mc.on('press', () => showFeedback('Press detected', 'press'));
    mc.on('panstart', () => showFeedback('Swipe started', 'pan'));
    mc.on('pinchstart', () => showFeedback('Pinch detected', 'pinch'));
    mc.on('rotatestart', () => showFeedback('Rotate detected', 'rotate'));

    function showFeedback(message, type) {
        if (gameActive) return;
        
        gestureFeedback.className = `gesture-feedback ${type}-feedback feedback-active`;
        gestureFeedback.textContent = message;
        setTimeout(() => gestureFeedback.className = 'gesture-feedback', 1000);
    }

});

