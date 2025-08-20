// content.js

// --- Global variables ---
let lastElement = null;
let lockedElement = null;
let isLocked = false;
let iframe = null;
let lastSelectedData = null; 
let isSelectorEnabled = true;

// --- CORE LOGIC ---
function highlight(element) {
  if (lastElement) { lastElement.classList.remove('highlight-element'); }
  element.classList.add('highlight-element');
  lastElement = element;
}

document.addEventListener('mouseover', (e) => {
  if (isSelectorEnabled && !isLocked) { // Check if selector is enabled
    highlight(e.target); 
  }
});

document.addEventListener('click', (e) => {
if (!isSelectorEnabled) return; // Stop if selector is disabled
  e.preventDefault();
  e.stopImmediatePropagation();
  if (isLocked && lockedElement === e.target) {
    isLocked = false;
    lockedElement = null;
    lastSelectedData = null;
    if (iframe) { chrome.runtime.sendMessage({ type: "selectorUpdated", data: null }); }
  } else {
    isLocked = true;
    lockedElement = e.target;
    highlight(lockedElement);
    lastSelectedData = {
      selectors: generateSelectors(lockedElement),
      styles: getElementStyles(lockedElement),
      type: getElementType(lockedElement)
    };
    if (iframe) { chrome.runtime.sendMessage({ type: "selectorUpdated", data: lastSelectedData }); }
  }
}, true);

// --- MESSAGE LISTENERS ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "toggleUI") {
    togglePanel();
  }
  if (message.type === "getSelector") {
    sendResponse({ data: lastSelectedData });
  }
  if (message.type === "closePanel") {
    if (iframe) {
      iframe.remove();
      iframe = null;
    }
  }
  // NEW: Listen for the toggle message from the panel
  if (message.type === "toggleSelector") {
    isSelectorEnabled = message.enabled;
    // Hide the highlight if the selector is being disabled
    if (!isSelectorEnabled && lastElement) {
      lastElement.classList.remove('highlight-element');
    }
  }
  return true;
});

window.addEventListener('message', (event) => {
  if (event.source !== iframe?.contentWindow) return;
  const message = event.data;
  if (message.type === "injectCss") {
    let styleTag = document.getElementById('llm-css-tool-styles');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'llm-css-tool-styles';
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = message.css;
  }
});

// --- HELPER FUNCTIONS ---
function generateSelectors(el) {
  if (!(el instanceof Element)) return {};

  const selectors = {};

  // 1. Generate the Simple, Class-based Selector by walking up the tree
  const simplePath = [];
  let currentEl = el;
  let stoppedAtClass = false;
  while (currentEl) {
    let selectorPart = currentEl.nodeName.toLowerCase();
    
    // Find a descriptive class, but ignore 'highlight-element'
    const descriptiveClass = Array.from(currentEl.classList).find(c => 
      /^[a-zA-Z][a-zA-Z_-]*$/.test(c) && c !== 'highlight-element'
    );

    if (descriptiveClass) {
      selectorPart = `${selectorPart}.${descriptiveClass}`;
      simplePath.unshift(selectorPart);
      stoppedAtClass = true;
      break; // Stop at the first parent with a good class
    } else {
      // Fallback for elements with no class
      let sib = currentEl, nth = 1;
      while (sib = sib.previousElementSibling) {
        if (sib.nodeName.toLowerCase() === selectorPart) nth++;
      }
      if (nth != 1) selectorPart += `:nth-of-type(${nth})`;
      simplePath.unshift(selectorPart);
    }
    
    currentEl = currentEl.parentElement;
  }
  
  // If we found a class, we only need the class and the direct element.
  // This turns `.parent.class > div > p` into `.parent.class > p`
  if (stoppedAtClass && simplePath.length > 2) {
      selectors.simple = `${simplePath[0]} > ${simplePath[simplePath.length - 1].split(':')[0]}`;
  } else {
      selectors.simple = simplePath.join(" > ");
  }

  // Count how many elements match the simple selector
  try {
    selectors.simpleCount = document.querySelectorAll(selectors.simple).length;
  } catch (e) {
    selectors.simpleCount = 1;
  }

  // 2. Generate the Hyper-Specific, ID-based Path
  const specificPath = [];
  currentEl = el; // Reset for the second path
  while (currentEl && currentEl.nodeType === Node.ELEMENT_NODE) {
    let selectorPart = currentEl.nodeName.toLowerCase();
    if (currentEl.id) {
      selectorPart = `#${currentEl.id}`;
      specificPath.unshift(selectorPart);
      break;
    } else {
      let sib = currentEl, nth = 1;
      while (sib = sib.previousElementSibling) {
        if (sib.nodeName.toLowerCase() == selectorPart) nth++;
      }
      if (nth != 1) selectorPart += `:nth-of-type(${nth})`;
    }
    specificPath.unshift(selectorPart);
    currentEl = currentEl.parentNode;
  }
  selectors.specific = specificPath.join(" > ");

  return selectors;
}

function togglePanel() {
  if (iframe) {
    iframe.remove();
    iframe = null;
  } else {
    iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('popup.html');
    iframe.style.all = 'initial';
    iframe.style.position = 'fixed';
    iframe.style.top = '15px';
    iframe.style.right = '15px';
    iframe.style.width = '350px';
    iframe.style.height = '95vh';
    iframe.style.zIndex = '2147483647';
    iframe.style.border = '1px solid #ccc';
    iframe.style.borderRadius = '8px';
    iframe.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    document.body.appendChild(iframe);
  }
}

function getElementStyles(element) {
  const computedStyles = window.getComputedStyle(element);
  const styles = {};
  const propertiesToExtract = ['color', 'background-color', 'font-size', 'font-weight', 'font-family', 'text-align', 'width', 'height', 'padding', 'margin', 'border', 'border-radius', 'display', 'justify-content', 'align-items'];
  propertiesToExtract.forEach(prop => {
    const value = computedStyles.getPropertyValue(prop);
    if (value) { styles[prop] = value; }
  });
  return styles;
}

function getElementType(element) {
  const tagName = element.tagName.toLowerCase();
  const textElements = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'li', 'td', 'strong', 'em'];
  const buttonElements = ['button', 'a'];
  if (buttonElements.includes(tagName) || (tagName === 'input' && ['button', 'submit', 'reset'].includes(element.type))) {
    return 'button';
  }
  if (textElements.includes(tagName)) {
    return 'text';
  }
  return 'container';
}