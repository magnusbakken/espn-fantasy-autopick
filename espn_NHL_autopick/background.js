chrome.runtime.onInstalled.addListener(function() {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([
            {
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: { hostEquals: 'fantasy.espn.com', pathPrefix: '/hockey/team' },
                    })
                ],
                actions: [ new chrome.declarativeContent.ShowPageAction() ]
            }
        ]);
    });
});

function performAutoSetup() {
    chrome.tabs.executeScript(null, { code: 'performAutoSetup()' });
}

function performMultiDaySetup() {
    chrome.tabs.executeScript(null, { code: 'performCurrentWeekSetup()' });
}

chrome.commands.onCommand.addListener(function(command) {
    if (command === 'perform-automatic-setup') {
        console.debug('Automatic setup triggered by command (hotkey)');
        performAutoSetup();
    } else if (command === 'perform-current-week-setup') {
        console.debug('Automatic current week setup triggered by command (hotkey)');
        performMultiDaySetup();
    }
});