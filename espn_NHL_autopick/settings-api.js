DEFAULT_OPTIONS = {
    saveDelay: 1000,
    loadDelay: 1000,
    loadMaxAttempts: 10,
    customDaysDefault: 10,
};

let originalSettings = DEFAULT_OPTIONS;

function restoreSettings(settings) {
    console.debug('Restoring settings', settings);
    document.getElementById('saveDelayInput').value = parseInt(settings.saveDelay);
    document.getElementById('loadDelayInput').value = parseInt(settings.loadDelay);
    document.getElementById('loadMaxAttemptsInput').value = parseInt(settings.loadMaxAttempts);
    document.getElementById('customDaysInput').value = parseInt(settings.customDaysDefault);
}

function saveSettings(settings) {
    console.debug('Saving settings', settings);
    chrome.storage.sync.set(settings, () => {
        chrome.tabs.query({ url: '*://*.fantasy.espn.com/hockey/team*' }, tabs => {
            const message = {
                commandId: 'settings-changed',
                settings: settings,
            };
            for (const tab of tabs) {
                console.debug('Sending updated settings to tab', tab, message);
                chrome.tabs.sendMessage(tab.id, message);
            }
        })
    });
}

function withSettings(action) {
    chrome.storage.sync.get(DEFAULT_OPTIONS, action);
}
