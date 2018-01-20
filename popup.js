function performAutoSetup() {
    console.log("performing auto setup");
    chrome.tabs.getSelected(null, function (tab) {
        console.log("sending perform-auto-setup to tab", tab.id);
        chrome.tabs.sendMessage(tab.id, "perform-auto-setup"); 
    });
}

function viewOnGitHub() {
    chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.create({
            openerTabId: tab.id,
            url: "https://github.com/magnusbakken/espn-fantasy-autopick"
        });
    });
}

function onClick(selector, action) {
    document.querySelector(selector).addEventListener("click", () => action());
}

document.addEventListener("DOMContentLoaded", () => {
    const manifest = chrome.runtime.getManifest();
    document.getElementById("versionSpan").innerText = `(${manifest.version})`;

    onClick("#setupCurrentPageButton", performAutoSetup);
    onClick("#viewOnGitHubButton", viewOnGitHub);
});