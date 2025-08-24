import { API_BASE_URL, STORAGE_KEYS } from './constants';
import type { APIResponse } from '@/types';

class ApiError extends Error {
  status?: number;
  code?: string;
  body?: any;

  constructor(message: string, status?: number, code?: string, body?: any) {
    super(message);
    this.name = 'ApiError';
    if (status !== undefined) this.status = status;
    if (code !== undefined) this.code = code;
    if (body !== undefined) this.body = body;
  }
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  private async parseJsonSafe(res: Response) {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        return await res.json();
      } catch {
        return null;
      }
    }
    return null;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const json = await this.parseJsonSafe(response);

    // Non-2xx: throw enriched ApiError
    if (!response.ok) {
      const message =
        (json && (json.message || json.error)) ||
        `HTTP ${response.status}: ${response.statusText}`;
      const code = json && (json.code as string | undefined);
      throw new ApiError(message, response.status, code, json);
    }

    // 2xx: support { success, data } contract, else raw JSON
    if (json && typeof json === 'object') {
      if ('success' in json) {
        const success = (json as APIResponse).success;
        if (!success) {
          const message = (json as APIResponse).message || (json as APIResponse).error || 'API request failed';
          const code = (json as any).code as string | undefined;
          throw new ApiError(message, response.status, code, json);
        }
        // Prefer .data if present, else return whole payload
        if ('data' in json) {
          return (json as any).data as T;
        }
      }
      // If no 'success' field, return JSON as-is
      return json as T;
    }

    // No JSON body; return void as any
    return undefined as unknown as T;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      ...(data !== undefined ? { body: JSON.stringify(data) as BodyInit } : {})
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      ...(data !== undefined ? { body: JSON.stringify(data) as BodyInit } : {})
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<T>(response);
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData
    });

    return this.handleResponse<T>(response);
  }

  async download(endpoint: string): Promise<Blob> {
    const token = localStorage.getItem(STORAGE_KEYS.authToken);
    const headers: HeadersInit = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const json = await this.parseJsonSafe(response);
      const message =
        (json && (json.message || json.error)) ||
        `Download failed: HTTP ${response.status} ${response.statusText}`;
      const code = json && (json.code as string | undefined);
      throw new ApiError(message, response.status, code, json);
    }

    return response.blob();
  }
}

export const api = new ApiClient();

// Authentication API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),
  
  logout: () =>
    api.post('/auth/logout'),
  
  getProfile: () =>
    api.get('/auth/me'),
  
  updateProfile: (data: any) =>
    api.put('/auth/me', data),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { currentPassword, newPassword }),
  
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    api.post(`/auth/reset-password/${token}`, { password })
};

// Projects API
export const projectsAPI = {
  getAll: (params?: any) =>
    api.get(`/projects${params ? '?' + new URLSearchParams(params) : ''}`),
  
  getById: (id: string) =>
    api.get(`/projects/${id}`),
  
  create: (data: any) =>
    api.post('/projects', data),
  
  update: (id: string, data: any) =>
    api.put(`/projects/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/projects/${id}`),
  
  updateTimeline: (id: string, timeline: any) =>
    api.put(`/projects/${id}/timeline`, { timeline }),
  
  duplicate: (id: string) =>
    api.post(`/projects/${id}/duplicate`),
  
  addCollaborator: (id: string, email: string, role: string) =>
    api.post(`/projects/${id}/collaborators`, { email, role })
};

// Media API
export const mediaAPI = {
  getByProject: (projectId: string, params?: any) =>
    api.get(`/media/${projectId}${params ? '?' + new URLSearchParams(params) : ''}`),
  
  getById: (id: string) =>
    api.get(`/media/file/${id}`),
  
  upload: (projectId: string, files: FileList) => {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    return api.upload(`/media/upload/${projectId}`, formData);
  },
  
  update: (id: string, data: any) =>
    api.put(`/media/file/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/media/file/${id}`),
  
  analyze: (id: string) =>
    api.post(`/media/file/${id}/analyze`),
  
  download: (id: string) =>
    api.download(`/media/file/${id}/download`),
  
  getStorageUsage: () =>
    api.get('/media/storage')
};

// Export API
export const exportAPI = {
  create: (projectId: string, settings: any, name?: string) =>
    api.post(`/export/${projectId}`, { settings, name }),
  
  getJobs: (params?: any) =>
    api.get(`/export/jobs${params ? '?' + new URLSearchParams(params) : ''}`),
  
  getJob: (id: string) =>
    api.get(`/export/jobs/${id}`),
  
  cancel: (id: string) =>
    api.post(`/export/jobs/${id}/cancel`),
  
  retry: (id: string) =>
    api.post(`/export/jobs/${id}/retry`),
  
  delete: (id: string) =>
    api.delete(`/export/jobs/${id}`),
  
  download: (id: string) =>
    api.download(`/export/jobs/${id}/download`),
  
  getPresets: () =>
    api.get('/export/presets'),
  
  getQueueStatus: () =>
    api.get('/export/queue')
};

// Users API
export const usersAPI = {
  getProfile: () =>
    api.get('/users/profile'),
  
  updatePreferences: (preferences: any) =>
    api.put('/users/preferences', preferences),
  
  getActivity: (params?: any) =>
    api.get(`/users/activity${params ? '?' + new URLSearchParams(params) : ''}`),
  
  getUsage: () =>
    api.get('/users/usage'),
  
  deleteData: (password: string) =>
    api.delete('/users/data'),
  
  submitFeedback: (feedback: any) =>
    api.post('/users/feedback', feedback)
};

// Internal/Admin API (optional usage from admin UI)
export const internalAPI = {
  getQueueLength: () => api.get('/internal/queue-length'),
  getQueueStats: () => api.get('/internal/queue-stats')
};

// Error handler for API calls
export const handleApiError = (error: unknown): string => {
  // Enriched ApiError path
  if (error instanceof ApiError) {
    const status = error.status || 0;

    if (status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem(STORAGE_KEYS.authToken);
      window.location.href = '/login';
      return error.message || 'Session expired. Please log in again.';
    }

    if (status === 403) {
      return error.message || 'You do not have permission to perform this action.';
    }

    if (status === 404) {
      return error.message || 'The requested resource was not found.';
    }

    if (status === 429) {
      return error.message || 'Too many requests. Please wait a moment and try again.';
    }

    if (status >= 500) {
      return error.message || 'Server error. Please try again later.';
    }

    // Known API error with custom code
    if (error.code) {
      return `${error.message} (${error.code})`;
    }

    return error.message || 'An unexpected error occurred.';
  }

  // Network/unknown error fallback
  const msg = (error as Error)?.message || '';
  if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('failed to fetch')) {
    return 'Network error. Please check your internet connection.';
  }

  return msg || 'An unexpected error occurred.';
};