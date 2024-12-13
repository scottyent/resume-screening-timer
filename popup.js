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

// Initialize duration inputs with current stored values
chrome.storage.local.get(['duration'], (result) => {
    const totalSeconds = (result.duration || 5) * 60;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    document.getElementById('timerMinutes').value = minutes;
    document.getElementById('timerSeconds').value = seconds;
});

document.getElementById('setDuration').addEventListener('click', () => {
    const minutes = parseInt(document.getElementById('timerMinutes').value) || 0;
    const seconds = parseInt(document.getElementById('timerSeconds').value) || 0;
    const totalSeconds = (minutes * 60) + seconds;
    
    if (totalSeconds > 0) {
        // Store duration in minutes for backward compatibility
        const durationInMinutes = totalSeconds / 60;
        chrome.storage.local.set({ 
            duration: durationInMinutes,
            seconds: seconds  // Store seconds separately for restoration
        }, () => {
            showDurationStatus();
            chrome.runtime.sendMessage({ 
                action: 'setTimerDuration',
                duration: durationInMinutes,
                totalSeconds: totalSeconds
            });
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

// Validate seconds input to be between 0 and 59
document.getElementById('timerSeconds').addEventListener('input', (e) => {
    let value = parseInt(e.target.value);
    if (value > 59) {
        e.target.value = '59';
    }
    if (value < 0) {
        e.target.value = '0';
    }
});

updateTimeLeft();
setInterval(updateTimeLeft, 1000);