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

function currentSettings() {
    return {
        autoSave: document.getElementById("autoSaveCheckbox").checked,
    };
}

function settingsAreEqual(settings1, settings2) {
    for (const prop in settings1) {
        if (settings1.hasOwnProperty(prop)) {
            if (settings1[prop] !== settings2[prop]) {
                return false;
            }
        }
    }
    return true;
}

function setSaveEnabled(enabled) {
    const button = document.getElementById("saveButton");
    if (enabled) {
        button.removeAttribute("disabled");
    } else {
        button.setAttribute("disabled", "");
    }
}

function settingsUpdated() {
    setSaveEnabled(!settingsAreEqual(originalSettings, currentSettings()));
}

function performSave() {
    const newSettings = currentSettings();
    saveSettings(newSettings);
    originalSettings = newSettings;
    settingsUpdated();
}

function on(selector, event, action) {
    document.querySelector(selector).addEventListener(event, () => action());
}

document.addEventListener("DOMContentLoaded", () => {
    console.debug("Loading settings...");
    const manifest = chrome.runtime.getManifest();
    document.querySelector(".versionNumber").innerText = manifest.version;
    withSettings(settings => {
        restoreSettings(settings);
        originalSettings = settings;
    });
    on(".setting", "change", settingsUpdated);
    on("#saveButton", "click", performSave);
});