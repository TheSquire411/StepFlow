// Utility functions for the browser extension

/**
 * Get the API URL based on environment
 */
export function getApiUrl(): string {
  return process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3001' 
    : 'https://api.stepflow.com';
}

/**
 * Get the web app URL based on environment
 */
export function getWebAppUrl(): string {
  return process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : 'https://app.stepflow.com';
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Get a unique CSS selector for an element
 */
export function getElementSelector(element: Element): string {
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
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Check if an element is interactive
 */
export function isInteractiveElement(element: Element): boolean {
  const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
  const interactiveRoles = ['button', 'link', 'menuitem', 'tab'];
  
  return (
    interactiveTags.includes(element.tagName) ||
    interactiveRoles.includes(element.getAttribute('role') || '') ||
    element.hasAttribute('onclick') ||
    element.classList.contains('clickable') ||
    element.classList.contains('btn')
  );
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

/**
 * Format duration in seconds to readable format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get domain from URL
 */
export function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Storage helpers
 */
export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get([key]);
      return result[key] || null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove([key]);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }
};

/**
 * API helpers
 */
export const api = {
  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await storage.get<string>('accessToken');
    
    const response = await fetch(`${getApiUrl()}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  },

  async uploadFile(endpoint: string, file: Blob, additionalData: Record<string, string> = {}): Promise<any> {
    const token = await storage.get<string>('accessToken');
    const formData = new FormData();
    
    formData.append('file', file);
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const response = await fetch(`${getApiUrl()}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.statusText}`);
    }

    return response.json();
  }
};