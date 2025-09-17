import browser from 'webextension-polyfill';

// Types for step capture
interface CapturedStep {
  action: 'click' | 'type' | 'navigate' | 'scroll' | 'hover' | 'focus' | 'submit';
  element?: string;
  coordinates?: { x: number; y: number };
  text?: string;
  url?: string;
  timestamp: number;
  screenshot?: string;
}

interface StepCaptureState {
  isCapturing: boolean;
  sessionId: string | null;
  lastAction: CapturedStep | null;
  actionQueue: CapturedStep[];
}

// Content script state
let captureState: StepCaptureState = {
  isCapturing: false,
  sessionId: null,
  lastAction: null,
  actionQueue: []
};

// Debounce timer for batching actions
let actionDebounceTimer: NodeJS.Timeout | null = null;

console.log('StepFlow content script loaded on:', window.location.href);

// Listen for messages from background script
browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  switch (message.type) {
    case 'START_STEP_CAPTURE':
      startStepCapture(message.payload.sessionId);
      sendResponse({ success: true });
      break;
      
    case 'STOP_STEP_CAPTURE':
      stopStepCapture();
      sendResponse({ success: true });
      break;
      
    case 'GET_CAPTURE_STATUS':
      sendResponse({ 
        success: true, 
        isCapturing: captureState.isCapturing,
        sessionId: captureState.sessionId
      });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

/**
 * Start capturing user interactions
 */
function startStepCapture(sessionId: string): void {
  if (captureState.isCapturing) {
    console.log('Step capture already active');
    return;
  }

  captureState.isCapturing = true;
  captureState.sessionId = sessionId;
  captureState.actionQueue = [];

  // Add event listeners for various user interactions
  addEventListeners();
  
  // Show visual indicator that recording is active
  showRecordingIndicator();
  
  console.log('Step capture started for session:', sessionId);
}

/**
 * Stop capturing user interactions
 */
function stopStepCapture(): void {
  if (!captureState.isCapturing) {
    return;
  }

  captureState.isCapturing = false;
  captureState.sessionId = null;
  
  // Remove event listeners
  removeEventListeners();
  
  // Hide recording indicator
  hideRecordingIndicator();
  
  // Send any remaining queued actions
  if (captureState.actionQueue.length > 0) {
    sendQueuedActions();
  }
  
  console.log('Step capture stopped');
}

/**
 * Add event listeners for user interactions
 */
function addEventListeners(): void {
  // Click events
  document.addEventListener('click', handleClick, true);
  
  // Input events
  document.addEventListener('input', handleInput as EventListener, true);
  document.addEventListener('change', handleChange, true);
  
  // Form events
  document.addEventListener('submit', handleSubmit, true);
  
  // Navigation events
  document.addEventListener('focus', handleFocus, true);
  document.addEventListener('blur', handleBlur, true);
  
  // Mouse events
  document.addEventListener('mouseenter', handleMouseEnter, true);
  document.addEventListener('mouseleave', handleMouseLeave, true);
  
  // Scroll events
  document.addEventListener('scroll', handleScroll, true);
  
  // Keyboard events
  document.addEventListener('keydown', handleKeyDown, true);
}

/**
 * Remove event listeners
 */
function removeEventListeners(): void {
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('input', handleInput as EventListener, true);
  document.removeEventListener('change', handleChange, true);
  document.removeEventListener('submit', handleSubmit, true);
  document.removeEventListener('focus', handleFocus, true);
  document.removeEventListener('blur', handleBlur, true);
  document.removeEventListener('mouseenter', handleMouseEnter, true);
  document.removeEventListener('mouseleave', handleMouseLeave, true);
  document.removeEventListener('scroll', handleScroll, true);
  document.removeEventListener('keydown', handleKeyDown, true);
}

/**
 * Event handlers
 */
function handleClick(event: MouseEvent): void {
  if (!captureState.isCapturing) return;
  
  const target = event.target as Element;
  const step: CapturedStep = {
    action: 'click',
    element: getElementSelector(target),
    coordinates: { x: event.clientX, y: event.clientY },
    timestamp: Date.now(),
    url: window.location.href
  };
  
  // Add text content for buttons and links
  if (target.tagName === 'BUTTON' || target.tagName === 'A') {
    step.text = target.textContent?.trim() || '';
  }
  
  captureStep(step);
}

function handleInput(event: InputEvent): void {
  if (!captureState.isCapturing) return;
  
  const target = event.target as HTMLInputElement;
  const step: CapturedStep = {
    action: 'type',
    element: getElementSelector(target),
    text: target.value,
    timestamp: Date.now(),
    url: window.location.href
  };
  
  // Debounce input events to avoid too many captures
  debouncedCaptureStep(step);
}

function handleChange(event: Event): void {
  if (!captureState.isCapturing) return;
  
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  const step: CapturedStep = {
    action: 'type',
    element: getElementSelector(target),
    text: target.value,
    timestamp: Date.now(),
    url: window.location.href
  };
  
  captureStep(step);
}

function handleSubmit(event: SubmitEvent): void {
  if (!captureState.isCapturing) return;
  
  const target = event.target as HTMLFormElement;
  const step: CapturedStep = {
    action: 'submit',
    element: getElementSelector(target),
    timestamp: Date.now(),
    url: window.location.href
  };
  
  captureStep(step);
}

function handleFocus(event: FocusEvent): void {
  if (!captureState.isCapturing) return;
  
  const target = event.target as Element;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
    const step: CapturedStep = {
      action: 'focus',
      element: getElementSelector(target),
      timestamp: Date.now(),
      url: window.location.href
    };
    
    captureStep(step);
  }
}

