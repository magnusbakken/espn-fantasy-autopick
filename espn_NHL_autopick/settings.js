function currentSettings() {
    return {
        saveDelay: parseInt(document.getElementById('saveDelayInput').value),
        loadDelay: parseInt(document.getElementById('loadDelayInput').value),
        loadMaxAttempts: parseInt(document.getElementById('loadMaxAttemptsInput').value),
        customDaysDefault: parseInt(document.getElementById('customDaysInput').value),
    };
}

function settingsAreEqual(settings1, settings2) {
    for (const prop in settings1) {
        if (settings1.hasOwnProperty(prop) || settings2.hasOwnProperty(prop)) {
            if (settings1[prop] !== settings2[prop]) {
                return false;
            }
        }
    }
    return true;
}

function setSaveEnabled(enabled) {
    const button = document.getElementById('saveButton');
    if (enabled) {
        button.removeAttribute('disabled');
    } else {
        button.setAttribute('disabled', '');
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
    for (const element of document.querySelectorAll(selector)) {
        element.addEventListener(event, action);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.debug('Loading settings...');
    const manifest = chrome.runtime.getManifest();
    document.querySelector('.settings-version-number').innerText = manifest.version;
    withSettings(settings => {
        restoreSettings(settings);
        originalSettings = settings;
    });
    on('.setting', 'change', settingsUpdated);
    on('.setting', 'input', settingsUpdated);
    on('#saveButton', 'click', performSave);
});