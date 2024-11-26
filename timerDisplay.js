// timerDisplay.js
let timerElement = null;
let profileObserver = null;

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

// Function to check if we're on the correct Greenhouse page
function isCorrectGreenhousePage() {
    return window.location.href.includes('greenhouse.io/applications/review/app_review?');
}

// Function to start observing for PDF loads
function startProfileObserver() {
    // First, check if we're on the correct Greenhouse page
    if (!isCorrectGreenhousePage()) {
        return;
    }

    // Create a new observer instance
    const observer = new MutationObserver((mutations) => {
        // Only proceed if we're still on the correct page
        if (!isCorrectGreenhousePage()) {
            return;
        }

        for (const mutation of mutations) {
            // Check for added nodes
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Look for elements that indicate a PDF is loaded
                    const pdfViewer = node.querySelector('.s-pdf-viewer');
                    if (pdfViewer) {
                        // Notify background script that a new profile is loaded
                        chrome.runtime.sendMessage({
                            action: 'newProfileLoaded'
                        });
                        break;
                    }
                }
            }
        }
    });

    // Start observing the document with the configured parameters
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    return observer;
}

// Initialize the observer when the script loads
document.addEventListener('DOMContentLoaded', () => {
    if (isCorrectGreenhousePage()) {
        profileObserver = startProfileObserver();
    }
});

// Also watch for URL changes using the History API
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        if (isCorrectGreenhousePage()) {
            if (!profileObserver) {
                profileObserver = startProfileObserver();
            }
        } else {
            if (profileObserver) {
                profileObserver.disconnect();
                profileObserver = null;
            }
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