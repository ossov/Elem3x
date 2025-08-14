// content.js

console.log("LLM CSS Tool content script loaded!");

// --- Global variables ---
let lastElement = null;
let lockedElement = null;
let isLocked = false;
let iframe = null;
let lastSelectedData = null; 

// --- CORE LOGIC ---

function highlight(element) {
  if (lastElement) {
    lastElement.classList.remove('highlight-element');
  }
  element.classList.add('highlight-element');
  lastElement = element;
}

document.addEventListener('mouseover', function (e) {
  if (!isLocked) {
    highlight(e.target);
  }
});

document.addEventListener('click', function (e) {
  e.preventDefault();
  e.stopImmediatePropagation();

  if (isLocked && lockedElement === e.target) {
    isLocked = false;
    lockedElement = null;
    lastSelectedData = null;
    console.log("Element unlocked.");

    // -- FIX: Send an update with null data when unlocking --
    if (iframe) {
      chrome.runtime.sendMessage({ type: "selectorUpdated", data: null });
    }
  } else {
    isLocked = true;
    lockedElement = e.target;
    highlight(lockedElement);

    lastSelectedData = {
      selector: generateCssSelector(lockedElement),
      styles: getElementStyles(lockedElement)
    };
    console.log("Element data stored:", lastSelectedData);

    if (iframe) {
      chrome.runtime.sendMessage({ type: "selectorUpdated", data: lastSelectedData });
    }
  }
}, true);


// --- MESSAGE LISTENER ---
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

  // 4. Listens for CSS from the panel to inject into the page
  if (message.type === "injectCss") {
    console.log("CSS received by content script:", message.css);
    let styleTag = document.getElementById('llm-css-tool-styles');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'llm-css-tool-styles';
      document.head.appendChild(styleTag);
    }
    // Update the style tag with the new CSS from the LLM
    styleTag.innerHTML = message.css;
  }
  
  return true;
});


// --- HELPER FUNCTIONS ---
function togglePanel() {
  if (iframe) {
    iframe.remove();
    iframe = null;
  } else {
    iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('popup.html');
    iframe.style.position = 'fixed';
    iframe.style.top = '15px';
    iframe.style.right = '15px';
    iframe.style.width = '350px';
    iframe.style.height = '500px';
    iframe.style.zIndex = '99999';
    iframe.style.border = '1px solid #ccc';
    iframe.style.borderRadius = '8px';
    iframe.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    document.body.appendChild(iframe);
  }
}

function generateCssSelector(el) {
  if (!(el instanceof Element)) return;
  const path = [];
  while (el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    if (el.id) {
      selector += '#' + el.id;
      path.unshift(selector);
      break;
    } else {
      let sib = el, nth = 1;
      while (sib = sib.previousElementSibling) {
        if (sib.nodeName.toLowerCase() == selector)
           nth++;
      }
      if (nth != 1)
        selector += ":nth-of-type("+nth+")";
    }
    path.unshift(selector);
    el = el.parentNode;
  }
  return path.join(" > ");
}

function getElementStyles(element) {
  const computedStyles = window.getComputedStyle(element);
  const styles = {};
  const propertiesToExtract = [
    'color', 'background-color', 'font-size', 'font-weight', 'font-family',
    'text-align', 'width', 'height', 'padding', 'margin', 'border',
    'border-radius', 'display', 'justify-content', 'align-items','background', 
    'background-clip', '-webkit-background-clip', '-webkit-text-fill-color'
  ];
  
  propertiesToExtract.forEach(prop => {
    // Check if the property exists before adding it
    const value = computedStyles.getPropertyValue(prop);
    if (value) {
      styles[prop] = value;
    }
  });

  return styles;
}