document.addEventListener('DOMContentLoaded', function () {
  const gestureArea = document.getElementById('gestureArea');
  const gestureFeedback = document.querySelector('.gesture-feedback');
  const touchPoint = document.getElementById('touchPoint');
  const gestureOutput = document.getElementById('gestureOutput');
  const clearBtn = document.getElementById('clearBtn');
  const gestureListItems = document.querySelectorAll('.gesture-list li');

  const canvas = document.getElementById('touchCanvas');
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = gestureArea.offsetWidth;
    canvas.height = gestureArea.offsetHeight;
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let traceOpacity = 1;
  let fadeInterval;
  const fadeDuration = 3000;
  let drawingHistory = [];

  clearBtn.addEventListener('click', function () {
    clearCanvas();
    gestureOutput.innerHTML = '<p>Perform a gesture to see feedback here</p>';
  });

  gestureListItems.forEach(item => {
    item.addEventListener('click', function () {
      const gesture = this.getAttribute('data-gesture');
      showGestureInstruction(gesture);
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

  function clearCanvas(resetHistory = true) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    traceOpacity = 1;

    if (resetHistory) {
      drawingHistory = [];
    }
  }

  function showFeedback(gestureType, message) {
    gestureFeedback.className = 'gesture-feedback feedback-active';
    gestureFeedback.classList.add(`${gestureType}-feedback`);
    gestureOutput.innerHTML = `<p><strong>${gestureType}:</strong> ${message}</p>`;

    setTimeout(() => {
      gestureFeedback.classList.remove('feedback-active');
    }, 1000);
  }

  function drawCircle(x, y, radius, color) {
    ctx.globalAlpha = traceOpacity;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function getSwipeDirection(angle) {
    if (angle >= -45 && angle <= 45) return 'right';
    if (angle > 45 && angle < 135) return 'down';
    if (angle <= -135 || angle >= 135) return 'left';
    if (angle > -135 && angle < -45) return 'up';
    return 'unknown';
  }

  const region = new ZingTouch.Region(gestureArea);

  // Tap
  region.bind(gestureArea, 'tap', function (e) {
    const x = e.detail.events[0].clientX - gestureArea.getBoundingClientRect().left;
    const y = e.detail.events[0].clientY - gestureArea.getBoundingClientRect().top;
    showFeedback('tap', 'Tap detected');
    drawCircle(x, y, 30, 'rgba(52, 199, 89, 0.5)');
    startFadingTraces();
  });

  // Press
  region.bind(gestureArea, 'tap', function (e) {
    if (e.detail.interval > 500) {
      const x = e.detail.events[0].clientX - gestureArea.getBoundingClientRect().left;
      const y = e.detail.events[0].clientY - gestureArea.getBoundingClientRect().top;
      showFeedback('press', 'Press and hold detected');
      drawCircle(x, y, 25, 'rgba(255, 149, 0, 0.5)');
      startFadingTraces();
    }
  });

  // Pan with direction
  region.bind(gestureArea, 'pan', function (e) {
    const angle = e.detail.data[0].angle;
    const direction = getSwipeDirection(angle);

    const x = e.detail.events[0].clientX - gestureArea.getBoundingClientRect().left;
    const y = e.detail.events[0].clientY - gestureArea.getBoundingClientRect().top;

    showFeedback('pan', `Pan detected — swiped ${direction}`);
    drawCircle(x, y, 10, 'rgba(88, 86, 214, 0.5)');
    startFadingTraces();
  });

  // Pinch
  region.bind(gestureArea, 'pinch', function (e) {
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

  // Rotate
  region.bind(gestureArea, 'rotate', function (e) {
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
