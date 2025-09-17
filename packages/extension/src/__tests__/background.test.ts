import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock webextension-polyfill
const mockBrowser = {
  runtime: {
    onInstalled: {
      addListener: vi.fn()
    },
    onMessage: {
      addListener: vi.fn()
    },
    onSuspend: {
      addListener: vi.fn()
    }
  },
  contextMenus: {
    create: vi.fn(),
    onClicked: {
      addListener: vi.fn()
    }
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn()
  },
  tabs: {
    sendMessage: vi.fn(),
    query: vi.fn()
  },
  storage: {
    local: {
      get: vi.fn()
    }
  }
};

vi.mock('webextension-polyfill', () => ({
  default: mockBrowser
}));

// Mock Chrome APIs
const mockChrome = {
  desktopCapture: {
    chooseDesktopMedia: vi.fn()
  }
};

Object.defineProperty(global, 'chrome', {
  value: mockChrome,
  writable: true
});

// Mock MediaRecorder
const mockMediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  ondataavailable: null,
  onstop: null,
  onerror: null,
  state: 'inactive'
}));

Object.defineProperty(global, 'MediaRecorder', {
  value: mockMediaRecorder,
  writable: true
});

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
Object.defineProperty(global, 'navigator', {
  value: {
    mediaDevices: {
      getUserMedia: mockGetUserMedia
    }
  },
  writable: true
});

// Mock fetch
global.fetch = vi.fn();

