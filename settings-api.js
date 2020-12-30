DEFAULT_OPTIONS = {
    saveDelay: 1000
};

let originalSettings = DEFAULT_OPTIONS;

function restoreSettings(settings) {
    console.debug('Restoring settings', settings);
    document.getElementById('saveDelayInput').value = settings.saveDelay;
}

function saveSettings(settings) {
    console.debug('Saving settings', settings);
    chrome.storage.sync.set(settings, function() {
        chrome.tabs.query({ url: '*://*.fantasy.espn.com/basketball/team*' }, function (tabs) {
            const message = {
                commandId: 'settings-changed',
                settings: settings,
            };
            for (const tab of tabs) {
                console.debug('Sending updated settings to tab', tab);
                chrome.tabs.sendMessage(tab.id, message);
            }
        })
    });
}

function withSettings(action) {
    chrome.storage.sync.get(DEFAULT_OPTIONS, function (items) {
        action(items);
    });
}
