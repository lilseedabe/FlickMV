import React from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from 'react-query';
import { 
  authAPI, 
  userAPI, 
  projectAPI, 
  mediaAPI, 
  exportAPI, 
  templateAPI, 
  billingAPI,
  APIError
} from './client';
import { 
  User, 
  Project, 
  MediaFile, 
  ExportJob, 
  Template, 
  Notification,
  LoginForm,
  RegisterForm,
  ProjectForm,
  ExportForm,
  PaginatedResponse
} from '@/types';

// Query Keys (型安全な定数)
export const queryKeys = {
  // User関連
  user: ['user'] as const,
  userNotifications: ['user', 'notifications'] as const,
  userAnalytics: ['user', 'analytics'] as const,
  
  // Project関連
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  projectList: (page: number, limit: number) => ['projects', 'list', page, limit] as const,
  
  // Media関連
  media: ['media'] as const,
  mediaList: (projectId?: string) => ['media', 'list', projectId] as const,
  mediaItem: (id: string) => ['media', id] as const,
  
  // Export関連
  exports: ['exports'] as const,
  exportJob: (id: string) => ['exports', id] as const,
  exportHistory: (page: number, limit: number) => ['exports', 'history', page, limit] as const,
  
  // Template関連
  templates: ['templates'] as const,
  templateList: (category?: string, difficulty?: string, page?: number) => 
    ['templates', 'list', category, difficulty, page] as const,
  template: (id: string) => ['templates', id] as const,
  featuredTemplates: ['templates', 'featured'] as const,
  
  // Billing関連
  billing: ['billing'] as const,
  plans: ['billing', 'plans'] as const,
  subscription: ['billing', 'subscription'] as const,
  invoices: ['billing', 'invoices'] as const,
} as const;

// エラーハンドリング用のユーティリティ（react-query の onError 用に void を返す）
const handleMutationError = (error: unknown): void => {
  if (error instanceof APIError) {
    console.error('Mutation error:', error.message, error.status, error.details);
  } else {
    console.error('Mutation error:', error);
  }
};

// ==================== USER HOOKS ====================

export const useCurrentUser = (options?: UseQueryOptions<User, APIError>) => {
  return useQuery<User, APIError>(
    queryKeys.user,
    userAPI.getCurrentUser,
    {
      staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
      cacheTime: 10 * 60 * 1000, // 10分間キャッシュを保持
      retry: (failureCount, error) => {
        // 認証エラーの場合はリトライしない
        if (error.status === 401 || error.status === 403) {
          return false;
        }
        return failureCount < 3;
      },
      ...options,
    }
  );
};

export const useUpdateProfile = (options?: UseMutationOptions<User, APIError, Partial<User>>) => {
  const queryClient = useQueryClient();
  
  return useMutation<User, APIError, Partial<User>>(
    userAPI.updateProfile,
    {
      onSuccess: (updatedUser) => {
        // ユーザーデータを更新
        queryClient.setQueryData(queryKeys.user, updatedUser);
      },
      onError: handleMutationError,
      ...options,
    }
  );
};

export const useNotifications = (options?: UseQueryOptions<Notification[], APIError>) => {
  return useQuery<Notification[], APIError>(
    queryKeys.userNotifications,
    userAPI.getNotifications,
    {
      staleTime: 1 * 60 * 1000, // 1分間
      refetchInterval: 5 * 60 * 1000, // 5分ごとに自動更新
      ...options,
    }
  );
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, APIError, string>(
    userAPI.markNotificationAsRead,
    {
      onSuccess: (_, notificationId) => {
        // 通知リストを更新
        queryClient.setQueryData<Notification[]>(
          queryKeys.userNotifications,
          (old) => old?.map(notif => 
            notif.id === notificationId 
              ? { ...notif, unread: false }
              : notif
          ) || []
        );
      },
    }
  );
};

// ==================== AUTH HOOKS ====================