function handleBlur(_event: FocusEvent): void {
  // Currently not capturing blur events to reduce noise
  // Could be added if needed for more detailed step tracking
}

function handleMouseEnter(event: MouseEvent): void {
  if (!captureState.isCapturing) return;
  
  const target = event.target as Element;
  // Only capture hover for interactive elements
  if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.classList.contains('clickable')) {
    const step: CapturedStep = {
      action: 'hover',
      element: getElementSelector(target),
      coordinates: { x: event.clientX, y: event.clientY },
      timestamp: Date.now(),
      url: window.location.href
    };
    
    debouncedCaptureStep(step);
  }
}

function handleMouseLeave(_event: MouseEvent): void {
  // Currently not capturing mouse leave events
}

function handleScroll(_event: Event): void {
  if (!captureState.isCapturing) return;
  
  const step: CapturedStep = {
    action: 'scroll',
    coordinates: { x: window.scrollX, y: window.scrollY },
    timestamp: Date.now(),
    url: window.location.href
  };
  
  // Debounce scroll events heavily to avoid spam
  debouncedCaptureStep(step, 1000);
}

function handleKeyDown(event: KeyboardEvent): void {
  if (!captureState.isCapturing) return;
  
  // Only capture special keys (Enter, Tab, Escape, etc.)
  const specialKeys = ['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  
  if (specialKeys.includes(event.key)) {
    const target = event.target as Element;
    const step: CapturedStep = {
      action: 'type',
      element: getElementSelector(target),
      text: `[${event.key}]`,
      timestamp: Date.now(),
      url: window.location.href
    };
    
    captureStep(step);
  }
}

/**
 * Capture a step and send to background script
 */
function captureStep(step: CapturedStep): void {
  if (!captureState.isCapturing || !captureState.sessionId) {
    return;
  }

  // Add to queue
  captureState.actionQueue.push(step);
  captureState.lastAction = step;
  
  // Send immediately for important actions, queue others
  const immediateActions = ['click', 'submit', 'navigate'];
  if (immediateActions.includes(step.action)) {
    sendQueuedActions();
  } else {
    // Batch other actions
    scheduleQueuedActionsSend();
  }
}

/**
 * Debounced version of captureStep
 */
function debouncedCaptureStep(step: CapturedStep, delay: number = 500): void {
  if (actionDebounceTimer) {
    clearTimeout(actionDebounceTimer);
  }
  
  actionDebounceTimer = setTimeout(() => {
    captureStep(step);
    actionDebounceTimer = null;
  }, delay);
}

/**
 * Send queued actions to background script
 */
function sendQueuedActions(): void {
  if (captureState.actionQueue.length === 0) {
    return;
  }

  const actionsToSend = [...captureState.actionQueue];
  captureState.actionQueue = [];

  // Send each action to background script
  actionsToSend.forEach(async (step) => {
    try {
      // Capture screenshot for important actions
      if (['click', 'submit'].includes(step.action)) {
        step.screenshot = await captureScreenshot();
      }

      await browser.runtime.sendMessage({
        type: 'CAPTURE_STEP',
        payload: step
      });
    } catch (error) {
      console.error('Failed to send step to background:', error);
    }
  });
}

/**
 * Schedule sending of queued actions
 */
function scheduleQueuedActionsSend(): void {
  // Send queued actions every 2 seconds
  setTimeout(() => {
    if (captureState.actionQueue.length > 0) {
      sendQueuedActions();
    }
  }, 2000);
}

/**
 * Get a unique selector for an element
 */
function getElementSelector(element: Element): string {
  // Try to get a unique selector for the element
  if (element.id) {
    return `#${element.id}`;
  }
  
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c.trim()).slice(0, 2);
    if (classes.length > 0) {
      return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
    }
  }
  
  // Use data attributes if available
  const dataTestId = element.getAttribute('data-testid') || element.getAttribute('data-test');
  if (dataTestId) {
    return `[data-testid="${dataTestId}"]`;
  }
  
  // Use text content for buttons and links
  if ((element.tagName === 'BUTTON' || element.tagName === 'A') && element.textContent) {
    const text = element.textContent.trim().substring(0, 20);
    return `${element.tagName.toLowerCase()}[text="${text}"]`;
  }
  
  // Fall back to tag name and position
  const siblings = Array.from(element.parentElement?.children || []);
  const index = siblings.indexOf(element);
  return `${element.tagName.toLowerCase()}:nth-child(${index + 1})`;
}

