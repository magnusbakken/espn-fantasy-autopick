async function getCurrentTab() {
    const queryOptions = { active: true, lastFocusedWindow: true };
    const [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

async function performSetup(command, message) {
    const tab = await getCurrentTab();
    try {
        chrome.tabs.sendMessage(tab.id, {
            commandId: command,
            message: message,
        });
    } catch (e) {
        console.error("Unable to send message to ESPN tab", e);
    }
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

async function changeSaveDelay() {
    const saveDelayInput = document.getElementById('saveDelayInput');
    await updateSettings(settings => settings.saveDelay = parseInt(saveDelayInput.value));
}

async function changeLoadDelay() {
    const loadDelayInput = document.getElementById('loadDelayInput');
    await updateSettings(settings => settings.loadDelay = parseInt(loadDelayInput.value));
}

async function changeLoadMaxAttempts() {
    const loadMaxAttemptsInput = document.getElementById('loadMaxAttemptsInput');
    await updateSettings(settings => settings.loadMaxAttempts = parseInt(loadMaxAttemptsInput.value));
}

async function changeCustomDaysDefault() {
    const customDaysInput = document.getElementById('customDaysInput');
    await updateSettings(settings => settings.customDaysDefault = parseInt(customDaysInput.value));
}

async function updateSettings(action) {
    const settings = await getSettings();
    action(settings);
    await saveSettings(settings);
}

function showSettingsPage() {
    chrome.runtime.openOptionsPage();
}

async function isOnFantasyPage() {
    const tab = await getCurrentTab();
    return URL_REGEX.test(tab.url);
}

function on(selector, event, action) {
    document.querySelector(selector).addEventListener(event, action);
}

async function onAsync(selector, event, action) {
    document.querySelector(selector).addEventListener(event, async () => await action());
}

document.addEventListener('DOMContentLoaded', async () => {
    console.debug('Loading popup...');
    const manifest = chrome.runtime.getManifest();
    document.querySelector('.popup-version-number').innerText = `(${manifest.version})`;
    const settings = await getSettings();
    restoreSettings(settings);

    on('#showSettingsPageLink', 'click', showSettingsPage);
    onAsync('#viewOnGitHubButton', 'click', viewOnGitHub);

    if (await isOnFantasyPage()) {
        // This input field is inside a button.
        document.querySelector('#customDaysInput').onclick = e => e.stopPropagation();

        onAsync('#setupCurrentPageButton', 'click', performCurrentDaySetup);
        onAsync('#setupCurrentWeekButton', 'click', performCurrentWeekSetup)
        onAsync('#setupCustomDaysButton', 'click', performCustomMultiDaySetup)
        on('#saveDelayInput', 'input', changeSaveDelay);
        on('#loadDelayInput', 'input', changeLoadDelay);
        on('#loadMaxAttemptsInput', 'input', changeLoadMaxAttempts);
        on('#customDaysInput', 'input', changeCustomDaysDefault);
    } else {
        const mainElement = document.querySelector('main');
        mainElement.innerHTML = '<div style="padding-left: 10px">Go to your team page to use the extension.</div>';
    }
});