export const useLogin = (options?: UseMutationOptions<{ user: User; token: string }, APIError, LoginForm>) => {
  const queryClient = useQueryClient();
  
  return useMutation<{ user: User; token: string }, APIError, LoginForm>(
    authAPI.login,
    {
      onSuccess: (data) => {
        // ユーザーデータをキャッシュに保存
        queryClient.setQueryData(queryKeys.user, data.user);
        // トークンを保存（実際の実装では localStorage や secure cookie に保存）
        localStorage.setItem('authToken', data.token);
      },
      onError: handleMutationError,
      ...options,
    }
  );
};

export const useRegister = (options?: UseMutationOptions<{ user: User; token: string }, APIError, RegisterForm>) => {
  const queryClient = useQueryClient();
  
  return useMutation<{ user: User; token: string }, APIError, RegisterForm>(
    authAPI.register,
    {
      onSuccess: (data) => {
        queryClient.setQueryData(queryKeys.user, data.user);
        localStorage.setItem('authToken', data.token);
      },
      onError: handleMutationError,
      ...options,
    }
  );
};

export const useLogout = (options?: UseMutationOptions<void, APIError, void>) => {
  const queryClient = useQueryClient();
  
  return useMutation<void, APIError, void>(
    authAPI.logout,
    {
      onSuccess: () => {
        // すべてのキャッシュをクリア
        queryClient.clear();
        localStorage.removeItem('authToken');
      },
      ...options,
    }
  );
};

// ==================== PROJECT HOOKS ====================

export const useProjects = (
  page: number = 1, 
  limit: number = 20,
  options?: UseQueryOptions<PaginatedResponse<Project>, APIError>
) => {
  return useQuery<PaginatedResponse<Project>, APIError>(
    queryKeys.projectList(page, limit),
    () => projectAPI.getProjects(page, limit),
    {
      staleTime: 2 * 60 * 1000, // 2分間
      keepPreviousData: true, // ページネーション時にPreviousデータを保持
      ...options,
    }
  );
};

export const useProject = (
  projectId: string,
  options?: UseQueryOptions<Project, APIError>
) => {
  return useQuery<Project, APIError>(
    queryKeys.project(projectId),
    () => projectAPI.getProject(projectId),
    {
      staleTime: 1 * 60 * 1000, // 1分間
      enabled: !!projectId, // projectIdがある場合のみクエリを実行
      ...options,
    }
  );
};

export const useCreateProject = (options?: UseMutationOptions<Project, APIError, ProjectForm>) => {
  const queryClient = useQueryClient();
  
  return useMutation<Project, APIError, ProjectForm>(
    projectAPI.createProject,
    {
      onSuccess: (newProject) => {
        // プロジェクトリストを無効化して再フェッチ
        queryClient.invalidateQueries(queryKeys.projects);
        // 新しいプロジェクトをキャッシュに追加
        queryClient.setQueryData(queryKeys.project(newProject.id), newProject);
      },
      onError: handleMutationError,
      ...options,
    }
  );
};

export const useUpdateProject = (options?: UseMutationOptions<Project, APIError, { id: string; updates: Partial<Project> }>) => {
  const queryClient = useQueryClient();
  
  return useMutation<Project, APIError, { id: string; updates: Partial<Project> }>(
    ({ id, updates }) => projectAPI.updateProject(id, updates),
    {
      onSuccess: (updatedProject) => {
        // 個別プロジェクトのキャッシュを更新
        queryClient.setQueryData(queryKeys.project(updatedProject.id), updatedProject);
        // プロジェクトリストも無効化
        queryClient.invalidateQueries(queryKeys.projects);
      },
      onError: handleMutationError,
      ...options,
    }
  );
};

