import browser from 'webextension-polyfill';

// Types for extension messaging
interface RecordingSession {
  id: string;
  userId: string;
  title: string;
  status: 'active' | 'paused' | 'stopped';
  startedAt: Date;
  chunks: Blob[];
}

interface ExtensionMessage {
  type: 'START_RECORDING' | 'STOP_RECORDING' | 'PAUSE_RECORDING' | 'UPLOAD_CHUNK' | 'GET_STATUS' | 'CAPTURE_STEP';
  payload?: any;
}

// Extension state
let currentSession: RecordingSession | null = null;
let mediaRecorder: MediaRecorder | null = null;
let recordingStream: MediaStream | null = null;

console.log('StepFlow background script loaded');

// Handle extension installation
browser.runtime.onInstalled.addListener(() => {
  console.log('StepFlow extension installed');
  
  // Set up context menu for recording
  browser.contextMenus.create({
    id: 'stepflow-start-recording',
    title: 'Start StepFlow Recording',
    contexts: ['page']
  });
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'stepflow-start-recording' && tab?.id) {
    startRecording(tab.id);
  }
});

// Handle messages from content script and popup
browser.runtime.onMessage.addListener(async (message: ExtensionMessage, sender) => {
  console.log('Background received message:', message);
  
  try {
    switch (message.type) {
      case 'START_RECORDING':
        const result = await startRecording(sender.tab?.id);
        return { success: true, session: result };
        
      case 'STOP_RECORDING':
        const recording = await stopRecording();
        return { success: true, recording };
        
      case 'PAUSE_RECORDING':
        pauseRecording();
        return { success: true };
        
      case 'GET_STATUS':
        return { 
          success: true, 
          status: {
            isRecording: currentSession?.status === 'active',
            session: currentSession
          }
        };
        
      case 'CAPTURE_STEP':
        await captureStep(message.payload);
        return { success: true };
        
      case 'CAPTURE_SCREENSHOT':
        const screenshot = await captureScreenshot();
        return { success: true, screenshot };
        
      default:
        return { error: 'Unknown message type' };
    }
  } catch (error: any) {
    console.error('Background script error:', error);
    return { error: error.message };
  }
});

/**
 * Start screen recording
 */
async function startRecording(tabId?: number): Promise<RecordingSession> {
  if (currentSession?.status === 'active') {
    throw new Error('Recording already in progress');
  }

  try {
    // Request screen capture permission
    const streamId = await new Promise<string>((resolve, reject) => {
      (chrome as any).desktopCapture.chooseDesktopMedia(['screen', 'window', 'tab'], (streamId: string) => {
        if (streamId) {
          resolve(streamId);
        } else {
          reject(new Error('User cancelled screen capture'));
        }
      });
    });

    // Get media stream
    recordingStream = await navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId
        }
      } as any,
      audio: true
    });

    // Create recording session
    const sessionId = generateSessionId();
    currentSession = {
      id: sessionId,
      userId: await getCurrentUserId(),
      title: `Recording ${new Date().toLocaleString()}`,
      status: 'active',
      startedAt: new Date(),
      chunks: []
    };

    // Set up MediaRecorder
    mediaRecorder = new MediaRecorder(recordingStream, {
      mimeType: 'video/webm;codecs=vp9'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && currentSession) {
        currentSession.chunks.push(event.data);
        
        // Upload chunk to server
        uploadChunk(event.data, currentSession.chunks.length - 1);
      }
    };

    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
      stopRecording();
    };

    // Start recording with 5-second chunks
    mediaRecorder.start(5000);

    // Notify content script to start step capture
    if (tabId) {
      browser.tabs.sendMessage(tabId, {
        type: 'START_STEP_CAPTURE',
        payload: { sessionId: currentSession.id }
      });
    }

    // Update extension badge
    browser.action.setBadgeText({ text: 'REC' });
    browser.action.setBadgeBackgroundColor({ color: '#ef4444' });

    console.log('Recording started:', currentSession);
    return currentSession;

  } catch (error) {
    console.error('Failed to start recording:', error);
    throw error;
  }
}

/**
 * Stop screen recording
 */
async function stopRecording(): Promise<any> {
  if (!currentSession || !mediaRecorder) {
    throw new Error('No active recording session');
  }

  try {
    // Stop media recorder
    mediaRecorder.stop();
    
    // Stop media stream
    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
      recordingStream = null;
    }

    // Update session status
    currentSession.status = 'stopped';

    // Complete recording on server
    const recording = await completeRecording(currentSession);

    // Clean up
    mediaRecorder = null;
    const completedSession = currentSession;
    currentSession = null;

    // Update extension badge
    browser.action.setBadgeText({ text: '' });

    // Notify all tabs that recording stopped
    const tabs = await browser.tabs.query({});
    tabs.forEach(tab => {
      if (tab.id) {
        browser.tabs.sendMessage(tab.id, {
          type: 'STOP_STEP_CAPTURE'
        }).catch(() => {
          // Ignore errors for tabs that don't have content script
        });
      }
    });

    console.log('Recording stopped:', completedSession);
    return recording;

  } catch (error) {
    console.error('Failed to stop recording:', error);
    throw error;
  }
}

