import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '../stores/auth.store';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: this.getApiBaseUrl(),
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh token
            const refreshToken = useAuthStore.getState().refreshToken;
            if (refreshToken) {
              const response = await this.client.post('/auth/refresh', {
                refreshToken,
              });

              const { accessToken, refreshToken: newRefreshToken } = response.data.data;
              
              // Update auth store
              useAuthStore.getState().setTokens(accessToken, newRefreshToken);

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            useAuthStore.getState().logout();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private getApiBaseUrl(): string {
    if (typeof window !== 'undefined') {
      // Client-side
      return process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001/api/v1'
        : 'https://api.stepflow.com/api/v1';
    }
    // Server-side (if using SSR)
    return process.env.API_BASE_URL || 'http://localhost:3001/api/v1';
  }

  // HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  // Upload file with progress
  async uploadFile<T = any>(
    url: string,
    file: File | Blob,
    onUploadProgress?: (progressEvent: any) => void,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.client.post<T>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  }

  // Get axios instance for advanced usage
  getClient(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new ApiService();