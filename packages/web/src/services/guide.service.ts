import { apiClient } from './api.service';
import { Guide, GuideFilters } from '../types/guide.types';

export interface GuideListResponse {
  guides: Guide[];
  total: number;
  page: number;
  limit: number;
}

export interface BulkActionRequest {
  guideIds: string[];
  action: 'delete' | 'archive' | 'publish' | 'duplicate';
}

export class GuideService {
  /**
   * Get all guides for the current user with filtering and pagination
   */
  async getGuides(filters: Partial<GuideFilters> = {}): Promise<GuideListResponse> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const response = await apiClient.get<{ data: GuideListResponse }>(`/guides?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Get a single guide by ID
   */
  async getGuide(guideId: string): Promise<Guide> {
    const response = await apiClient.get<{ data: Guide }>(`/guides/${guideId}`);
    return response.data.data;
  }

  /**
   * Create a new guide
   */
  async createGuide(data: {
    recordingId: string;
    title: string;
    description?: string;
    category?: string;
    tags?: string[];
  }): Promise<Guide> {
    const response = await apiClient.post<{ data: Guide }>('/guides', data);
    return response.data.data;
  }

  /**
   * Update an existing guide
   */
  async updateGuide(guideId: string, data: Partial<Guide>): Promise<Guide> {
    const response = await apiClient.patch<{ data: Guide }>(`/guides/${guideId}`, data);
    return response.data.data;
  }

  /**
   * Delete a guide
   */
  async deleteGuide(guideId: string): Promise<void> {
    await apiClient.delete(`/guides/${guideId}`);
  }

  /**
   * Duplicate a guide
   */
  async duplicateGuide(guideId: string): Promise<Guide> {
    const response = await apiClient.post<{ data: Guide }>(`/guides/${guideId}/duplicate`);
    return response.data.data;
  }

  /**
   * Perform bulk actions on multiple guides
   */
  async bulkAction(request: BulkActionRequest): Promise<void> {
    await apiClient.post('/guides/bulk', request);
  }

  /**
   * Get guide analytics
   */
  async getGuideAnalytics(guideId: string): Promise<any> {
    const response = await apiClient.get<{ data: any }>(`/guides/${guideId}/analytics`);
    return response.data.data;
  }

  /**
   * Search guides with full-text search
   */
  async searchGuides(query: string, filters: Partial<GuideFilters> = {}): Promise<GuideListResponse> {
    return this.getGuides({ ...filters, search: query });
  }

  /**
   * Get available categories
   */
  async getCategories(): Promise<string[]> {
    const response = await apiClient.get<{ data: string[] }>('/guides/categories');
    return response.data.data;
  }

  /**
   * Get available tags
   */
  async getTags(): Promise<string[]> {
    const response = await apiClient.get<{ data: string[] }>('/guides/tags');
    return response.data.data;
  }
}

export const guideService = new GuideService();