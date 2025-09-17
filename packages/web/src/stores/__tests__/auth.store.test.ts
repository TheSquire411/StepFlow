import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../auth.store';

// Mock fetch
global.fetch = vi.fn();

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
    
    // Reset fetch mock
    vi.resetAllMocks();
  });

  it('should have initial state', () => {
    const state = useAuthStore.getState();
    
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it('should set user and token on successful login', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      planType: 'free' as const,
    };

    const mockResponse = {
      user: mockUser,
      token: 'mock-token',
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { login } = useAuthStore.getState();
    await login('test@example.com', 'password');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe('mock-token');
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('should clear auth state on logout', () => {
    // Set some initial state
    useAuthStore.setState({
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        planType: 'free',
      },
      token: 'mock-token',
      isAuthenticated: true,
    });

    const { logout } = useAuthStore.getState();
    logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should handle login failure', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const { login } = useAuthStore.getState();
    
    await expect(login('test@example.com', 'wrong-password')).rejects.toThrow('Login failed');
    
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });
});