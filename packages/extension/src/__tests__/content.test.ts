import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock webextension-polyfill
const mockBrowser = {
  runtime: {
    onMessage: {
      addListener: vi.fn()
    },
    sendMessage: vi.fn()
  }
};

vi.mock('webextension-polyfill', () => ({
  default: mockBrowser
}));

// Mock DOM methods
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
const mockCreateElement = vi.fn();
const mockGetElementById = vi.fn();

Object.defineProperty(global, 'document', {
  value: {
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
    createElement: mockCreateElement,
    getElementById: mockGetElementById,
    body: {
      appendChild: vi.fn(),
      children: []
    }
  },
  writable: true
});

Object.defineProperty(global, 'window', {
  value: {
    location: {
      href: 'https://example.com'
    },
    scrollX: 0,
    scrollY: 0,
    addEventListener: vi.fn(),
    MutationObserver: vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn()
    }))
  },
  writable: true
});

describe('Content Script', () => {
  let messageHandler: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import content script
    await import('../content/index');
    
    // Get the message handler
    messageHandler = mockBrowser.runtime.onMessage.addListener.mock.calls[0][0];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Message Handling', () => {
    it('should handle START_STEP_CAPTURE message', () => {
      const sendResponse = vi.fn();
      const message = {
        type: 'START_STEP_CAPTURE',
        payload: { sessionId: 'session-123' }
      };

      messageHandler(message, null, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({ success: true });
      
      // Should add event listeners
      expect(mockAddEventListener).toHaveBeenCalledWith('click', expect.any(Function), true);
      expect(mockAddEventListener).toHaveBeenCalledWith('input', expect.any(Function), true);
      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function), true);
    });

    it('should handle STOP_STEP_CAPTURE message', () => {
      const sendResponse = vi.fn();
      
      // First start capture
      messageHandler({
        type: 'START_STEP_CAPTURE',
        payload: { sessionId: 'session-123' }
      }, null, vi.fn());

      // Then stop capture
      messageHandler({
        type: 'STOP_STEP_CAPTURE'
      }, null, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({ success: true });
      
      // Should remove event listeners
      expect(mockRemoveEventListener).toHaveBeenCalledWith('click', expect.any(Function), true);
      expect(mockRemoveEventListener).toHaveBeenCalledWith('input', expect.any(Function), true);
      expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function), true);
    });

    it('should handle GET_CAPTURE_STATUS message', () => {
      const sendResponse = vi.fn();
      
      messageHandler({
        type: 'GET_CAPTURE_STATUS'
      }, null, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        isCapturing: false,
        sessionId: null
      });
    });

    it('should handle unknown message type', () => {
      const sendResponse = vi.fn();
      
      messageHandler({
        type: 'UNKNOWN_TYPE'
      }, null, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({
        error: 'Unknown message type'
      });
    });
  });

  describe('Step Capture', () => {
    beforeEach(() => {
      // Start step capture
      messageHandler({
        type: 'START_STEP_CAPTURE',
        payload: { sessionId: 'session-123' }
      }, null, vi.fn());
    });

    it('should capture click events', () => {
      const clickHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];

      const mockElement = {
        tagName: 'BUTTON',
        textContent: 'Click me',
        id: 'test-button',
        className: 'btn primary'
      };

      const mockEvent = {
        target: mockElement,
        clientX: 100,
        clientY: 200
      };

      mockBrowser.runtime.sendMessage.mockResolvedValue({ success: true });

      clickHandler(mockEvent);

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'CAPTURE_STEP',
        payload: expect.objectContaining({
          action: 'click',
          element: expect.any(String),
          coordinates: { x: 100, y: 200 },
          text: 'Click me',
          timestamp: expect.any(Number),
          url: 'https://example.com'
        })
      });
    });

    it('should capture input events', () => {
      const inputHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'input'
      )[1];

      const mockElement = {
        tagName: 'INPUT',
        value: 'test input',
        id: 'test-input'
      };

      const mockEvent = {
        target: mockElement
      };

      // Simulate debounced capture
      inputHandler(mockEvent);

      // Should not immediately send message due to debouncing
      expect(mockBrowser.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should capture form submission events', () => {
      const submitHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'submit'
      )[1];

      const mockElement = {
        tagName: 'FORM',
        id: 'test-form'
      };

      const mockEvent = {
        target: mockElement
      };

      mockBrowser.runtime.sendMessage.mockResolvedValue({ success: true });

      submitHandler(mockEvent);

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'CAPTURE_STEP',
        payload: expect.objectContaining({
          action: 'submit',
          element: expect.any(String),
          timestamp: expect.any(Number),
          url: 'https://example.com'
        })
      });
    });

    it('should capture focus events on form elements', () => {
      const focusHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'focus'
      )[1];

      const mockElement = {
        tagName: 'INPUT',
        id: 'test-input'
      };

      const mockEvent = {
        target: mockElement
      };

      mockBrowser.runtime.sendMessage.mockResolvedValue({ success: true });

      focusHandler(mockEvent);

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'CAPTURE_STEP',
        payload: expect.objectContaining({
          action: 'focus',
          element: expect.any(String),
          timestamp: expect.any(Number),
          url: 'https://example.com'
        })
      });
    });

    it('should capture scroll events', () => {
      const scrollHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'scroll'
      )[1];

      const mockEvent = {};

      // Scroll events are debounced, so we need to test the debouncing
      scrollHandler(mockEvent);

      // Should not immediately send message due to debouncing
      expect(mockBrowser.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it('should capture special key events', () => {
      const keydownHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )[1];

      const mockElement = {
        tagName: 'INPUT',
        id: 'test-input'
      };

      const mockEvent = {
        key: 'Enter',
        target: mockElement
      };

      mockBrowser.runtime.sendMessage.mockResolvedValue({ success: true });

      keydownHandler(mockEvent);

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'CAPTURE_STEP',
        payload: expect.objectContaining({
          action: 'type',
          element: expect.any(String),
          text: '[Enter]',
          timestamp: expect.any(Number),
          url: 'https://example.com'
        })
      });
    });
  });

  describe('Element Selector Generation', () => {
    it('should generate selector using ID when available', () => {
      // This tests the getElementSelector function indirectly
      const clickHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];

      const mockElement = {
        tagName: 'BUTTON',
        id: 'unique-button',
        textContent: 'Click me'
      };

      const mockEvent = {
        target: mockElement,
        clientX: 100,
        clientY: 200
      };

      mockBrowser.runtime.sendMessage.mockResolvedValue({ success: true });

      clickHandler(mockEvent);

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'CAPTURE_STEP',
        payload: expect.objectContaining({
          element: '#unique-button'
        })
      });
    });

    it('should generate selector using class when ID not available', () => {
      const clickHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];

      const mockElement = {
        tagName: 'BUTTON',
        className: 'btn primary',
        textContent: 'Click me'
      };

      const mockEvent = {
        target: mockElement,
        clientX: 100,
        clientY: 200
      };

      mockBrowser.runtime.sendMessage.mockResolvedValue({ success: true });

      clickHandler(mockEvent);

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'CAPTURE_STEP',
        payload: expect.objectContaining({
          element: 'button.btn.primary'
        })
      });
    });
  });

  describe('Recording Indicator', () => {
    it('should show recording indicator when capture starts', () => {
      const mockIndicator = {
        id: 'stepflow-recording-indicator',
        innerHTML: '',
        remove: vi.fn()
      };

      mockCreateElement.mockReturnValue(mockIndicator);
      mockGetElementById.mockReturnValue(null);

      messageHandler({
        type: 'START_STEP_CAPTURE',
        payload: { sessionId: 'session-123' }
      }, null, vi.fn());

      expect(mockCreateElement).toHaveBeenCalledWith('div');
      expect(document.body.appendChild).toHaveBeenCalledWith(mockIndicator);
    });

    it('should hide recording indicator when capture stops', () => {
      const mockIndicator = {
        remove: vi.fn()
      };

      mockGetElementById.mockReturnValue(mockIndicator);

      // Start capture first
      messageHandler({
        type: 'START_STEP_CAPTURE',
        payload: { sessionId: 'session-123' }
      }, null, vi.fn());

      // Stop capture
      messageHandler({
        type: 'STOP_STEP_CAPTURE'
      }, null, vi.fn());

      expect(mockIndicator.remove).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle message sending errors gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockBrowser.runtime.sendMessage.mockRejectedValue(new Error('Network error'));

      // Start capture
      messageHandler({
        type: 'START_STEP_CAPTURE',
        payload: { sessionId: 'session-123' }
      }, null, vi.fn());

      // Trigger a click event
      const clickHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];

      const mockEvent = {
        target: { tagName: 'BUTTON', id: 'test' },
        clientX: 100,
        clientY: 200
      };

      clickHandler(mockEvent);

      // Should not throw error
      expect(consoleError).not.toHaveBeenCalled();
      
      consoleError.mockRestore();
    });
  });
});