function performSetup(command) {
    chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
            commandId: command,
        }); 
    });
}

function performCurrentDaySetup() {
    console.debug('Performing auto-setup for current day');
    performSetup('perform-auto-setup');
}

function performCurrentWeekSetup() {
    console.debug('Performing auto-setup for current week');
    performSetup('perform-current-week-setup');
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
    updateSettings(settings => settings.saveDelay = saveDelayInput.value);
}

function changeLoadDelay() {
    const loadDelayInput = document.getElementById('loadDelayInput');
    updateSettings(settings => settings.loadDelay = loadDelayInput.value);
}

function changeLoadMaxAttempts() {
    const loadMaxAttemptsInput = document.getElementById('loadMaxAttemptsInput');
    updateSettings(settings => settings.loadMaxAttempts = loadMaxAttemptsInput.value);
}

function updateSettings(action) {
    withSettings(settings => {
        action(settings);
        saveSettings();
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

    on('#setupCurrentPageButton', "click", performCurrentDaySetup);
    on('#setupCurrentWeekButton', "click", performCurrentWeekSetup)
    on('#viewOnGitHubButton', "click", viewOnGitHub);
    on('#saveDelayInput', "input", changeSaveDelay);
    on('#loadDelayInput', "input", changeLoadDelay);
    on('#loadMaxAttemptsInput', "input", changeLoadMaxAttempts);
    on('#showSettingsPageLink', "click", showSettingsPage);
});