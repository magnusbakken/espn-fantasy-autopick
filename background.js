chrome.runtime.onInstalled.addListener(function() {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([
            {
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: { hostEquals: "games.espn.com", pathPrefix: "/fba/clubhouse" },
                    })
                ],
                actions: [ new chrome.declarativeContent.ShowPageAction() ]
            }
        ]);
    });
});

function performAutoSetup() {
    chrome.tabs.executeScript(null, { code: "performAutoSetup()" });
}

chrome.commands.onCommand.addListener(function(command) {
    if (command === "perform-automatic-setup") {
        performAutoSetup();
    }
});
