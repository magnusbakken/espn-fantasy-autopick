DEFAULT_OPTIONS = {
    autoSave: true
};

let originalSettings = DEFAULT_OPTIONS;

function restoreSettings(settings) {
    console.debug("Restoring settings", settings);
    document.getElementById("autoSaveCheckbox").checked = settings.autoSave;
}

function saveSettings(settings) {
    console.debug("Saving settings", settings);
    chrome.storage.sync.set(settings, function() {
        chrome.tabs.query({ url: "*://*.games.espn.com/fba/clubhouse*" }, function (tabs) {
            const message = {
                commandId: "settings-changed",
                settings: settings,
            };
            for (const tab of tabs) {
                console.debug("Sending updated settings to tab", tab);
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
