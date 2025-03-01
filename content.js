// Constants for selectors organized by state
const SELECTORS = {
  AP: {
    MAINPAGE:
      "#encumbranceServiceForm > div:nth-child(2) > div:nth-child(2) > span",
    ENCUMBRANCE_SEARCH:
      "#__next > div > div:nth-child(3) > div.MainContent > div > div > form > div:nth-child(5) > div:nth-child(5) > span",
    EDETAILS:
      "#__next > div > div:nth-child(3) > div.MainContent > div > div > div > div > div > form > div.p.row > div:nth-child(13) > span",
    DEFAULT:
      "#encumbranceServiceForm > div:nth-child(2) > div:nth-child(2) > span",
    CAPTCHA_INPUT: 'input[name="captchaVal"]',
    SUBMIT_BUTTON: 'button[type="submit"]',
  },
  TG: {
    CAPTCHA_INPUT: 'input[name="captcha"]',
    CAPTCHA_IMAGE: "#captcha_image", // Assuming this is the selector for Telangana captcha image
    SUBMIT_BUTTON: "#submitButton",
    DEFAULT: "#myForm > div.cpt > img", // Replace with actual default selector for Telangana
  },
};

// Helper function to get the correct selector based on state
function getSelector(state, selectorType) {
  const stateCode =
    state?.toLowerCase() === "telangana" || state?.toLowerCase() === "tg"
      ? "TG"
      : "AP";
  return SELECTORS[stateCode][selectorType] || SELECTORS[stateCode].DEFAULT;
}