describe('Background Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset global state
    delete (global as any).currentSession;
    delete (global as any).mediaRecorder;
    delete (global as any).recordingStream;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Extension Installation', () => {
    it('should set up context menu on installation', async () => {
      // Import the background script to trigger installation
      await import('../background/index');
      
      // Check if onInstalled listener was added
      expect(mockBrowser.runtime.onInstalled.addListener).toHaveBeenCalled();
      
      // Simulate installation
      const installListener = mockBrowser.runtime.onInstalled.addListener.mock.calls[0][0];
      installListener();
      
      expect(mockBrowser.contextMenus.create).toHaveBeenCalledWith({
        id: 'stepflow-start-recording',
        title: 'Start StepFlow Recording',
        contexts: ['page']
      });
    });
  });

  describe('Message Handling', () => {
    let messageHandler: any;

    beforeEach(async () => {
      await import('../background/index');
      messageHandler = mockBrowser.runtime.onMessage.addListener.mock.calls[0][0];
    });

    it('should handle START_RECORDING message', async () => {
      const mockStream = {
        getTracks: vi.fn(() => [{ stop: vi.fn() }]),
        getVideoTracks: vi.fn(() => [{ onended: null }])
      };

      mockChrome.desktopCapture.chooseDesktopMedia.mockImplementation((sources, callback) => {
        callback('stream-id-123');
      });

      mockGetUserMedia.mockResolvedValue(mockStream);
      mockBrowser.storage.local.get.mockResolvedValue({ userId: 'user-123' });

      const message = { type: 'START_RECORDING' };
      const sender = { tab: { id: 1 } };

      const result = await messageHandler(message, sender);

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(mockChrome.desktopCapture.chooseDesktopMedia).toHaveBeenCalled();
      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    it('should handle STOP_RECORDING message', async () => {
      // First start a recording
      const mockStream = {
        getTracks: vi.fn(() => [{ stop: vi.fn() }]),
        getVideoTracks: vi.fn(() => [{ onended: null }])
      };

      mockChrome.desktopCapture.chooseDesktopMedia.mockImplementation((sources, callback) => {
        callback('stream-id-123');
      });

      mockGetUserMedia.mockResolvedValue(mockStream);
      mockBrowser.storage.local.get.mockResolvedValue({ 
        userId: 'user-123',
        accessToken: 'token-123'
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'recording-123' } })
      });

      // Start recording
      await messageHandler({ type: 'START_RECORDING' }, { tab: { id: 1 } });

      // Stop recording
      const result = await messageHandler({ type: 'STOP_RECORDING' }, {});

      expect(result.success).toBe(true);
      expect(result.recording).toBeDefined();
    });

    it('should handle PAUSE_RECORDING message', async () => {
      // Start recording first
      const mockStream = {
        getTracks: vi.fn(() => [{ stop: vi.fn() }]),
        getVideoTracks: vi.fn(() => [{ onended: null }])
      };

      mockChrome.desktopCapture.chooseDesktopMedia.mockImplementation((sources, callback) => {
        callback('stream-id-123');
      });

      mockGetUserMedia.mockResolvedValue(mockStream);
      mockBrowser.storage.local.get.mockResolvedValue({ userId: 'user-123' });

      await messageHandler({ type: 'START_RECORDING' }, { tab: { id: 1 } });

      // Pause recording
      const result = await messageHandler({ type: 'PAUSE_RECORDING' }, {});

      expect(result.success).toBe(true);
    });

    it('should handle GET_STATUS message', async () => {
      const result = await messageHandler({ type: 'GET_STATUS' }, {});

      expect(result.success).toBe(true);
      expect(result.status).toBeDefined();
      expect(result.status.isRecording).toBe(false);
    });

    it('should handle CAPTURE_STEP message', async () => {
      const stepData = {
        action: 'click',
        element: 'button',
        coordinates: { x: 100, y: 200 }
      };

      mockBrowser.storage.local.get.mockResolvedValue({ accessToken: 'token-123' });
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const result = await messageHandler({ 
        type: 'CAPTURE_STEP', 
        payload: stepData 
      }, {});

      expect(result.success).toBe(true);
    });

    it('should handle unknown message type', async () => {
      const result = await messageHandler({ type: 'UNKNOWN_TYPE' }, {});

      expect(result.error).toBe('Unknown message type');
    });

    it('should handle errors gracefully', async () => {
      mockChrome.desktopCapture.chooseDesktopMedia.mockImplementation((sources, callback) => {
        callback(null); // User cancelled
      });

      const result = await messageHandler({ type: 'START_RECORDING' }, {});

      expect(result.error).toBeDefined();
    });
  });

  describe('Screen Capture', () => {
    it('should request proper permissions for screen capture', async () => {
      const mockStream = {
        getTracks: vi.fn(() => [{ stop: vi.fn() }]),
        getVideoTracks: vi.fn(() => [{ onended: null }])
      };

      mockChrome.desktopCapture.chooseDesktopMedia.mockImplementation((sources, callback) => {
        expect(sources).toEqual(['screen', 'window', 'tab']);
        callback('stream-id-123');
      });

      mockGetUserMedia.mockResolvedValue(mockStream);
      mockBrowser.storage.local.get.mockResolvedValue({ userId: 'user-123' });

      await import('../background/index');
      const messageHandler = mockBrowser.runtime.onMessage.addListener.mock.calls[0][0];

      await messageHandler({ type: 'START_RECORDING' }, { tab: { id: 1 } });

      expect(mockChrome.desktopCapture.chooseDesktopMedia).toHaveBeenCalledWith(
        ['screen', 'window', 'tab'],
        expect.any(Function)
      );
    });

    it('should configure MediaRecorder with proper options', async () => {
      const mockStream = {
        getTracks: vi.fn(() => [{ stop: vi.fn() }]),
        getVideoTracks: vi.fn(() => [{ onended: null }])
      };

      mockChrome.desktopCapture.chooseDesktopMedia.mockImplementation((sources, callback) => {
        callback('stream-id-123');
      });

      mockGetUserMedia.mockResolvedValue(mockStream);
      mockBrowser.storage.local.get.mockResolvedValue({ userId: 'user-123' });

      await import('../background/index');
      const messageHandler = mockBrowser.runtime.onMessage.addListener.mock.calls[0][0];

      await messageHandler({ type: 'START_RECORDING' }, { tab: { id: 1 } });

      expect(mockMediaRecorder).toHaveBeenCalledWith(
        mockStream,
        { mimeType: 'video/webm;codecs=vp9' }
      );
    });
  });

  describe('Badge Management', () => {
    it('should update badge when recording starts', async () => {
      const mockStream = {
        getTracks: vi.fn(() => [{ stop: vi.fn() }]),
        getVideoTracks: vi.fn(() => [{ onended: null }])
      };

      mockChrome.desktopCapture.chooseDesktopMedia.mockImplementation((sources, callback) => {
        callback('stream-id-123');
      });

      mockGetUserMedia.mockResolvedValue(mockStream);
      mockBrowser.storage.local.get.mockResolvedValue({ userId: 'user-123' });

      await import('../background/index');
      const messageHandler = mockBrowser.runtime.onMessage.addListener.mock.calls[0][0];

      await messageHandler({ type: 'START_RECORDING' }, { tab: { id: 1 } });

      expect(mockBrowser.action.setBadgeText).toHaveBeenCalledWith({ text: 'REC' });
      expect(mockBrowser.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#ef4444' });
    });

    it('should clear badge when recording stops', async () => {
      // Setup and start recording first
      const mockStream = {
        getTracks: vi.fn(() => [{ stop: vi.fn() }]),
        getVideoTracks: vi.fn(() => [{ onended: null }])
      };

      mockChrome.desktopCapture.chooseDesktopMedia.mockImplementation((sources, callback) => {
        callback('stream-id-123');
      });

      mockGetUserMedia.mockResolvedValue(mockStream);
      mockBrowser.storage.local.get.mockResolvedValue({ 
        userId: 'user-123',
        accessToken: 'token-123'
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'recording-123' } })
      });

      mockBrowser.tabs.query.mockResolvedValue([]);

      await import('../background/index');
      const messageHandler = mockBrowser.runtime.onMessage.addListener.mock.calls[0][0];

      await messageHandler({ type: 'START_RECORDING' }, { tab: { id: 1 } });
      await messageHandler({ type: 'STOP_RECORDING' }, {});

      expect(mockBrowser.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });
  });
});