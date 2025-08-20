// popup.js

// --- Get UI elements ---
const selectorOptionsDiv = document.getElementById('selector-options');
const stylesPre = document.getElementById('styles');
const resultPre = document.getElementById('result');
const closeBtn = document.getElementById('closeBtn');
const colorPicker = document.getElementById('colorPicker');
const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontSizeValue = document.getElementById('fontSizeValue');
const fontWeightSlider = document.getElementById('fontWeightSlider');
const fontWeightValue = document.getElementById('fontWeightValue');
const boldBtn = document.getElementById('boldBtn');
const borderRadiusSlider = document.getElementById('borderRadiusSlider');
const borderRadiusValue = document.getElementById('borderRadiusValue');
const selectorToggle = document.getElementById('selectorToggle');

// --- State variables ---
let currentData = {
  selectedSelector: null,
  selectors: {},
  styles: {},
  type: ''
};
let activeStyles = {};

// --- MAIN PANEL UPDATE FUNCTION ---
function updatePanel(data) {
  activeStyles = {};
  resultPre.textContent = "";

  if (data) {
    currentData.selectors = data.selectors;
    currentData.styles = data.styles;
    currentData.type = data.type;
    buildSelectorUI(data.selectors);
    updateControls(data.styles);
    stylesPre.textContent = JSON.stringify(data.styles, null, 2);
  } else {
    selectorOptionsDiv.innerHTML = "Click an element on the page.";
    stylesPre.textContent = "";
    hideAllControls();
  }
}

// --- UI BUILDER ---
function buildSelectorUI(selectors) {
  selectorOptionsDiv.innerHTML = `<h4>Choose What to Edit:</h4>`;
  
  const isSimpleUnique = selectors.simpleCount === 1;
  const specificIsDefault = !isSimpleUnique;
  
  currentData.selectedSelector = specificIsDefault ? selectors.specific : selectors.simple;

  const specificRadio = `<div class="radio-option">
    <input type="radio" id="specific" name="selectorChoice" value="specific" ${specificIsDefault ? 'checked' : ''}>
    <label for="specific">
      <b>Edit Only This Element</b><br>
      <code>${selectors.specific}</code>
    </label>
  </div>`;
  selectorOptionsDiv.innerHTML += specificRadio;

  if (selectors.simple && selectors.simple !== selectors.specific) {
    const count = selectors.simpleCount;
    const labelText = (count > 1) 
      ? `<b>Edit ${count} Similar Elements</b>` 
      : `<b>Edit with Simple Class</b>`;

    const simpleRadio = `<div class="radio-option">
      <input type="radio" id="simple" name="selectorChoice" value="simple" ${isSimpleUnique ? 'checked' : ''}>
      <label for="simple">
        ${labelText}<br>
        <code>${selectors.simple}</code>
      </label>
    </div>`;
    selectorOptionsDiv.innerHTML += simpleRadio;
  }
  
  document.getElementsByName('selectorChoice').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const choice = e.target.value;
      currentData.selectedSelector = currentData.selectors[choice];
      activeStyles = {};
      generateFinalCss();
      const fullCss = resultPre.textContent;
      if (fullCss) {
        window.parent.postMessage({ type: "injectCss", css: fullCss }, "*");
      }
    });
  });
}

function updateControls(styles) {
  const textControls = document.getElementById('textControls');
  const buttonControls = document.getElementById('buttonControls');
  const elementType = currentData.type;

  textControls.style.display = 'block';
  buttonControls.style.display = 'block';

  if (elementType === 'text' || elementType === 'button') {
    colorPicker.value = rgbToHex(styles['color']);
    const currentSize = parseInt(styles['font-size']) || 16;
    fontSizeSlider.value = currentSize;
    fontSizeValue.textContent = `${currentSize}px`;
    let currentWeight = styles['font-weight'];
    if (currentWeight === 'bold') { currentWeight = '700'; }
    else if (currentWeight === 'normal') { currentWeight = '400'; }
    fontWeightSlider.value = currentWeight;
    fontWeightValue.textContent = currentWeight;
  }
  if (elementType === 'button' || elementType === 'container') {
    const currentRadius = parseInt(styles['border-radius']) || 0;
    borderRadiusSlider.value = currentRadius;
    borderRadiusValue.textContent = `${currentRadius}px`;
  }
}

function hideAllControls() {
  document.getElementById('textControls').style.display = 'none';
  document.getElementById('buttonControls').style.display = 'none';
}

// --- INITIAL LOAD & LIVE UPDATE LISTENERS ---
chrome.runtime.sendMessage({ type: "getSelector" }, (response) => {
  if (response) { updatePanel(response.data); }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "selectorUpdated") {
    updatePanel(message.data);
  }
});

// --- GUI EVENT LISTENERS ---

// THIS LISTENER WAS MISSING
selectorToggle.addEventListener('change', (e) => {
  const isEnabled = e.target.checked;
  chrome.runtime.sendMessage({ type: "toggleSelector", enabled: isEnabled });
});

colorPicker.addEventListener('input', (e) => {
  if (!currentData.selectedSelector) return;
  activeStyles['color'] = e.target.value;
  const fullCss = generateFinalCss();
  if (fullCss) { window.parent.postMessage({ type: "injectCss", css: fullCss }, "*"); }
});

fontSizeSlider.addEventListener('input', (e) => {
  if (!currentData.selectedSelector) return;
  const newSize = e.target.value;
  activeStyles['font-size'] = `${newSize}px`;
  fontSizeValue.textContent = `${newSize}px`;
  const fullCss = generateFinalCss();
  if (fullCss) { window.parent.postMessage({ type: "injectCss", css: fullCss }, "*"); }
});

fontWeightSlider.addEventListener('input', (e) => {
  if (!currentData.selectedSelector) return;
  const newWeight = e.target.value;
  activeStyles['font-weight'] = newWeight;
  fontWeightValue.textContent = newWeight;
  const fullCss = generateFinalCss();
  if (fullCss) { window.parent.postMessage({ type: "injectCss", css: fullCss }, "*"); }
});

borderRadiusSlider.addEventListener('input', (e) => {
  if (!currentData.selectedSelector) return;
  const newRadius = e.target.value;
  activeStyles['border-radius'] = `${newRadius}px`;
  borderRadiusValue.textContent = `${newRadius}px`;
  const fullCss = generateFinalCss();
  if (fullCss) { window.parent.postMessage({ type: "injectCss", css: fullCss }, "*"); }
});

boldBtn.addEventListener('click', () => {
  if (!currentData.selectedSelector) return;
  fontWeightSlider.value = 700;
  fontWeightSlider.dispatchEvent(new Event('input'));
});

// --- HELPER FUNCTIONS ---
function generateFinalCss() {
  if (!currentData.selectedSelector || Object.keys(activeStyles).length === 0) {
    resultPre.textContent = "";
    return "";
  }
  let cssText = `${currentData.selectedSelector} {\n`;
  for (const property in activeStyles) {
    cssText += `  ${property}: ${activeStyles[property]};\n`;
  }
  cssText += `}`;
  resultPre.textContent = cssText;
  return cssText;
}

function rgbToHex(rgb) {
  if (!rgb || !rgb.startsWith('rgb')) return '#000000';
  const match = rgb.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#000000';
  const [, r, g, b] = match.map(Number);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

// --- Close Button Listener ---
closeBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: "closePanel" });
});