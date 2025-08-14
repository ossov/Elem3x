// popup.js

// --- Get UI elements ---
const selectorDiv = document.getElementById('selector');
const stylesPre = document.getElementById('styles');
const resultPre = document.getElementById('result');
const closeBtn = document.getElementById('closeBtn');
const colorPicker = document.getElementById('colorPicker');
const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontSizeValue = document.getElementById('fontSizeValue');
const fontWeightSlider = document.getElementById('fontWeightSlider');
const fontWeightValue = document.getElementById('fontWeightValue');
const boldBtn = document.getElementById('boldBtn');
// --- Get the new border-radius elements ---
const borderRadiusSlider = document.getElementById('borderRadiusSlider');
const borderRadiusValue = document.getElementById('borderRadiusValue');


// --- State variables ---
let currentData = null;
let activeStyles = {};

// --- DATA HANDLING ---
function updatePanel(data) {
  currentData = data;
  if (data) {
    selectorDiv.textContent = data.selector;
    stylesPre.textContent = JSON.stringify(data.styles, null, 2);

    // Set Text Color
    const currentColor = data.styles['color'];
    colorPicker.value = rgbToHex(currentColor);

    // Set Font Size
    const currentSize = parseInt(data.styles['font-size']) || 16;
    fontSizeSlider.value = currentSize;
    fontSizeValue.textContent = `${currentSize}px`;

    // Set Font Weight
    let currentWeight = data.styles['font-weight'];
    if (currentWeight === 'bold') { currentWeight = '700'; } 
    else if (currentWeight === 'normal') { currentWeight = '400'; }
    fontWeightSlider.value = currentWeight;
    fontWeightValue.textContent = currentWeight;

    // --- NEW: Set Border Radius ---
    const currentRadius = parseInt(data.styles['border-radius']) || 0;
    borderRadiusSlider.value = currentRadius;
    borderRadiusValue.textContent = `${currentRadius}px`;

  } else {
    selectorDiv.textContent = "Click an element on the page.";
    stylesPre.textContent = "";
  }
}

chrome.runtime.sendMessage({ type: "getSelector" }, (response) => {
  if (response) { updatePanel(response.data); }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "selectorUpdated") {
    activeStyles = {};
    resultPre.textContent = "";
    updatePanel(message.data);
  }
});

// --- GUI EVENT LISTENERS ---
colorPicker.addEventListener('input', (e) => {
  if (!currentData) return;
  const newColor = e.target.value;
  activeStyles['color'] = newColor;
  const fullCss = generateFinalCss();
  if (fullCss) { window.parent.postMessage({ type: "injectCss", css: fullCss }, "*"); }
});

fontSizeSlider.addEventListener('input', (e) => {
  if (!currentData) return;
  const newSize = e.target.value;
  const newFontSize = `${newSize}px`;
  fontSizeValue.textContent = newFontSize;
  activeStyles['font-size'] = newFontSize;
  const fullCss = generateFinalCss();
  if (fullCss) { window.parent.postMessage({ type: "injectCss", css: fullCss }, "*"); }
});

fontWeightSlider.addEventListener('input', (e) => {
  if (!currentData) return;
  const newWeight = e.target.value;
  fontWeightValue.textContent = newWeight;
  activeStyles['font-weight'] = newWeight;
  const fullCss = generateFinalCss();
  if (fullCss) { window.parent.postMessage({ type: "injectCss", css: fullCss }, "*"); }
});

boldBtn.addEventListener('click', () => {
  if (!currentData) return;
  fontWeightSlider.value = 700;
  fontWeightSlider.dispatchEvent(new Event('input'));
});

// --- NEW: Add listener for the border-radius slider ---
borderRadiusSlider.addEventListener('input', (e) => {
  if (!currentData) return;
  const newRadius = e.target.value;
  const newBorderRadius = `${newRadius}px`;
  borderRadiusValue.textContent = newBorderRadius;
  activeStyles['border-radius'] = newBorderRadius;
  const fullCss = generateFinalCss();
  if (fullCss) { window.parent.postMessage({ type: "injectCss", css: fullCss }, "*"); }
});


// --- HELPER FUNCTIONS ---
function generateFinalCss() {
  if (!currentData || Object.keys(activeStyles).length === 0) {
    resultPre.textContent = "";
    return "";
  }
  let cssText = `${currentData.selector} {\n`;
  for (const property in activeStyles) {
    cssText += `  ${property}: ${activeStyles[property]};\n`;
  }
  cssText += `}`;
  resultPre.textContent = cssText;
  return cssText;
}

function rgbToHex(rgb) {
  if (!rgb || !rgb.startsWith('rgb')) return '#000000';
  const [r, g, b] = rgb.match(/\d+/g).map(Number);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// --- Close Button Listener ---
closeBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: "closePanel" });
});