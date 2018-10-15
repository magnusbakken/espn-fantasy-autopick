chrome.runtime.onInstalled.addListener(function() {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([
            {
                conditions: [
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: { hostEquals: "fantasy.espn.com", pathPrefix: "/basketball/team" },
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
    console.debug("automatic setup triggered by command (hotkey)");
    if (command === "perform-automatic-setup") {		
        performAutoSetup();		
    }		
});