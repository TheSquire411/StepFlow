import { apiClient } from './api.service';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalGuides: number;
  totalRecordings: number;
  storageUsed: number;
  systemUptime: number;
  pendingTickets: number;
  flaggedContent: number;
}

interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  category: 'general' | 'security' | 'performance' | 'features' | 'limits';
  type: 'string' | 'number' | 'boolean' | 'json';
  isEditable: boolean;
  updatedAt: string;
  updatedBy: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  planType: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'banned';
  createdAt: string;
  lastLoginAt?: string;
  guidesCount: number;
  storageUsed: number;
}

interface UserFilters {
  search?: string;
  planType?: string;
  status?: string;
  page?: number;
  limit?: number;
}

class AdminService {
  // System Statistics
  async getSystemStats(): Promise<SystemStats> {
    const response = await apiClient.get('/admin/stats');
    return response.data.data;
  }

  // System Configuration
  async getSystemConfig(): Promise<SystemConfig[]> {
    const response = await apiClient.get('/admin/config');
    return response.data.data;
  }

  async updateSystemConfig(key: string, value: string): Promise<SystemConfig> {
    const response = await apiClient.patch(`/admin/config/${key}`, { value });
    return response.data.data;
  }

  async bulkUpdateSystemConfig(configs: Array<{ key: string; value: string }>): Promise<SystemConfig[]> {
    const response = await apiClient.patch('/admin/config/bulk', { configs });
    return response.data.data;
  }

  // User Management
  async getUsers(filters?: UserFilters): Promise<User[]> {
    const response = await apiClient.get('/admin/users', { params: filters });
    return response.data.data;
  }

  async updateUserStatus(userId: string, status: 'suspend' | 'activate' | 'ban'): Promise<User> {
    const response = await apiClient.patch(`/admin/users/${userId}/status`, { status });
    return response.data.data;
  }

  async bulkUpdateUsers(userIds: string[], action: 'suspend' | 'activate' | 'ban'): Promise<void> {
    await apiClient.patch('/admin/users/bulk', { userIds, action });
  }

  // System Health
  async getSystemHealth(): Promise<any> {
    const response = await apiClient.get('/admin/health');
    return response.data.data;
  }

  // Content Moderation
  async getFlaggedContent(filters?: { status?: string; type?: string }): Promise<any[]> {
    const response = await apiClient.get('/admin/content/flagged', { params: filters });
    return response.data.data;
  }

  async moderateContent(contentId: string, action: 'approve' | 'reject' | 'remove'): Promise<void> {
    await apiClient.patch(`/admin/content/${contentId}/moderate`, { action });
  }

  async bulkModerateContent(contentIds: string[], action: 'approve' | 'reject' | 'remove'): Promise<void> {
    await apiClient.patch('/admin/content/bulk-moderate', { contentIds, action });
  }

  // Support Tickets
  async getSupportTickets(filters?: { status?: string; priority?: string }): Promise<any[]> {
    const response = await apiClient.get('/admin/tickets', { params: filters });
    return response.data.data;
  }

  async updateTicketStatus(ticketId: string, action: string, assignee?: string): Promise<void> {
    await apiClient.patch(`/admin/tickets/${ticketId}`, { action, assignee });
  }

  async respondToTicket(ticketId: string, message: string): Promise<void> {
    await apiClient.post(`/admin/tickets/${ticketId}/respond`, { message });
  }
}

export const adminService = new AdminService();