function updateTimeLeft() {
    chrome.runtime.sendMessage({ action: 'getTime' }, response => {
        if (response) {
            const timeLeft = response.remainingTime;
            const isRunning = response.isRunning;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            document.getElementById('timeLeftDisplay').textContent = formattedTime;
            document.getElementById('pause').disabled = !isRunning;
            document.getElementById('resume').disabled = isRunning;
            document.getElementById('stop').disabled = !isRunning && (minutes === 0 && seconds === 0);
        }
    });
}

// Show the status message temporarily
function showDurationStatus() {
    const status = document.getElementById('durationStatus');
    status.style.opacity = '1';
    setTimeout(() => {
        status.style.opacity = '0';
    }, 2000);
}

// Initialize duration input with current stored value
chrome.storage.local.get(['duration'], (result) => {
    const duration = result.duration || 5;
    document.getElementById('timerDuration').value = duration;
});

document.getElementById('setDuration').addEventListener('click', () => {
    const duration = parseInt(document.getElementById('timerDuration').value);
    if (duration > 0) {
        chrome.storage.local.set({ duration: duration }, () => {
            showDurationStatus();
        });
    }
});

document.getElementById('pause').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'pause' });
});

document.getElementById('resume').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'resume' });
});

document.getElementById('reset').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'reset' });
});

document.getElementById('stop').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stop' });
});

updateTimeLeft();
setInterval(updateTimeLeft, 1000);