/**
 * Capture screenshot of current viewport
 */
async function captureScreenshot(): Promise<string> {
  try {
    // Use Canvas API to capture screenshot
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Set canvas size to viewport size
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Try to use html2canvas if available, otherwise use fallback
    if (typeof (window as any).html2canvas === 'function') {
      const html2canvas = (window as any).html2canvas;
      const canvasElement = await html2canvas(document.body, {
        width: viewport.width,
        height: viewport.height,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        allowTaint: true,
        scale: 0.5, // Reduce size for better performance
        logging: false
      });
      
      return canvasElement.toDataURL('image/jpeg', 0.8);
    } else {
      // Fallback: capture using getDisplayMedia API through background script
      return await captureScreenshotViaBackground();
    }
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    // Return a minimal placeholder image
    return createPlaceholderImage();
  }
}

/**
 * Capture screenshot via background script using screen capture API
 */
async function captureScreenshotViaBackground(): Promise<string> {
  try {
    const response = await browser.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT'
    });
    
    if (response.success && response.screenshot) {
      return response.screenshot;
    } else {
      throw new Error('Background screenshot capture failed');
    }
  } catch (error) {
    console.error('Background screenshot capture failed:', error);
    return createPlaceholderImage();
  }
}

/**
 * Create a placeholder image when screenshot capture fails
 */
function createPlaceholderImage(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }

  canvas.width = 400;
  canvas.height = 300;
  
  // Fill with light gray background
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add text
  ctx.fillStyle = '#6b7280';
  ctx.font = '16px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Screenshot unavailable', canvas.width / 2, canvas.height / 2);
  
  return canvas.toDataURL('image/png');
}

/**
 * Show visual indicator that recording is active
 */
function showRecordingIndicator(): void {
  // Remove existing indicator if present
  hideRecordingIndicator();
  
  const indicator = document.createElement('div');
  indicator.id = 'stepflow-recording-indicator';
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      font-weight: 500;
      z-index: 999999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 6px;
    ">
      <div style="
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
        animation: stepflow-pulse 1.5s infinite;
      "></div>
      Recording
    </div>
    <style>
      @keyframes stepflow-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    </style>
  `;
  
  document.body.appendChild(indicator);
}

/**
 * Hide recording indicator
 */
function hideRecordingIndicator(): void {
  const indicator = document.getElementById('stepflow-recording-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// Handle page navigation
let currentUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    
    if (captureState.isCapturing) {
      const step: CapturedStep = {
        action: 'navigate',
        url: currentUrl,
        timestamp: Date.now()
      };
      
      captureStep(step);
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (captureState.isCapturing && captureState.actionQueue.length > 0) {
    sendQueuedActions();
  }
});