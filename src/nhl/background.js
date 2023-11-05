chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        if (tab.url && tab.url.match(/fantasy.espn.com\/hockey\/team/)) {
            chrome.action.show(tabId);
        } else {
            chrome.action.hide(tabId);
        }
    }
});

function performAutoSetup() {
    chrome.tabs.executeScript(null, { code: 'performAutoSetup()' });
}

function performMultiDaySetup() {
    chrome.tabs.executeScript(null, { code: 'performCurrentWeekSetup()' });
}

chrome.commands.onCommand.addListener(function (command) {
    if (command === 'perform-automatic-setup') {
        console.debug('Automatic setup triggered by command (hotkey)');
        performAutoSetup();
    } else if (command === 'perform-current-week-setup') {
        console.debug('Automatic current week setup triggered by command (hotkey)');
        performMultiDaySetup();
    }
});
