async function getCurrentTab() {
    const queryOptions = { active: true, lastFocusedWindow: true };
    const [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

async function performSetup(command, message) {
    const tab = await getCurrentTab();
    chrome.tabs.sendMessage(tab.id, {
        commandId: command,
        message: message,
    });
}

async function performCurrentDaySetup() {
    console.debug('Performing auto-setup for current day');
    await performSetup('perform-auto-setup');
}

async function performCurrentWeekSetup() {
    console.debug('Performing auto-setup for current week');
    await performSetup('perform-current-week-setup');
}

async function performCustomMultiDaySetup() {
    const customDays = parseInt(document.getElementById('customDaysInput').value);
    console.debug(`Performing auto-setup for ${customDays} days`);
    await performSetup('perform-multi-setup', { days: customDays });
}

async function viewOnGitHub() {
    console.debug('Opening GitHub page');
    const tab = await getCurrentTab();
    chrome.tabs.create({
        openerTabId: tab.id,
        url: 'https://github.com/magnusbakken/espn-fantasy-autopick'
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

async function onAsync(selector, event, action) {
    document.querySelector(selector).addEventListener(event, async () => await action());
}

document.addEventListener('DOMContentLoaded', () => {
    console.debug('Loading popup...');
    const manifest = chrome.runtime.getManifest();
    document.querySelector('.popup-version-number').innerText = `(${manifest.version})`;
    withSettings(restoreSettings);

    // This input field is inside a button.
    document.querySelector('#customDaysInput').onclick = e => e.stopPropagation();

    onAsync('#setupCurrentPageButton', 'click', performCurrentDaySetup);
    onAsync('#setupCurrentWeekButton', 'click', performCurrentWeekSetup)
    onAsync('#setupCustomDaysButton', 'click', performCustomMultiDaySetup)
    onAsync('#viewOnGitHubButton', 'click', viewOnGitHub);
    on('#saveDelayInput', 'input', changeSaveDelay);
    on('#loadDelayInput', 'input', changeLoadDelay);
    on('#loadMaxAttemptsInput', 'input', changeLoadMaxAttempts);
    on('#customDaysInput', 'input', changeCustomDaysDefault)
    on('#showSettingsPageLink', 'click', showSettingsPage);
});