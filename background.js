// [Previous code remains the same until removeTimerDisplay function]

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

// [Rest of the code remains the same]