export const useDeleteProject = (options?: UseMutationOptions<void, APIError, string>) => {
  const queryClient = useQueryClient();
  
  return useMutation<void, APIError, string>(
    projectAPI.deleteProject,
    {
      onSuccess: (_, projectId) => {
        // プロジェクトのキャッシュを削除
        queryClient.removeQueries(queryKeys.project(projectId));
        // プロジェクトリストを無効化
        queryClient.invalidateQueries(queryKeys.projects);
      },
      onError: handleMutationError,
      ...options,
    }
  );
};

// ==================== MEDIA HOOKS ====================

export const useMediaFiles = (
  projectId?: string,
  options?: UseQueryOptions<MediaFile[], APIError>
) => {
  return useQuery<MediaFile[], APIError>(
    queryKeys.mediaList(projectId),
    () => mediaAPI.getMediaFiles(projectId),
    {
      staleTime: 30 * 1000, // 30秒間
      ...options,
    }
  );
};

export const useUploadMedia = (options?: {
  onProgress?: (progress: number) => void;
  mutationOptions?: UseMutationOptions<MediaFile, APIError, { file: File; projectId?: string }>;
}) => {
  const queryClient = useQueryClient();
  
  return useMutation<MediaFile, APIError, { file: File; projectId?: string }>(
    ({ file, projectId }) => mediaAPI.uploadMedia(file, projectId, options?.onProgress),
    {
      onSuccess: (newMedia, { projectId }) => {
        // メディアリストを無効化
        queryClient.invalidateQueries(queryKeys.mediaList(projectId));
        queryClient.invalidateQueries(queryKeys.media);
      },
      onError: handleMutationError,
      ...options?.mutationOptions,
    }
  );
};

export const useDeleteMedia = (options?: UseMutationOptions<void, APIError, string>) => {
  const queryClient = useQueryClient();
  
  return useMutation<void, APIError, string>(
    mediaAPI.deleteMedia,
    {
      onSuccess: () => {
        // すべてのメディアクエリを無効化
        queryClient.invalidateQueries(queryKeys.media);
      },
      onError: handleMutationError,
      ...options,
    }
  );
};

// ==================== EXPORT HOOKS ====================

export const useCreateExport = (options?: UseMutationOptions<ExportJob, APIError, { projectId: string; settings: ExportForm }>) => {
  const queryClient = useQueryClient();
  
  return useMutation<ExportJob, APIError, { projectId: string; settings: ExportForm }>(
    ({ projectId, settings }) => exportAPI.createExportJob(projectId, settings),
    {
      onSuccess: () => {
        // エクスポート履歴を無効化
        queryClient.invalidateQueries(queryKeys.exports);
      },
      onError: handleMutationError,
      ...options,
    }
  );
};

export const useExportJob = (
  jobId: string,
  options?: UseQueryOptions<ExportJob, APIError>
) => {
  return useQuery<ExportJob, APIError>(
    queryKeys.exportJob(jobId),
    () => exportAPI.getExportJob(jobId),
    {
      refetchInterval: (data) => {
        // 処理中の場合は5秒ごとに更新
        if (data?.status === 'processing' || data?.status === 'queued') {
          return 5000;
        }
        return false;
      },
      enabled: !!jobId,
      ...options,
    }
  );
};

export const useExportHistory = (
  page: number = 1,
  limit: number = 20,
  options?: UseQueryOptions<PaginatedResponse<ExportJob>, APIError>
) => {
  return useQuery<PaginatedResponse<ExportJob>, APIError>(
    queryKeys.exportHistory(page, limit),
    () => exportAPI.getExportHistory(page, limit),
    {
      staleTime: 1 * 60 * 1000, // 1分間
      keepPreviousData: true,
      ...options,
    }
  );
};

// ==================== TEMPLATE HOOKS ====================

export const useTemplates = (
  filters: { category?: string; difficulty?: string; page?: number; limit?: number } = {},
  options?: UseQueryOptions<PaginatedResponse<Template>, APIError>
) => {
  const { category, difficulty, page = 1, limit = 20 } = filters;
  
  return useQuery<PaginatedResponse<Template>, APIError>(
    queryKeys.templateList(category, difficulty, page),
    () => templateAPI.getTemplates(category, difficulty, page, limit),
    {
      staleTime: 10 * 60 * 1000, // 10分間（テンプレートは変更頻度が低い）
      keepPreviousData: true,
      ...options,
    }
  );
};