/**
 * Pause recording
 */
function pauseRecording(): void {
  if (currentSession && mediaRecorder && currentSession.status === 'active') {
    mediaRecorder.pause();
    currentSession.status = 'paused';
    
    browser.action.setBadgeText({ text: 'PAUSE' });
    browser.action.setBadgeBackgroundColor({ color: '#f59e0b' });
    
    console.log('Recording paused');
  }
}

/**
 * Resume recording
 */
function resumeRecording(): void {
  if (currentSession && mediaRecorder && currentSession.status === 'paused') {
    mediaRecorder.resume();
    currentSession.status = 'active';
    
    browser.action.setBadgeText({ text: 'REC' });
    browser.action.setBadgeBackgroundColor({ color: '#ef4444' });
    
    console.log('Recording resumed');
  }
}

// Export for potential future use
export { resumeRecording };

/**
 * Capture a step during recording
 */
async function captureStep(stepData: any): Promise<void> {
  if (!currentSession) {
    return;
  }

  try {
    // Send step data to server
    const response = await fetch(`${getApiUrl()}/api/v1/recordings/sessions/${currentSession.id}/steps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAccessToken()}`
      },
      body: JSON.stringify({
        timestamp: Date.now() - currentSession.startedAt.getTime(),
        action: stepData.action,
        element: stepData.element,
        coordinates: stepData.coordinates,
        text: stepData.text,
        screenshot: stepData.screenshot
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to capture step: ${response.statusText}`);
    }

    console.log('Step captured:', stepData);
  } catch (error) {
    console.error('Failed to capture step:', error);
  }
}

/**
 * Upload recording chunk to server
 */
async function uploadChunk(chunk: Blob, chunkIndex: number): Promise<void> {
  if (!currentSession) {
    return;
  }

  try {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', currentSession.chunks.length.toString());

    const response = await fetch(`${getApiUrl()}/api/v1/recordings/sessions/${currentSession.id}/chunks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload chunk: ${response.statusText}`);
    }

    console.log(`Chunk ${chunkIndex} uploaded successfully`);
  } catch (error) {
    console.error('Failed to upload chunk:', error);
  }
}

/**
 * Complete recording on server
 */
async function completeRecording(session: RecordingSession): Promise<any> {
  try {
    const response = await fetch(`${getApiUrl()}/api/v1/recordings/sessions/${session.id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAccessToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to complete recording: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to complete recording:', error);
    throw error;
  }
}

/**
 * Utility functions
 */
function generateSessionId(): string {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function getCurrentUserId(): Promise<string> {
  const result = await browser.storage.local.get(['userId']);
  return result.userId || 'anonymous';
}

async function getAccessToken(): Promise<string> {
  const result = await browser.storage.local.get(['accessToken']);
  return result.accessToken || '';
}

function getApiUrl(): string {
  return process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3001' 
    : 'https://api.stepflow.com';
}

// Handle tab updates to inject content script
browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    // Content script should already be injected via manifest
    // This is just for any additional setup if needed
  }
});

/**
 * Capture screenshot using screen capture API
 */
async function captureScreenshot(): Promise<string> {
  try {
    // Use the existing recording stream if available
    if (recordingStream) {
      const video = document.createElement('video');
      video.srcObject = recordingStream;
      video.play();
      
      return new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          ctx.drawImage(video, 0, 0);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        
        video.onerror = () => reject(new Error('Video load error'));
      });
    } else {
      // Request temporary screen capture for screenshot
      const streamId = await new Promise<string>((resolve, reject) => {
        (chrome as any).desktopCapture.chooseDesktopMedia(['screen'], (streamId: string) => {
          if (streamId) {
            resolve(streamId);
          } else {
            reject(new Error('User cancelled screen capture'));
          }
        });
      });

      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId,
            maxWidth: 1920,
            maxHeight: 1080
          }
        } as any
      });

      const video = document.createElement('video');
      video.srcObject = tempStream;
      video.play();

      return new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            tempStream.getTracks().forEach(track => track.stop());
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          ctx.drawImage(video, 0, 0);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          // Clean up temporary stream
          tempStream.getTracks().forEach(track => track.stop());
          
          resolve(dataUrl);
        };
        
        video.onerror = () => {
          tempStream.getTracks().forEach(track => track.stop());
          reject(new Error('Video load error'));
        };
      });
    }
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    throw error;
  }
}

// Clean up on extension unload
browser.runtime.onSuspend.addListener(() => {
  if (currentSession) {
    stopRecording().catch(console.error);
  }
});