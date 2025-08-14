// popup.js

// --- Get UI elements ---
const selectorDiv = document.getElementById('selector');
const stylesPre = document.getElementById('styles');
const generateBtn = document.getElementById('generateBtn');
const commandInput = document.getElementById('command'); // This line was likely missing
const resultPre = document.getElementById('result');
const closeBtn = document.getElementById('closeBtn');

// State variable to hold the latest element data
let currentData = null;

// --- DATA HANDLING ---

// 1. Request initial data when the panel opens
chrome.runtime.sendMessage({ type: "getSelector" }, (response) => {
  if (response && response.data) {
    currentData = response.data;
    selectorDiv.textContent = response.data.selector;
    stylesPre.textContent = JSON.stringify(currentData.styles, null, 2);
  } else {
    selectorDiv.textContent = "Click an element on the page.";
    stylesPre.textContent = "";
  }
});

// 2. Listen for live updates when a new element is clicked or unlocked
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "selectorUpdated") {
    currentData = message.data;
    if (currentData) {
      selectorDiv.textContent = currentData.selector;
      stylesPre.textContent = JSON.stringify(currentData.styles, null, 2);
    } else {
      selectorDiv.textContent = "Click an element on the page.";
      stylesPre.textContent = "";
    }
  }
});

// --- EVENT LISTENERS ---

// Generate CSS when the button is clicked
generateBtn.addEventListener('click', () => {
  const command = commandInput.value;

  if (currentData && command) {
    const stylesString = JSON.stringify(currentData.styles, null, 2);
    const prompt = `
You are an expert CSS code generator.
Generate a CSS rule based on the user's request, taking the element's current styles into account for context.
Only output the final CSS code block. Do not include any explanation.

Selector: "${currentData.selector}"
Current Styles:
${stylesString}

User Request: "${command}"
`;
    resultPre.textContent = "Generating...\n" + prompt;
    
    const API_KEY = "YOUR_GEMINI_API_KEY_HERE";
    const API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
    const url = `${API_ENDPOINT}?key=${API_KEY}`;

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "contents": [{"parts": [{"text": prompt}]}]
      })
    })
    .then(response => {
      if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
      return response.json();
    })
    .then(data => {
      const generatedCss = data.candidates[0].content.parts[0].text;
      const cleanedCss = generatedCss.replace(/```css\n?|```/g, "").trim();
      resultPre.textContent = cleanedCss;
      chrome.runtime.sendMessage({ type: "injectCss", css: cleanedCss });
    })
    .catch(error => {
      console.error("Error calling Google AI API:", error);
      resultPre.textContent = "Error: Could not generate CSS. Check the console.";
    });
  }
});

// Close the panel when the 'X' is clicked
closeBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: "closePanel" });
});