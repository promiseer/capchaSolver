// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Captcha Solver Extension installed!");
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "captchaFilled") {
    console.log(`Captcha successfully filled on ${message.url}`);
    
    // Optional: You could show a notification here
    // chrome.notifications.create({
    //   type: 'basic',
    //   iconUrl: 'icon.png',
    //   title: 'Captcha Solved',
    //   message: 'The captcha was automatically filled'
    // });
  }
  
  if (message.action === "captchaError") {
    console.error(`Captcha error on ${message.url}: ${message.error}`);
  }
  
  return true; // Keep the message channel open for async response
});

// Optional: Handle browser action click to open the side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});
