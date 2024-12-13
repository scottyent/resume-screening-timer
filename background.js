let isTimerRunning = false;
let remainingTime = 0;
let timerInterval = null;
let currentTabId = null;
const DEFAULT_TIMER_DURATION = 5; // Default duration in minutes
const URL_PATTERN = /greenhouse\.io\/applications\/review\/app_review\?/; // Updated URL pattern


// Helper function to check if a tab is ready for messaging
async function isTabReady(tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, { action: 'ping' });
        return true;
    } catch (error) {
        return false;
    }
}

// Helper function to wait until tab is ready
async function waitForTab(tabId, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
        if (await isTabReady(tabId)) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
}

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        isRunning: false,
        remainingTime: 0,
        duration: DEFAULT_TIMER_DURATION
    });
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && URL_PATTERN.test(tab.url)) {
        currentTabId = tabId;
        // Wait for the tab to be ready before proceeding
        if (await waitForTab(tabId)) {
            chrome.storage.local.get(['duration'], (result) => {
                const duration = result.duration || DEFAULT_TIMER_DURATION;
                startTimer(duration * 60);
            });
        }
    }
});

// Listen for tab activation changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url && URL_PATTERN.test(tab.url)) {
            currentTabId = activeInfo.tabId;
            if (!isTimerRunning && await waitForTab(activeInfo.tabId)) {
                chrome.storage.local.get(['duration'], (result) => {
                    const duration = result.duration || DEFAULT_TIMER_DURATION;
                    startTimer(duration * 60);
                });
            }
        } else {
            await removeTimerDisplay(activeInfo.tabId);
        }
    } catch (error) {
        console.error('Error in tab activation:', error);
    }
});

// Listen for network traffic indicating loaded document to reset the timer
chrome.webRequest.onCompleted.addListener(
    async function(details) {
        // Check if this is a document request from attachment_display.tsx
        if (details.type === "main_frame" || details.type === "sub_frame" || details.type === "object") {
            try {
                // Get the tab info to check if we're on the correct page
                const tab = await chrome.tabs.get(details.tabId);
                if (tab.url && URL_PATTERN.test(tab.url)) {
                    // Reset the timer when a new document is loaded
                    chrome.storage.local.get(['duration'], (result) => {
                        const duration = result.duration || DEFAULT_TIMER_DURATION;
                        startTimer(duration * 60);
                    });
                }
            } catch (error) {
                console.error('Error handling document request:', error);
            }
        }
    },
    {
        urls: ["*://*.greenhouse.io/*"],
        types: ["main_frame", "sub_frame", "object"]
    }
);

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'getTime':
            sendResponse({
                remainingTime: remainingTime,
                isRunning: isTimerRunning
            });
            break;
        case 'setTimerDuration':
            // Store the new duration
            chrome.storage.local.set({ duration: request.duration });
            startTimer(request.duration * 60);
            break;
        case 'pause':
            pauseTimer();
            break;
        case 'resume':
            resumeTimer();
            break;
        case 'reset':
            resetTimer();
            break;
        case 'stop':
            stopTimer();
            break;
        case 'newProfileLoaded':
            // Only reset timer if we're on the correct page
            if (sender.tab && URL_PATTERN.test(sender.tab.url)) {
                chrome.storage.local.get(['duration'], (result) => {
                    const duration = result.duration || DEFAULT_TIMER_DURATION;
                    startTimer(duration * 60);
                });
            }
            break;
    }
    return true; // Keep the message channel open
});

function startTimer(duration) {
    remainingTime = duration;
    isTimerRunning = true;

    if (currentTabId) {
        injectTimerDisplay(currentTabId);
    }

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (isTimerRunning && remainingTime > 0) {
            remainingTime--;
            updateBadge(remainingTime);
            if (currentTabId) {
                updateTimerDisplay(currentTabId, remainingTime);
            }

            if (remainingTime === 0) {
                stopTimer();
                showNotification();
            }
        }
    }, 1000);

    updateBadge(remainingTime);
}

function pauseTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);
    updateBadge(remainingTime);
}

function resumeTimer() {
    if (remainingTime > 0) {
        isTimerRunning = true;
        startTimer(remainingTime);
    }
}

function resetTimer() {
    chrome.storage.local.get(['duration'], (result) => {
        const duration = result.duration || DEFAULT_TIMER_DURATION;
        startTimer(duration * 60);
    });
}

function stopTimer() {
    isTimerRunning = false;
    remainingTime = 0;
    clearInterval(timerInterval);
    updateBadge(remainingTime);
    if (currentTabId) {
        removeTimerDisplay(currentTabId);
    }
}

function showNotification() {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Timer Finished',
        message: 'Your timer has completed!',
        priority: 2
    });
}

async function injectTimerDisplay(tabId) {
    try {
        await removeTimerDisplay(tabId);
        if (await waitForTab(tabId)) {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                function: () => {
                    chrome.runtime.sendMessage({ action: 'getTime' }, response => {
                        if (response) {
                            chrome.runtime.sendMessage({
                                action: 'updateTimer',
                                time: response.remainingTime
                            });
                        }
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error injecting timer display:', error);
    }
}

async function updateTimerDisplay(tabId, time) {
    if (!tabId) return;

    try {
        const response = await chrome.tabs.sendMessage(tabId, {
            action: 'updateTimer',
            time: time
        });
        return response;
    } catch (error) {
        console.error('Error updating timer display:', error);
    }
}

async function removeTimerDisplay(tabId) {
    if (!tabId) return;

    try {
        // First check if the tab still exists
        const tab = await chrome.tabs.get(tabId);
        if (!tab) return;

        // Only try to remove the timer if we're on a Greenhouse page
        if (!tab.url || !URL_PATTERN.test(tab.url)) return;

        // Check if the content script is ready
        const isReady = await waitForTab(tabId);
        if (!isReady) return;

        // Now try to remove the timer
        const response = await chrome.tabs.sendMessage(tabId, {
            action: 'removeTimer'
        });
        return response;
    } catch (error) {
        // Log the error but don't throw it
        console.log('Timer removal skipped:', error.message);
    }
}

function updateBadge(time) {
    const minutes = Math.floor(time / 60);
    chrome.action.setBadgeText({
        text: isTimerRunning ? minutes.toString() : ''
    });
    chrome.action.setBadgeBackgroundColor({
        color: isTimerRunning ? '#4CAF50' : '#999999'
    });
}