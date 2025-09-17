// Shared types for the browser extension

export interface RecordingSession {
  id: string;
  userId: string;
  title: string;
  status: 'active' | 'paused' | 'stopped';
  startedAt: Date;
  chunks: Blob[];
}

export interface CapturedStep {
  action: 'click' | 'type' | 'navigate' | 'scroll' | 'hover' | 'focus' | 'submit';
  element?: string;
  coordinates?: { x: number; y: number };
  text?: string;
  url?: string;
  timestamp: number;
  screenshot?: string;
}

export interface ExtensionMessage {
  type: 'START_RECORDING' | 'STOP_RECORDING' | 'PAUSE_RECORDING' | 'UPLOAD_CHUNK' | 'GET_STATUS' | 'CAPTURE_STEP' | 'START_STEP_CAPTURE' | 'STOP_STEP_CAPTURE' | 'GET_CAPTURE_STATUS';
  payload?: any;
}

export interface ExtensionResponse {
  success: boolean;
  error?: string;
  data?: any;
  session?: RecordingSession;
  recording?: any;
  status?: {
    isRecording: boolean;
    session?: RecordingSession;
  };
}

export interface UserAuth {
  isAuthenticated: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  accessToken?: string;
}

export interface StepCaptureState {
  isCapturing: boolean;
  sessionId: string | null;
  lastAction: CapturedStep | null;
  actionQueue: CapturedStep[];
}