export const useFeaturedTemplates = (options?: UseQueryOptions<Template[], APIError>) => {
  return useQuery<Template[], APIError>(
    queryKeys.featuredTemplates,
    templateAPI.getFeaturedTemplates,
    {
      staleTime: 30 * 60 * 1000, // 30分間
      ...options,
    }
  );
};

export const useCreateProjectFromTemplate = (
  options?: UseMutationOptions<Project, APIError, { templateId: string; projectName: string }>
) => {
  const queryClient = useQueryClient();
  
  return useMutation<Project, APIError, { templateId: string; projectName: string }>(
    ({ templateId, projectName }) => templateAPI.createProjectFromTemplate(templateId, projectName),
    {
      onSuccess: (newProject) => {
        // プロジェクトリストを無効化
        queryClient.invalidateQueries(queryKeys.projects);
        // 新しいプロジェクトをキャッシュに設定
        queryClient.setQueryData(queryKeys.project(newProject.id), newProject);
      },
      onError: handleMutationError,
      ...options,
    }
  );
};

// ==================== BILLING HOOKS ====================

export const usePlans = (options?: UseQueryOptions<any[], APIError>) => {
  return useQuery<any[], APIError>(
    queryKeys.plans,
    billingAPI.getPlans,
    {
      staleTime: 60 * 60 * 1000, // 1時間
      ...options,
    }
  );
};

export const useSubscription = (options?: UseQueryOptions<any, APIError>) => {
  return useQuery<any, APIError>(
    queryKeys.subscription,
    billingAPI.getCurrentSubscription,
    {
      staleTime: 5 * 60 * 1000, // 5分間
      ...options,
    }
  );
};

export const useCreateCheckoutSession = (
  options?: UseMutationOptions<{ url: string }, APIError, string>
) => {
  return useMutation<{ url: string }, APIError, string>(
    billingAPI.createCheckoutSession,
    {
      onError: handleMutationError,
      ...options,
    }
  );
};

// ==================== CUSTOM UTILITY HOOKS ====================

// プロジェクト作成からテンプレート選択まで一括で行うフック
export const useProjectWorkflow = () => {
  const createProject = useCreateProject();
  const createFromTemplate = useCreateProjectFromTemplate();
  
  return {
    createProject: createProject.mutate,
    createFromTemplate: createFromTemplate.mutate,
    isLoading: createProject.isLoading || createFromTemplate.isLoading,
    error: createProject.error || createFromTemplate.error,
  };
};

// リアルタイム同期用のフック（WebSocket使用）
export const useRealtimeProject = (projectId: string) => {
  const queryClient = useQueryClient();
  const { data: project } = useProject(projectId);
  
  React.useEffect(() => {
    // WebSocket接続とリアルタイム更新の実装
    // 実際の実装では WebSocket を使用
    
    return () => {
      // クリーンアップ
    };
  }, [projectId, queryClient]);
  
  return { project };
};

export default {
  // User
  useCurrentUser,
  useUpdateProfile,
  useNotifications,
  useMarkNotificationAsRead,
  
  // Auth
  useLogin,
  useRegister,
  useLogout,
  
  // Projects
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  
  // Media
  useMediaFiles,
  useUploadMedia,
  useDeleteMedia,
  
  // Export
  useCreateExport,
  useExportJob,
  useExportHistory,
  
  // Templates
  useTemplates,
  useFeaturedTemplates,
  useCreateProjectFromTemplate,
  
  // Billing
  usePlans,
  useSubscription,
  useCreateCheckoutSession,
  
  // Custom
  useProjectWorkflow,
  useRealtimeProject,
};
