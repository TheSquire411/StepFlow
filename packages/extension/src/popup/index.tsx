import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import browser from 'webextension-polyfill';

// Types
interface RecordingStatus {
  isRecording: boolean;
  session?: {
    id: string;
    title: string;
    status: 'active' | 'paused' | 'stopped';
    startedAt: Date;
  };
}

interface UserAuth {
  isAuthenticated: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

function Popup() {
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({ isRecording: false });
  const [userAuth, setUserAuth] = useState<UserAuth>({ isAuthenticated: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial state
  useEffect(() => {
    loadInitialState();
  }, []);

  const loadInitialState = async () => {
    try {
      setLoading(true);
      
      // Check recording status
      const statusResponse = await browser.runtime.sendMessage({ type: 'GET_STATUS' });
      if (statusResponse.success) {
        setRecordingStatus(statusResponse.status);
      }
      
      // Check authentication
      const authData = await browser.storage.local.get(['accessToken', 'user']);
      if (authData.accessToken && authData.user) {
        setUserAuth({
          isAuthenticated: true,
          user: authData.user
        });
      }
      
    } catch (err) {
      setError('Failed to load extension state');
      console.error('Failed to load initial state:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      setError(null);
      const response = await browser.runtime.sendMessage({ type: 'START_RECORDING' });
      
      if (response.success) {
        setRecordingStatus({
          isRecording: true,
          session: response.session
        });
      } else {
        setError(response.error || 'Failed to start recording');
      }
    } catch (err) {
      setError('Failed to start recording');
      console.error('Start recording error:', err);
    }
  };

  const handleStopRecording = async () => {
    try {
      setError(null);
      const response = await browser.runtime.sendMessage({ type: 'STOP_RECORDING' });
      
      if (response.success) {
        setRecordingStatus({ isRecording: false });
        
        // Open the web app to view the recording
        browser.tabs.create({
          url: getWebAppUrl() + '/dashboard'
        });
      } else {
        setError(response.error || 'Failed to stop recording');
      }
    } catch (err) {
      setError('Failed to stop recording');
      console.error('Stop recording error:', err);
    }
  };

  const handlePauseRecording = async () => {
    try {
      setError(null);
      const response = await browser.runtime.sendMessage({ type: 'PAUSE_RECORDING' });
      
      if (response.success) {
        setRecordingStatus(prev => ({
          ...prev,
          session: prev.session ? { ...prev.session, status: 'paused' } : undefined
        }));
      } else {
        setError(response.error || 'Failed to pause recording');
      }
    } catch (err) {
      setError('Failed to pause recording');
      console.error('Pause recording error:', err);
    }
  };

  const handleLogin = () => {
    browser.tabs.create({
      url: getWebAppUrl() + '/login'
    });
    window.close();
  };

  const handleOpenDashboard = () => {
    browser.tabs.create({
      url: getWebAppUrl() + '/dashboard'
    });
    window.close();
  };

  const getWebAppUrl = () => {
    return process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : 'https://app.stepflow.com';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!userAuth.isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <img src="/icons/icon32.png" alt="StepFlow" style={styles.logo} />
          <h1 style={styles.title}>StepFlow</h1>
        </div>
        
        <div style={styles.content}>
          <p style={styles.description}>
            Sign in to start recording workflows and creating AI-powered documentation.
          </p>
          
          <button
            style={styles.primaryButton}
            onClick={handleLogin}
          >
            Sign In
          </button>
          
          <p style={styles.helpText}>
            Don't have an account? Sign up on our website.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <img src="/icons/icon32.png" alt="StepFlow" style={styles.logo} />
        <div>
          <h1 style={styles.title}>StepFlow</h1>
          <p style={styles.userInfo}>Welcome, {userAuth.user?.name || userAuth.user?.email}</p>
        </div>
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.content}>
        {recordingStatus.isRecording ? (
          <div style={styles.recordingActive}>
            <div style={styles.recordingIndicator}>
              <div style={styles.recordingDot}></div>
              <span>Recording in progress</span>
            </div>
            
            {recordingStatus.session && (
              <div style={styles.sessionInfo}>
                <p style={styles.sessionTitle}>{recordingStatus.session.title}</p>
                <p style={styles.sessionStatus}>
                  Status: {recordingStatus.session.status}
                </p>
              </div>
            )}
            
            <div style={styles.buttonGroup}>
              {recordingStatus.session?.status === 'active' ? (
                <button
                  style={styles.secondaryButton}
                  onClick={handlePauseRecording}
                >
                  Pause
                </button>
              ) : (
                <button
                  style={styles.secondaryButton}
                  onClick={handleStartRecording}
                >
                  Resume
                </button>
              )}
              
              <button
                style={styles.dangerButton}
                onClick={handleStopRecording}
              >
                Stop Recording
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.recordingInactive}>
            <p style={styles.description}>
              Start recording your workflow to create step-by-step documentation automatically.
            </p>
            
            <button
              style={styles.primaryButton}
              onClick={handleStartRecording}
            >
              Start Recording
            </button>
            
            <div style={styles.features}>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>🎥</span>
                <span>Screen & interaction capture</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>🤖</span>
                <span>AI-generated documentation</span>
              </div>
              <div style={styles.feature}>
                <span style={styles.featureIcon}>📝</span>
                <span>Step-by-step guides</span>
              </div>
            </div>
          </div>
        )}
        
        <div style={styles.actions}>
          <button
            style={styles.linkButton}
            onClick={handleOpenDashboard}
          >
            View Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    width: '350px',
    minHeight: '400px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px 20px 16px',
    borderBottom: '1px solid #e5e7eb',
  },
  
  logo: {
    width: '32px',
    height: '32px',
  },
  
  title: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0',
    color: '#1f2937',
  },
  
  userInfo: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '2px 0 0',
  },
  
  content: {
    padding: '20px',
  },
  
  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: '12px',
  },
  
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid #e5e7eb',
    borderTop: '2px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  
  description: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
    marginBottom: '20px',
  },
  
  primaryButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  
  secondaryButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  
  dangerButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '14px',
    margin: '0 20px 16px',
    border: '1px solid #fecaca',
  },
  
  recordingActive: {
    textAlign: 'center' as const,
  },
  
  recordingIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
  },
  
  recordingDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#ef4444',
    borderRadius: '50%',
    animation: 'pulse 1.5s infinite',
  },
  
  sessionInfo: {
    marginBottom: '20px',
    textAlign: 'left' as const,
  },
  
  sessionTitle: {
    fontSize: '14px',
    fontWeight: '500',
    margin: '0 0 4px',
  },
  
  sessionStatus: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0',
  },
  
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
  },
  
  recordingInactive: {
    textAlign: 'center' as const,
  },
  
  features: {
    marginTop: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#6b7280',
  },
  
  featureIcon: {
    fontSize: '16px',
  },
  
  actions: {
    marginTop: '20px',
    textAlign: 'center' as const,
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  
  helpText: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '12px',
    textAlign: 'center' as const,
  },
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;
document.head.appendChild(styleSheet);

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Popup />);