import { 
  APIResponse, 
  PaginatedResponse, 
  User, 
  Project, 
  MediaFile, 
  ExportJob, 
  Template,
  Notification,
  Analytics,
  LoginForm,
  RegisterForm,
  ProjectForm,
  ExportForm
} from '@/types';


// API設定
const API_BASE_URL =
  // Prefer Vite-style env
  (import.meta as any).env?.VITE_API_URL ??
  // Fallback for CRA-style builds (avoid Node typings)
  (globalThis as any).process?.env?.REACT_APP_API_URL ??
  'http://localhost:5000/api';
const TIMEOUT = 30000; // 30秒

// HTTPエラークラス
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// リクエスト設定の型
interface RequestConfig {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

// レスポンス処理用のユーティリティ
class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  // 認証トークンを設定
  setAuthToken(token: string | null) {
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
  }

  // 基本的なHTTPリクエスト
  private async request<T>(
    endpoint: string,
    options: RequestInit & RequestConfig = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const { timeout = TIMEOUT, signal, ...fetchOptions } = options;

    // タイムアウト制御
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // シグナルがある場合は結合
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          ...this.defaultHeaders,
          ...fetchOptions.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // レスポンスの処理
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorDetails = null;

        if (isJson) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
            errorDetails = errorData.details || errorData;
          } catch {
            // JSON解析エラーの場合はそのまま進行
          }
        }

        throw new APIError(errorMessage, response.status, undefined, errorDetails);
      }

      if (isJson) {
        const data: APIResponse<T> = await response.json();
        
        if (!data.success) {
          throw new APIError(
            data.message || 'API request failed',
            response.status,
            data.code,
            data.error
          );
        }

        return data.data as T;
      }

      // JSON以外のレスポンス（ファイルダウンロードなど）
      return response as unknown as T;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new APIError('Request timeout', 408);
        }
        throw new APIError(`Network error: ${error.message}`, 0);
      }

      throw new APIError('Unknown error occurred', 0);
    }
  }

  // HTTP メソッドのヘルパー
  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', ...config });
  }

  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  async patch<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', ...config });
  }

  // ファイルアップロード用
  async uploadFile<T>(
    endpoint: string, 
    file: File, 
    additionalData?: Record<string, string>,
    onProgress?: (progress: number) => void,
    config?: RequestConfig
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    // プログレス監視のためのXMLHttpRequestを使用
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${this.baseURL}${endpoint}`;

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const response: APIResponse<T> = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && response.success) {
            resolve(response.data as T);
          } else {
            reject(new APIError(
              response.message || `HTTP ${xhr.status}`,
              xhr.status,
              response.code,
              response.error
            ));
          }
        } catch (error) {
          reject(new APIError('Failed to parse response', xhr.status));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new APIError('Upload failed', 0));
      });

      xhr.addEventListener('timeout', () => {
        reject(new APIError('Upload timeout', 408));
      });

      xhr.open('POST', url);
      
      // 認証ヘッダーを設定
      if (this.defaultHeaders['Authorization']) {
        xhr.setRequestHeader('Authorization', this.defaultHeaders['Authorization']);
      }

      xhr.timeout = config?.timeout || TIMEOUT;
      xhr.send(formData);
    });
  }
}

// APIクライアントのインスタンス
const apiClient = new ApiClient();

// 認証関連のAPI
export const authAPI = {
  login: (credentials: LoginForm): Promise<{ user: User; token: string }> =>
    apiClient.post('/auth/login', credentials),

  register: (userData: RegisterForm): Promise<{ user: User; token: string }> =>
    apiClient.post('/auth/register', userData),

  logout: (): Promise<void> =>
    apiClient.post('/auth/logout'),

  refreshToken: (): Promise<{ token: string }> =>
    apiClient.post('/auth/refresh'),

  forgotPassword: (email: string): Promise<void> =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string): Promise<void> =>
    apiClient.post('/auth/reset-password', { token, password }),

  verifyEmail: (token: string): Promise<void> =>
    apiClient.post('/auth/verify-email', { token }),
};

// ユーザー関連のAPI
export const userAPI = {
  getCurrentUser: (): Promise<User> =>
    apiClient.get('/users/me'),

  updateProfile: (updates: Partial<User>): Promise<User> =>
    apiClient.patch('/users/me', updates),

  updatePreferences: (preferences: User['preferences']): Promise<User> =>
    apiClient.patch('/users/me/preferences', { preferences }),

  deleteAccount: (): Promise<void> =>
    apiClient.delete('/users/me'),

  getNotifications: (): Promise<Notification[]> =>
    apiClient.get('/users/me/notifications'),

  markNotificationAsRead: (notificationId: string): Promise<void> =>
    apiClient.patch(`/users/me/notifications/${notificationId}/read`),

  clearAllNotifications: (): Promise<void> =>
    apiClient.delete('/users/me/notifications'),

  getUsageStatistics: (): Promise<Analytics> =>
    apiClient.get('/users/me/analytics'),
};

// プロジェクト関連のAPI
export const projectAPI = {
  getProjects: (page: number = 1, limit: number = 20): Promise<PaginatedResponse<Project>> =>
    apiClient.get(`/projects?page=${page}&limit=${limit}`),

  getProject: (projectId: string): Promise<Project> =>
    apiClient.get(`/projects/${projectId}`),

  createProject: (projectData: ProjectForm): Promise<Project> =>
    apiClient.post('/projects', projectData),

  updateProject: (projectId: string, updates: Partial<Project>): Promise<Project> =>
    apiClient.patch(`/projects/${projectId}`, updates),

  deleteProject: (projectId: string): Promise<void> =>
    apiClient.delete(`/projects/${projectId}`),

  duplicateProject: (projectId: string, name?: string): Promise<Project> =>
    apiClient.post(`/projects/${projectId}/duplicate`, { name }),

  shareProject: (projectId: string, options: { publicAccess: boolean; shareToken?: string }): Promise<{ shareUrl: string }> =>
    apiClient.post(`/projects/${projectId}/share`, options),
};

// メディア関連のAPI
export const mediaAPI = {
  getMediaFiles: (projectId?: string): Promise<MediaFile[]> =>
    apiClient.get(`/media${projectId ? `?projectId=${projectId}` : ''}`),

  uploadMedia: (
    file: File, 
    projectId?: string, 
    onProgress?: (progress: number) => void
  ): Promise<MediaFile> =>
    apiClient.uploadFile('/media/upload', file, projectId ? { projectId } : undefined, onProgress),

  uploadMultipleMedia: (
    files: File[], 
    projectId?: string, 
    onProgress?: (progress: number) => void
  ): Promise<MediaFile[]> => {
    const promises = files.map(file => 
      mediaAPI.uploadMedia(file, projectId, onProgress)
    );
    return Promise.all(promises);
  },

  deleteMedia: (mediaId: string): Promise<void> =>
    apiClient.delete(`/media/${mediaId}`),

  getMediaInfo: (mediaId: string): Promise<MediaFile> =>
    apiClient.get(`/media/${mediaId}`),

  updateMediaMetadata: (mediaId: string, metadata: Partial<MediaFile>): Promise<MediaFile> =>
    apiClient.patch(`/media/${mediaId}`, metadata),
};

// エクスポート関連のAPI
export const exportAPI = {
  createExportJob: (projectId: string, settings: ExportForm): Promise<ExportJob> =>
    apiClient.post('/export', { projectId, ...settings }),

  getExportJob: (jobId: string): Promise<ExportJob> =>
    apiClient.get(`/export/${jobId}`),

  getExportHistory: (page: number = 1, limit: number = 20): Promise<PaginatedResponse<ExportJob>> =>
    apiClient.get(`/export/history?page=${page}&limit=${limit}`),

  cancelExportJob: (jobId: string): Promise<void> =>
    apiClient.post(`/export/${jobId}/cancel`),

  downloadExport: (jobId: string): Promise<Response> =>
    apiClient.get(`/export/${jobId}/download`) as Promise<Response>,

  retryFailedExport: (jobId: string): Promise<ExportJob> =>
    apiClient.post(`/export/${jobId}/retry`),
};

// テンプレート関連のAPI
export const templateAPI = {
  getTemplates: (
    category?: string, 
    difficulty?: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<PaginatedResponse<Template>> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (difficulty) params.append('difficulty', difficulty);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    return apiClient.get(`/templates?${params.toString()}`);
  },

  getTemplate: (templateId: string): Promise<Template> =>
    apiClient.get(`/templates/${templateId}`),

  createProjectFromTemplate: (templateId: string, projectName: string): Promise<Project> =>
    apiClient.post(`/templates/${templateId}/create-project`, { name: projectName }),

  getFeaturedTemplates: (): Promise<Template[]> =>
    apiClient.get('/templates/featured'),

  searchTemplates: (query: string): Promise<Template[]> =>
    apiClient.get(`/templates/search?q=${encodeURIComponent(query)}`),
};

// プラン・課金関連のAPI
export const billingAPI = {
  getPlans: (): Promise<any[]> =>
    apiClient.get('/billing/plans'),

  getCurrentSubscription: (): Promise<any> =>
    apiClient.get('/billing/subscription'),

  createCheckoutSession: (planId: string): Promise<{ url: string }> =>
    apiClient.post('/billing/checkout', { planId }),

  createPortalSession: (): Promise<{ url: string }> =>
    apiClient.post('/billing/portal'),

  getInvoices: (): Promise<any[]> =>
    apiClient.get('/billing/invoices'),

  cancelSubscription: (): Promise<void> =>
    apiClient.post('/billing/subscription/cancel'),

  resumeSubscription: (): Promise<void> =>
    apiClient.post('/billing/subscription/resume'),
};

// システム関連のAPI
export const systemAPI = {
  getHealth: (): Promise<any> =>
    apiClient.get('/health'),

  getFeatures: (): Promise<any> =>
    apiClient.get('/features'),

  reportError: (error: any, context?: any): Promise<void> =>
    apiClient.post('/system/error-report', { error, context }),

  getFeedback: (): Promise<any[]> =>
    apiClient.get('/system/feedback'),

  submitFeedback: (feedback: { type: string; message: string; rating?: number }): Promise<void> =>
    apiClient.post('/system/feedback', feedback),
};

// 認証トークンの管理
export const setAuthToken = (token: string | null) => {
  apiClient.setAuthToken(token);
};

// 型安全なWebSocketクライアント（オプション）
export class TypedWebSocket {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => resolve();
        this.ws.onerror = (error) => reject(error);
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            const listeners = this.listeners.get(message.type);
            if (listeners) {
              listeners.forEach(listener => listener(message));
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  on<T>(type: string, listener: (data: T) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  off<T>(type: string, listener: (data: T) => void): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  send<T>(type: string, data: T): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export { apiClient };
export default apiClient;
