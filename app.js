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
  
    function resizeCanvas() {
      canvas.width = gestureArea.offsetWidth;
      canvas.height = gestureArea.offsetHeight;
    }
  
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  
    // Variables for fading traces
    let traceOpacity = 1;
    let fadeInterval;
    const fadeDuration = 3000; // 3 seconds to fully fade
    let drawingHistory = [];
  
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
  
    // Function to fade traces
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
  
    // Function to redraw the entire canvas from history
    function redrawCanvas() {
      clearCanvas(false);
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
  
    // Show visual feedback for gestures
    function showFeedback(gestureType, message) {
      gestureFeedback.className = 'gesture-feedback feedback-active';
      gestureFeedback.classList.add(`${gestureType}-feedback`);
  
      gestureOutput.innerHTML = `<p><strong>${gestureType}:</strong> ${message}</p>`;
  
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
  
    // Initialize ZingTouch
    const region = new ZingTouch.Region(gestureArea);
  
    // Tap Gesture
    region.bind(gestureArea, 'tap', function(e) {
      const x = e.detail.events[0].clientX - gestureArea.getBoundingClientRect().left;
      const y = e.detail.events[0].clientY - gestureArea.getBoundingClientRect().top;
      showFeedback('tap', 'Tap detected');
      drawCircle(x, y, 30, 'rgba(52, 199, 89, 0.5)');
      startFadingTraces();
    });
  
    // Pan Gesture
    region.bind(gestureArea, 'pan', function(e) {
      const x = e.detail.events[0].clientX - gestureArea.getBoundingClientRect().left;
      const y = e.detail.events[0].clientY - gestureArea.getBoundingClientRect().top;
      showFeedback('pan', 'Pan detected');
      drawCircle(x, y, 10, 'rgba(88, 86, 214, 0.5)');
      startFadingTraces();
    });
  
    // Pinch Gesture
    region.bind(gestureArea, 'pinch', function(e) {
      const touches = e.detail.events;
      if (touches.length >= 2) {
        const x1 = touches[0].clientX - gestureArea.getBoundingClientRect().left;
        const y1 = touches[0].clientY - gestureArea.getBoundingClientRect().top;
        const x2 = touches[1].clientX - gestureArea.getBoundingClientRect().left;
        const y2 = touches[1].clientY - gestureArea.getBoundingClientRect().top;
        showFeedback('pinch', 'Pinch detected');
        drawCircle(x1, y1, 15, 'rgba(175, 82, 222, 0.5)');
        drawCircle(x2, y2, 15, 'rgba(175, 82, 222, 0.5)');
        startFadingTraces();
      }
    });
  
    // Rotate Gesture
    region.bind(gestureArea, 'rotate', function(e) {
      const touches = e.detail.events;
      if (touches.length >= 2) {
        const x1 = touches[0].clientX - gestureArea.getBoundingClientRect().left;
        const y1 = touches[0].clientY - gestureArea.getBoundingClientRect().top;
        const x2 = touches[1].clientX - gestureArea.getBoundingClientRect().left;
        const y2 = touches[1].clientY - gestureArea.getBoundingClientRect().top;
        showFeedback('rotate', 'Rotate detected');
        drawCircle(x1, y1, 15, 'rgba(255, 45, 85, 0.5)');
        drawCircle(x2, y2, 15, 'rgba(255, 45, 85, 0.5)');
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255, 45, 85, 0.5)';
        ctx.stroke();
        startFadingTraces();
      }
    });
  });
  
