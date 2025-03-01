// popup.js
document.addEventListener("DOMContentLoaded", function () {
  const solveButton = document.getElementById("solveCaptcha");
  const statusDiv = document.getElementById("status");

  // Solve captcha button click handler
  solveButton.addEventListener("click", function () {
    // Get the current tab
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTab = tabs[0];

      if (
        currentTab &&
        currentTab.url
        // currentTab.url.includes("registration.ec.ap.gov.in/ecSearch")
      ) {
        // Send a message to the content script
        chrome.tabs.sendMessage(
          currentTab.id,
          { action: "solveCaptcha" },
          function (response) {
            if (chrome.runtime.lastError) {
              showStatus("Error: Content script not available", "error");
            } else if (response && response.success) {
              showStatus("Captcha solved!", "success");
            } else {
              showStatus("Failed to solve captcha", "error");
            }
          }
        );
      } else {
        showStatus("Not on a supported page", "error");
      }
    });
  });

  // Helper function to show status messages
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = "status " + type;
    statusDiv.style.display = "block";
    statusDiv.style.textAlign = "center"; // Center the text

    // Hide after 3 seconds
    setTimeout(() => {
      statusDiv.style.display = "none";
    }, 3000);
  }
});
