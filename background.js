// background.js

// Listen for the user clicking the extension icon
chrome.action.onClicked.addListener((tab) => {
  // Send a message to the content script in the active tab
  chrome.tabs.sendMessage(tab.id, { type: "toggleUI" });
});