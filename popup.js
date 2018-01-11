function performAutoSetup() {
    chrome.tabs.getSelected(null, function (tab) {
        chrome.tabs.sendMessage(tab.id, "perform-auto-setup"); 
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#setupCurrentPageButton').addEventListener('click', () => {
        performAutoSetup();
    });
});