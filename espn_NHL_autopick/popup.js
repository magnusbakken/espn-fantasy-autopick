function performSetup(command, message) {
    chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, {
            commandId: command,
            message: message,
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

function performCustomMultiDaySetup() {
    const customDays = parseInt(document.getElementById('customDaysInput').value);
    console.debug(`Performing auto-setup for ${customDays} days`);
    performSetup('perform-multi-setup', { days: customDays });
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
    updateSettings(settings => settings.saveDelay = parseInt(saveDelayInput.value));
}

function changeLoadDelay() {
    const loadDelayInput = document.getElementById('loadDelayInput');
    updateSettings(settings => settings.loadDelay = parseInt(loadDelayInput.value));
}

function changeLoadMaxAttempts() {
    const loadMaxAttemptsInput = document.getElementById('loadMaxAttemptsInput');
    updateSettings(settings => settings.loadMaxAttempts = parseInt(loadMaxAttemptsInput.value));
}

function changeCustomDaysDefault() {
    const customDaysInput = document.getElementById('customDaysInput');
    updateSettings(settings => settings.customDaysDefault = parseInt(customDaysInput.value));
}

function updateSettings(action) {
    withSettings(settings => {
        action(settings);
        saveSettings(settings);
    });
}

function showSettingsPage() {
    chrome.runtime.openOptionsPage();
}

function on(selector, event, action) {
    document.querySelector(selector).addEventListener(event, action);
}

document.addEventListener('DOMContentLoaded', () => {
    console.debug('Loading popup...');
    const manifest = chrome.runtime.getManifest();
    document.querySelector('.popup-version-number').innerText = `(${manifest.version})`;
    withSettings(restoreSettings);

    // This input field is inside a button.
    document.querySelector('#customDaysInput').onclick = e => e.stopPropagation();

    on('#setupCurrentPageButton', 'click', performCurrentDaySetup);
    on('#setupCurrentWeekButton', 'click', performCurrentWeekSetup)
    on('#setupCustomDaysButton', 'click', performCustomMultiDaySetup)
    on('#viewOnGitHubButton', 'click', viewOnGitHub);
    on('#saveDelayInput', 'input', changeSaveDelay);
    on('#loadDelayInput', 'input', changeLoadDelay);
    on('#loadMaxAttemptsInput', 'input', changeLoadMaxAttempts);
    on('#customDaysInput', 'input', changeCustomDaysDefault)
    on('#showSettingsPageLink', 'click', showSettingsPage);
});