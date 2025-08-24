/**
 * FlickMV API Service
 * Handles all API communication with the backend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Types
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'light' | 'standard' | 'pro';
  subscription: any;
  usage: any;
  preferences: any;
  createdAt: string;
  lastLoginAt: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  settings: any;
  timeline: any;
  mediaLibrary: any[];
  createdAt: string;
  updatedAt: string;
}

interface ExportJob {
  id: string;
  projectId: string;
  name: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  output?: {
    url?: string;
    filename?: string;
    size?: number;
    duration?: number;
    watermark?: {
      applied: boolean;
      preset: string;
    };
  };
  error?: any;
  createdAt: string;
  updatedAt: string;
}

interface WatermarkSettings {
  enabled: boolean;
  preset: 'minimal' | 'branded' | 'corner' | 'center';
}

class APIService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('authToken');
  }

  // Helper methods
  private getHeaders(includeAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    includeAuth: boolean = true
  ): Promise<APIResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const config: RequestInit = {
        ...options,
        headers: {
          ...this.getHeaders(includeAuth),
          ...options.headers,
        },
      };

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Auth methods
  async login(credentials: LoginRequest): Promise<APIResponse<{ user: User; token: string }>> {
    const response = await this.request<{ user: User; token: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      },
      false // Don't include auth for login
    );

    if (response.success && response.data?.token) {
      this.token = response.data.token;
      localStorage.setItem('authToken', this.token);
    }

    return response;
  }

  async register(userData: RegisterRequest): Promise<APIResponse<{ user: User; token: string }>> {
    const response = await this.request<{ user: User; token: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(userData),
      },
      false // Don't include auth for register
    );

    if (response.success && response.data?.token) {
      this.token = response.data.token;
      localStorage.setItem('authToken', this.token);
    }

    return response;
  }

  async logout(): Promise<APIResponse> {
    try {
      const response = await this.request('/auth/logout', { method: 'POST' });
      
      // Clear local token regardless of API response
      this.token = null;
      localStorage.removeItem('authToken');
      
      return response;
    } catch (error) {
      // Clear local token even if API call fails
      this.token = null;
      localStorage.removeItem('authToken');
      throw error;
    }
  }

  async getCurrentUser(): Promise<APIResponse<User>> {
    return this.request<User>('/auth/me');
  }

  async refreshToken(): Promise<APIResponse<{ token: string }>> {
    const response = await this.request<{ token: string }>('/auth/refresh', {
      method: 'POST',
    });

    if (response.success && response.data?.token) {
      this.token = response.data.token;
      localStorage.setItem('authToken', this.token);
    }

    return response;
  }

  // User methods
  async updateUser(updates: Partial<User>): Promise<APIResponse<User>> {
    return this.request<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<APIResponse> {
    return this.request('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async deleteAccount(): Promise<APIResponse> {
    return this.request('/users/me', { method: 'DELETE' });
  }

  async getUserStats(): Promise<APIResponse<any>> {
    return this.request('/users/me/stats');
  }

  // Project methods
  async getProjects(params?: { page?: number; limit?: number; search?: string }): Promise<APIResponse<{ projects: Project[]; total: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return this.request<{ projects: Project[]; total: number }>(
      `/projects${query ? `?${query}` : ''}`
    );
  }

  async getProject(id: string): Promise<APIResponse<Project>> {
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(projectData: Partial<Project>): Promise<APIResponse<Project>> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<APIResponse<Project>> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteProject(id: string): Promise<APIResponse> {
    return this.request(`/projects/${id}`, { method: 'DELETE' });
  }

  async duplicateProject(id: string): Promise<APIResponse<Project>> {
    return this.request<Project>(`/projects/${id}/duplicate`, { method: 'POST' });
  }

  // Media methods
  async uploadMedia(projectId: string, file: File, onProgress?: (progress: number) => void): Promise<APIResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);

    // For file uploads, we don't use JSON content type
    const headers: HeadersInit = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(response);
          } else {
            reject(new Error(response.message || 'Upload failed'));
          }
        } catch (error) {
          reject(new Error('Invalid response format'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${this.baseURL}/media/upload`);
      
      // Set headers
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.send(formData);
    });
  }

  async deleteMedia(mediaId: string): Promise<APIResponse> {
    return this.request(`/media/${mediaId}`, { method: 'DELETE' });
  }

  // Export methods
  async createExport(projectId: string, settings: any): Promise<APIResponse<ExportJob>> {
    return this.request<ExportJob>('/export', {
      method: 'POST',
      body: JSON.stringify({ projectId, settings }),
    });
  }

  async getExportJob(jobId: string): Promise<APIResponse<ExportJob>> {
    return this.request<ExportJob>(`/export/jobs/${jobId}`);
  }

  async getExportJobs(params?: { page?: number; limit?: number }): Promise<APIResponse<{ jobs: ExportJob[]; total: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.request<{ jobs: ExportJob[]; total: number }>(
      `/export/jobs${query ? `?${query}` : ''}`
    );
  }

  async cancelExport(jobId: string): Promise<APIResponse> {
    return this.request(`/export/jobs/${jobId}/cancel`, { method: 'POST' });
  }

  async downloadExport(jobId: string): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/export/jobs/${jobId}/download`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    return response.blob();
  }

  // Watermark methods
  async getWatermarkSettings(projectId: string): Promise<APIResponse<WatermarkSettings>> {
    return this.request<WatermarkSettings>(`/projects/${projectId}/watermark`);
  }

  async updateWatermarkSettings(projectId: string, settings: WatermarkSettings): Promise<APIResponse<WatermarkSettings>> {
    return this.request<WatermarkSettings>(`/projects/${projectId}/watermark`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  // Subscription and billing methods
  async getSubscription(): Promise<APIResponse<any>> {
    return this.request('/subscription');
  }

  async upgradePlan(planId: string, paymentMethodId?: string): Promise<APIResponse<any>> {
    return this.request('/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify({ planId, paymentMethodId }),
    });
  }

  async cancelSubscription(): Promise<APIResponse> {
    return this.request('/subscription/cancel', { method: 'POST' });
  }

  async getInvoices(): Promise<APIResponse<any[]>> {
    return this.request('/subscription/invoices');
  }

  async createCheckoutSession(planId: string): Promise<APIResponse<{ url: string }>> {
    return this.request<{ url: string }>('/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });
  }

  // Audio Analysis methods
  async analyzeAudio(mediaId: string, options?: {
    genre?: string;
    mood?: string;
    style?: string;
  }): Promise<APIResponse<any>> {
    return this.request(`/media/file/${mediaId}/audio-analyze`, {
      method: 'POST',
      body: JSON.stringify({ options })
    });
  }

  async getAudioAnalysis(mediaId: string): Promise<APIResponse<any>> {
    return this.request(`/media/file/${mediaId}/audio-analysis`);
  }

  async regeneratePrompts(mediaId: string, options?: {
    genre?: string;
    mood?: string;
    style?: string;
  }): Promise<APIResponse<any>> {
    return this.request(`/media/file/${mediaId}/regenerate-prompts`, {
      method: 'POST',
      body: JSON.stringify({ options })
    });
  }

  async updateScenePrompts(mediaId: string, scenes: any[]): Promise<APIResponse<any>> {
    return this.request(`/media/file/${mediaId}/scene-prompts`, {
      method: 'PUT',
      body: JSON.stringify({ scenes })
    });
  }

  // Notifications methods
  async getNotifications(): Promise<APIResponse<any[]>> {
    return this.request('/notifications');
  }

  async markNotificationAsRead(notificationId: string): Promise<APIResponse> {
    return this.request(`/notifications/${notificationId}/read`, { method: 'POST' });
  }

  async markAllNotificationsAsRead(): Promise<APIResponse> {
    return this.request('/notifications/read-all', { method: 'POST' });
  }

  async deleteNotification(notificationId: string): Promise<APIResponse> {
    return this.request(`/notifications/${notificationId}`, { method: 'DELETE' });
  }

  // Analytics methods
  async getAnalytics(period: string = '30d'): Promise<APIResponse<any>> {
    return this.request(`/analytics?period=${period}`);
  }

  // Template methods
  async getTemplates(category?: string): Promise<APIResponse<any[]>> {
    const query = category ? `?category=${category}` : '';
    return this.request(`/templates${query}`);
  }

  async useTemplate(templateId: string, projectName: string): Promise<APIResponse<Project>> {
    return this.request<Project>('/templates/use', {
      method: 'POST',
      body: JSON.stringify({ templateId, projectName }),
    });
  }

  // Health check
  async healthCheck(): Promise<APIResponse> {
    return this.request('/health', {}, false);
  }
}

// Create singleton instance
const apiService = new APIService();

export default apiService;
export { APIService };
export type { APIResponse, User, Project, ExportJob, WatermarkSettings };