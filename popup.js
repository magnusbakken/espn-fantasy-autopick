function performAutoSetup() {
    console.debug('Performing auto-setup');
    chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
            commandId: 'perform-auto-setup',
        }); 
    });
}

function viewOnGitHub() {
    console.debug('Opening GitHub page');
    chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.create({
            openerTabId: tab.id,
            url: 'https://github.com/magnusbakken/espn-fantasy-autopick'
        });
    });
}

function changeSaveDelay() {
    const saveDelayInput = document.getElementById('saveDelayInput');
    withSettings(settings => {
        settings.saveDelay = saveDelayInput.value;
        saveSettings(settings);
    });
}

function showSettingsPage() {
    chrome.runtime.openOptionsPage();
}

function on(selector, event, action) {
    document.querySelector(selector).addEventListener(event, () => action());
}

document.addEventListener('DOMContentLoaded', () => {
    console.debug('Loading popup...');
    const manifest = chrome.runtime.getManifest();
    document.querySelector('.popup-version-number').innerText = `(${manifest.version})`;
    withSettings(restoreSettings);

    on('#setupCurrentPageButton', 'click', performAutoSetup);
    on('#viewOnGitHubButton', 'click', viewOnGitHub);
    on('#saveDelayInput', 'input', changeSaveDelay);
    on('#showSettingsPageLink', 'click', showSettingsPage);
});