async function getCaptchaText(
  state,
  selectorType,
  maxRetries = 10,
  retryInterval = 1000
) {
  let retries = 0;
  console.log(selectorType);

  const selector = getSelector(state, selectorType || "DEFAULT");

  while (retries < maxRetries) {
    //get captcha text for andhra pradesh and text from image for teleangana
    if (state === "telangana") {
      return await getCaptchaImageAndSolve(selector);
    }
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

// Separate function to get captcha image and solve it
async function getCaptchaImageAndSolve(selector) {
  console.log("Getting captcha image with selector:", selector);
  const captchaImg = document.querySelector(selector);
  if (!captchaImg) {
    throw new Error(`Captcha image not found with selector: ${selector}`);
  }

  console.log("Found captcha image:", captchaImg);

  // Create a canvas and capture the image directly from the DOM element
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Set canvas dimensions to match the image
    canvas.width = captchaImg.width || captchaImg.offsetWidth;
    canvas.height = captchaImg.height || captchaImg.offsetHeight;
    // Wait for the image to load if necessary
    if (!captchaImg.complete) {
      await new Promise((resolve) => {
        captchaImg.onload = resolve;
        setTimeout(resolve, 2000); // Timeout after 2s
      });
    }

    // Draw the image to canvas
    ctx.drawImage(captchaImg, 0, 0, canvas.width, canvas.height);
    preprocessCaptchaImage(ctx, canvas.width, canvas.height);

    // Convert to data URL
    const imageDataUrl = canvas.toDataURL("image/png");

    // Use Tesseract.js to recognize text
    console.log("Recognizing captcha with Tesseract...");
    const result = await recognizeWithTesseract(imageDataUrl);

    console.log("Tesseract result:", result);

    // Clean up the result - remove spaces, special characters, etc.
    const cleanedResult = result.trim().replace(/[^a-zA-Z0-9]/g, "");

    return cleanedResult;
  } catch (error) {
    console.error("Error capturing captcha screenshot:", error);
    throw error;
  }
}
// Preprocess image to improve OCR accuracy for captchas
function preprocessCaptchaImage(ctx, width, height) {
  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Convert to binary (black and white) with threshold
  for (let i = 0; i < data.length; i += 4) {
    // Calculate grayscale value
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;

    // Apply threshold (adjust threshold value as needed)
    const threshold = 150;
    const color = avg > threshold ? 255 : 0;

    // Set RGB values
    data[i] = color; // R
    data[i + 1] = color; // G
    data[i + 2] = color; // B
    // Keep alpha (data[i + 3]) as is
  }

  // Put the modified data back
  ctx.putImageData(imageData, 0, 0);
}
// Function to use Tesseract.js for OCR
async function recognizeWithTesseract(imageDataUrl) {
  // Make sure Tesseract is available
  if (typeof Tesseract === "undefined") {
    throw new Error("Tesseract.js is not loaded");
  }

  try {
    // Create a worker
    const worker = await Tesseract.createWorker();

    // Initialize worker with options optimized for captchas
    await worker.load();
    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    // Set parameters for better captcha recognition
    await worker.setParameters({
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
      tessjs_create_hocr: "0",
      tessjs_create_tsv: "0",
    });

    // Recognize text
    const {
      data: { text },
    } = await worker.recognize(imageDataUrl);

    // Clean up
    await worker.terminate();

    return text;
  } catch (error) {
    console.error("Tesseract OCR error:", error);
    throw error;
  }
}

// Function to delay execution
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Function to fill captcha input field
async function fillCaptchaInput(state, captchaText) {
  const inputSelector = getSelector(state, "CAPTCHA_INPUT");
  const captchaInput = document.querySelector(inputSelector);

  if (!captchaInput) {
    throw new Error(
      `Captcha input field not found with selector: ${inputSelector}`
    );
  }

  console.log(`Filling captcha input with text: ${captchaText}`);
  captchaInput.value = captchaText;

  // Trigger input event to notify any listeners
  captchaInput.dispatchEvent(new Event("input", { bubbles: true }));
  captchaInput.dispatchEvent(new Event("change", { bubbles: true }));

  return true;
}
async function submitForm(state) {
  const submitButtonSelector = getSelector(state, "SUBMIT_BUTTON");
  const submitButton = document.querySelector(submitButtonSelector);

  if (!submitButton) {
    throw new Error(
      `Submit button not found with selector: ${submitButtonSelector}`
    );
  }

  console.log("Submitting form...");
  submitButton.click();

  return true;
}

async function solveCaptchaAndSubmit() {
  try {
    let selectorType = "DEFAULT";
    const url = window.location.href;
    console.log("Captcha solving started");
    const state = identifyStateByUrl(url);

    console.log("State identified :", state);
    if (state === "andhra_pradesh") {
      if (url.includes("Mainpage")) {
        selectorType = "MAINPAGE";
      } else if (url.includes("EncumbranceSearch")) {
        selectorType = "ENCUMBRANCE_SEARCH";
      } else if (url.includes("EDetails")) {
        selectorType = "EDETAILS";
      }
    }

    // Get captcha text
    const captchaText = await getCaptchaText(state, selectorType);
    console.log(`Captcha text: ${captchaText}`);

    // Fill captcha input
    await fillCaptchaInput(state, captchaText);
    // Send message to background script for logging
    return chrome.runtime.sendMessage({
      action: "captchaFilled",
      url,
      success: true,
    });
  } catch (error) {
    console.error("Captcha solving failed:", error.message);
    // Send error to background script
    chrome.runtime.sendMessage({
      action: "captchaError",
      url,
      error: error.message,
    });
  }
}

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
function getCaptchaSelector(state, url) {
  if (state === "andhra_pradesh") {
    if (url.includes("ecSearch/Mainpage")) {
      return SELECTORS.MAINPAGE;
    } else if (url.includes("/ecSearch/EncumbranceSearch")) {
      return SELECTORS.ENCUMBRANCE_SEARCH;
    } else if (url.includes("EDetails")) {
      return SELECTORS.EDETAILS;
    } else {
      return SELECTORS.DEFAULT;
    }
  } else if (state === "telangana") {
    // Return a selector string, not a Promise
    return "#myForm > div.cpt > img";
  } else {
    return SELECTORS.DEFAULT;
  }
}
// Function to identify state by site URL
function identifyStateByUrl(url) {
  if (!url) return "unknown";

  const urlLower = url.toLowerCase();

  if (urlLower.includes("ap.gov.in")) {
    return "andhra_pradesh";
  } else if (urlLower.includes("telangana.gov.in")) {
    return "telangana";
  } else if (urlLower.includes("tn.gov.in")) {
    return "tamil_nadu";
  } else if (urlLower.includes("karnataka.gov.in")) {
    return "karnataka";
  } else if (urlLower.includes("maharashtra.gov.in")) {
    return "maharashtra";
  } else if (urlLower.includes("kerala.gov.in")) {
    return "kerala";
  } else {
    return "unknown";
  }
}

// Helper function to convert image URL to base64
function getBase64FromImageUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}

async function solveCaptcha(imageBase64) {
  console.log(imageBase64);

  try {
    // Use a working API endpoint - replace this with your actual endpoint
    const result = await fetch("https://api.2captcha.com/createTask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientKey: "303e600541939e51d37e75d7c06a7e1e",
        task: {
          type: "ImageToTextTask",
          body: imageBase64,
          phrase: false,
          case: true,
          numeric: 0,
          math: false,
          minLength: 1,
          maxLength: 5,
          comment: "enter the text you see on the image",
        },
        languagePool: "en",
      }),
    });

    if (!result.ok) {
      throw new Error(`API returned ${result.status}: ${result.statusText}`);
    }

    const response = await result.json();
    return response.text || response.solution;
  } catch (error) {
    console.error("Error solving captcha:", error);
    // For development/testing, you can return a mock result
    return "MOCK123"; // Replace with actual implementation
  }
}

// Main function to handle captcha solving and submission

// Run the script after the page has fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", solveCaptchaAndSubmit);
} else {
  solveCaptchaAndSubmit();
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "solveCaptcha") {
    try {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", solveCaptchaAndSubmit);
        sendResponse({ success: true });
      } else {
        solveCaptchaAndSubmit();
        sendResponse({ success: true });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
});
