function performAutoSetup() {
    console.debug("Performing auto-setup");
    chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
            commandId: "perform-auto-setup",
        }); 
    });
}

function viewOnGitHub() {
    console.debug("Opening GitHub page");
    chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.create({
            openerTabId: tab.id,
            url: "https://github.com/magnusbakken/espn-fantasy-autopick"
        });
    });
}

DEFAULT_OPTIONS = {
    autoSave: true
};

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

function toggleAutoSave() {
    const checkbox = document.getElementById("autoSaveCheckbox");
    withSettings(settings => {
        settings.autoSave = checkbox.checked;
        saveSettings(settings);
    });
}

function on(selector, event, action) {
    document.querySelector(selector).addEventListener(event, () => action());
}

document.addEventListener("DOMContentLoaded", () => {
    console.debug("Loading popup...");
    const manifest = chrome.runtime.getManifest();
    document.getElementById("versionSpan").innerText = `(${manifest.version})`;
    withSettings(restoreSettings);

    on("#setupCurrentPageButton", "click", performAutoSetup);
    on("#viewOnGitHubButton", "click", viewOnGitHub);
    on("#autoSaveCheckbox", "change", toggleAutoSave);
});