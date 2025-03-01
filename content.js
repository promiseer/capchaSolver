// Constants for selectors
const SELECTORS = {
  MAINPAGE:
    "#encumbranceServiceForm > div:nth-child(2) > div:nth-child(2) > span",
  ENCUMBRANCE_SEARCH:
    "#__next > div > div:nth-child(3) > div.MainContent > div > div > form > div:nth-child(5) > div:nth-child(5) > span",
  EDETAILS:
    "#__next > div > div:nth-child(3) > div.MainContent > div > div > div > div > div > form > div.p.row > div:nth-child(13) > span",
  DEFAULT:
    "#encumbranceServiceForm > div:nth-child(2) > div:nth-child(2) > span",
  CAPTCHA_INPUT: 'input[name="captchaVal"]',
};

// Function to get captcha text
async function getCaptchaText(selector, maxRetries = 10, retryInterval = 1000) {
  let retries = 0;
  while (retries < maxRetries) {
    const captchaTextElement = document.querySelector(selector);
    if (captchaTextElement) {
      const captchaText =
        captchaTextElement.textContent || captchaTextElement.innerText;
      if (captchaText && captchaText.trim() !== "") {
        return captchaText;
      }
    }
    retries++;
    await delay(retryInterval);
  }
  throw new Error("Captcha not found or empty after maximum retries");
}

// Function to delay execution
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to fill the input field with the captcha text
function fillInput(selector, value) {
  const inputElement = document.querySelector(selector);
  if (inputElement) {
    inputElement.value = value;
    inputElement.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    throw new Error(`Input element not found for selector: ${selector}`);
  }
}

// Function to click a button
function clickButton(selector) {
  const buttonElement = document.querySelector(selector);
  if (buttonElement) {
    buttonElement.click();
  } else {
    throw new Error(`Button element not found for selector: ${selector}`);
  }
}
// Function to determine the captcha selector based on the URL and state
function getCaptchaSelector(url) {
  if (url.includes("ec.ap.gov.in")) {
    if (url.includes("ecSearch/Mainpage")) {
      return SELECTORS.MAINPAGE;
    } else if (url.includes("/ecSearch/EncumbranceSearch")) {
      return SELECTORS.ENCUMBRANCE_SEARCH;
    } else if (url.includes("EDetails")) {
      return SELECTORS.EDETAILS;
    } else {
      return SELECTORS.DEFAULT;
    }
  } else if (url.includes("telangana.gov.in")) {
    // Return a selector string, not a Promise
    return "#myForm > div.cpt > img";
  } else {
    return SELECTORS.DEFAULT;
  }
}

// Separate function to get captcha image and solve it
async function getCaptchaImageAndSolve(selector) {
  const captchaImg = document.querySelector(selector);
  if (!captchaImg) {
    throw new Error(`Captcha image not found with selector: ${selector}`);
  }
  
  // Get base64 data from image
  let imageBase64;
  if (captchaImg.tagName === 'IMG') {
    if (captchaImg.src.startsWith('data:image')) {
      imageBase64 = captchaImg.src;
    } else {
      // Convert image to base64
      imageBase64 = await getBase64FromImageUrl(captchaImg.src);
    }
  } else {
    throw new Error('Selected element is not an image');
  }
  
  // Solve the captcha
  return await solveCaptcha(imageBase64);
}

// Helper function to convert image URL to base64
function getBase64FromImageUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function solveCaptcha(imageBase64) {
  console.log(imageBase64);
  
  try {
    // Use a working API endpoint - replace this with your actual endpoint
    // For testing, you could use a mock response
    const result = await fetch('https://api.example.com/solve-captcha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey: 'your-api-key',
        image: imageBase64
      })
    });
    
    if (!result.ok) {
      throw new Error(`API returned ${result.status}: ${result.statusText}`);
    }
    
    const response = await result.json();
    return response.text || response.solution;
  } catch (error) {
    console.error('Error solving captcha:', error);
    // For development/testing, you can return a mock result
    return "MOCK123"; // Replace with actual implementation
  }
}

// Main function to handle captcha solving and submission
async function submitAndValidateCaptcha() {
  console.log("Captcha solving started");
  const currentUrl = window.location.href;

  try {
    await delay(2000); // Wait for 2 seconds
    const captchaSelector = getCaptchaSelector(currentUrl);
    console.log("Using captcha selector:", captchaSelector);

    // Get captcha text from the page
    const captchaText = await getCaptchaText(captchaSelector, 3, 1000);
    console.log("Captcha text found:", captchaText);

    // Fill the captcha value in the input field
    fillInput(SELECTORS.CAPTCHA_INPUT, captchaText);
    console.log("Captcha filled in input:", SELECTORS.CAPTCHA_INPUT);

    // Send message to background script for logging
    chrome.runtime.sendMessage({
      action: "captchaFilled",
      url: currentUrl,
      success: true,
    });
  } catch (error) {
    console.error("Captcha solving failed:", error.message);
    // Send error to background script
    chrome.runtime.sendMessage({
      action: "captchaError",
      url: currentUrl,
      error: error.message,
    });
  }
}

// Run the script after the page has fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", submitAndValidateCaptcha);
} else {
  submitAndValidateCaptcha();
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "solveCaptcha") {
    try {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", submitAndValidateCaptcha);
        sendResponse({ success: true });
      } else {
        submitAndValidateCaptcha();
        sendResponse({ success: true });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
});
