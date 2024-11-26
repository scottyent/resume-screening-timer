// Create and manage the timer display element
let timerElement = null;

function createTimerDisplay() {
    if (!timerElement) {
        timerElement = document.createElement('div');
        timerElement.id = 'url-timer-display';
        timerElement.style.position = 'fixed';
        timerElement.style.top = '10px';
        timerElement.style.right = '10px';
        timerElement.style.padding = '10px';
        timerElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        timerElement.style.color = 'white';
        timerElement.style.borderRadius = '5px';
        timerElement.style.zIndex = '9999';
        document.body.appendChild(timerElement);
    }
}

// Update the timer display with the remaining time
function updateDisplay(remainingSeconds) {
    if (!timerElement) {
        createTimerDisplay();
    }

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Add urgent class when less than 1 minute remains
    if (remainingSeconds < 60) {
        timerElement.classList.add('urgent');
    } else {
        timerElement.classList.remove('urgent');
    }
}

// Remove the timer display
function removeDisplay() {
    if (timerElement && timerElement.parentNode) {
        timerElement.parentNode.removeChild(timerElement);
        timerElement = null;
    }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'ping':
            sendResponse({ status: 'ready' });
            break;
        case 'updateTimer':
            updateDisplay(request.time);
            sendResponse({ status: 'updated' });
            break;
        case 'removeTimer':
            removeDisplay();
            sendResponse({ status: 'removed' });
            break;
    }
    return false; // Don't keep the message channel open
});