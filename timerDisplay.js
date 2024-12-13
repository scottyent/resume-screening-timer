// timerDisplay.js
let timerElement = null;
let profileObserver = null;
let isTimerAtZero = false;

function createTimerDisplay() {
    if (!timerElement) {
        timerElement = document.createElement('div');
        timerElement.id = 'url-timer-display';
        timerElement.style.position = 'fixed';
        timerElement.style.top = '10px';
        timerElement.style.right = '10px';
        timerElement.style.padding = '12px 20px';
        timerElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        timerElement.style.color = 'white';
        timerElement.style.borderRadius = '5px';
        timerElement.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
        timerElement.style.fontSize = '16px';
        timerElement.style.fontWeight = 'bold';
        timerElement.style.zIndex = '9999';
        timerElement.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
        timerElement.style.transition = 'opacity 0.3s ease';
        timerElement.style.userSelect = 'none';
        timerElement.style.cursor = 'default';
        document.body.appendChild(timerElement);
    }
}

function updateDisplay(remainingSeconds) {
    if (!timerElement) {
        createTimerDisplay();
    }

    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Handle different timer states
    if (remainingSeconds <= 0) {
        isTimerAtZero = true;
        timerElement.classList.remove('urgent');
        timerElement.classList.add('zero');
    } else if (remainingSeconds <= 10) {  // Changed from 60 to 10 seconds
        timerElement.classList.add('urgent');
        timerElement.classList.remove('zero');
    } else {
        timerElement.classList.remove('urgent', 'zero');
    }
}

function removeDisplay() {
    // Only remove the display if we're not at zero
    if (!isTimerAtZero && timerElement && timerElement.parentNode) {
        timerElement.parentNode.removeChild(timerElement);
        timerElement = null;
    }
}

// Function to check if we're on the correct Greenhouse page
function isCorrectGreenhousePage() {
    return window.location.href.includes('greenhouse.io/applications/review/app_review?');
}

// Reset timer state when navigating to a new application
function resetTimerState() {
    isTimerAtZero = false;
    if (timerElement) {
        timerElement.classList.remove('urgent', 'zero');
    }
}

// Initialize when the script loads
document.addEventListener('DOMContentLoaded', () => {
    if (isCorrectGreenhousePage()) {
        createTimerDisplay();
    }
});

// Watch for URL changes using the History API
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        if (isCorrectGreenhousePage()) {
            resetTimerState();
            createTimerDisplay();
        } else {
            removeDisplay();
        }
    }
}).observe(document, {subtree: true, childList: true});

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
    return true; // Keep the message channel open
});