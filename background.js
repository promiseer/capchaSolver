// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Captcha Solver Extension installed!");
});

// Listen for tab updates to potentially trigger captcha solving
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('registration.ec.ap.gov.in/ecSearch')) {
    console.log("Target page loaded, injecting captcha solver");
    
    // Optional: You could inject script here if your content script needs manual injection
    // chrome.scripting.executeScript({
    //   target: { tabId },
    //   files: ['content.js']
    // });
  }
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

// Optional: Handle browser action click
chrome.action.onClicked.addListener((tab) => {
  if (tab.url.includes('registration.ec.ap.gov.in/ecSearch')) {
    // Send message to content script to manually trigger captcha solving
    chrome.tabs.sendMessage(tab.id, { action: "solveCaptcha" });
  }
});
