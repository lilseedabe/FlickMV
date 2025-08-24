import React from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
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
  return useQuery<User, APIError>({
    queryKey: queryKeys.user,
    queryFn: userAPI.getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
    gcTime: 10 * 60 * 1000, // 10分間キャッシュを保持
    retry: (failureCount, error: any) => {
      // 認証エラーの場合はリトライしない
      if ((error as APIError)?.status === 401 || (error as APIError)?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
    ...(options as any),
  });
};

export const useUpdateProfile = (options?: UseMutationOptions<User, APIError, Partial<User>>) => {
  const queryClient = useQueryClient();
  
  return useMutation<User, APIError, Partial<User>>({
    mutationFn: userAPI.updateProfile,
    onSuccess: (updatedUser) => {
      // ユーザーデータを更新
      queryClient.setQueryData(queryKeys.user, updatedUser);
    },
    onError: handleMutationError,
    ...(options as any),
  });
};

export const useNotifications = (options?: UseQueryOptions<Notification[], APIError>) => {
  return useQuery<Notification[], APIError>({
    queryKey: queryKeys.userNotifications,
    queryFn: userAPI.getNotifications,
    staleTime: 1 * 60 * 1000, // 1分間
    refetchInterval: 5 * 60 * 1000, // 5分ごとに自動更新
    ...(options as any),
  });
};

export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, APIError, string>({
    mutationFn: userAPI.markNotificationAsRead,
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
  });
};

// ==================== AUTH HOOKS ====================

export const useLogin = (options?: UseMutationOptions<{ user: User; token: string }, APIError, LoginForm>) => {
  const queryClient = useQueryClient();
  
  return useMutation<{ user: User; token: string }, APIError, LoginForm>({
    mutationFn: authAPI.login,
    onSuccess: (data) => {
      // ユーザーデータをキャッシュに保存
      queryClient.setQueryData(queryKeys.user, data.user);
      // トークンを保存（実際の実装では localStorage や secure cookie に保存）
      localStorage.setItem('authToken', data.token);
    },
    onError: handleMutationError,
    ...(options as any),
  });
};

export const useRegister = (options?: UseMutationOptions<{ user: User; token: string }, APIError, RegisterForm>) => {
  const queryClient = useQueryClient();
  
  return useMutation<{ user: User; token: string }, APIError, RegisterForm>({
    mutationFn: authAPI.register,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.user, data.user);
      localStorage.setItem('authToken', data.token);
    },
    onError: handleMutationError,
    ...(options as any),
  });
};

export const useLogout = (options?: UseMutationOptions<void, APIError, void>) => {
  const queryClient = useQueryClient();
  
  return useMutation<void, APIError, void>({
    mutationFn: authAPI.logout,
    onSuccess: () => {
      // すべてのキャッシュをクリア
      queryClient.clear();
      localStorage.removeItem('authToken');
    },
    ...(options as any),
  });
};

// ==================== PROJECT HOOKS ====================

export const useProjects = (
  page: number = 1, 
  limit: number = 20,
  options?: UseQueryOptions<PaginatedResponse<Project>, APIError>
) => {
  return useQuery<PaginatedResponse<Project>, APIError>({
    queryKey: queryKeys.projectList(page, limit),
    queryFn: () => projectAPI.getProjects(page, limit),
    staleTime: 2 * 60 * 1000, // 2分間
    ...(options as any),
  });
};

export const useProject = (
  projectId: string,
  options?: UseQueryOptions<Project, APIError>
) => {
  return useQuery<Project, APIError>({
    queryKey: queryKeys.project(projectId),
    queryFn: () => projectAPI.getProject(projectId),
    staleTime: 1 * 60 * 1000, // 1分間
    enabled: !!projectId, // projectIdがある場合のみクエリを実行
    ...(options as any),
  });
};

export const useCreateProject = (options?: UseMutationOptions<Project, APIError, ProjectForm>) => {
  const queryClient = useQueryClient();
  
  return useMutation<Project, APIError, ProjectForm>({
    mutationFn: projectAPI.createProject,
    onSuccess: (newProject) => {
      // プロジェクトリストを無効化して再フェッチ
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      // 新しいプロジェクトをキャッシュに追加
      queryClient.setQueryData(queryKeys.project(newProject.id), newProject);
    },
    onError: handleMutationError,
    ...(options as any),
  });
};

export const useUpdateProject = (options?: UseMutationOptions<Project, APIError, { id: string; updates: Partial<Project> }>) => {
  const queryClient = useQueryClient();
  
  return useMutation<Project, APIError, { id: string; updates: Partial<Project> }>({
    mutationFn: ({ id, updates }) => projectAPI.updateProject(id, updates),
    onSuccess: (updatedProject) => {
      // 個別プロジェクトのキャッシュを更新
      queryClient.setQueryData(queryKeys.project(updatedProject.id), updatedProject);
      // プロジェクトリストも無効化
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
    onError: handleMutationError,
    ...(options as any),
  });
};

export const useDeleteProject = (options?: UseMutationOptions<void, APIError, string>) => {
  const queryClient = useQueryClient();
  
  return useMutation<void, APIError, string>({
    mutationFn: projectAPI.deleteProject,
    onSuccess: (_, projectId) => {
      // プロジェクトのキャッシュを削除
      queryClient.removeQueries({ queryKey: queryKeys.project(projectId) });
      // プロジェクトリストを無効化
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
    onError: handleMutationError,
    ...(options as any),
  });
};

// ==================== MEDIA HOOKS ====================

export const useMediaFiles = (
  projectId?: string,
  options?: UseQueryOptions<MediaFile[], APIError>
) => {
  return useQuery<MediaFile[], APIError>({
    queryKey: queryKeys.mediaList(projectId),
    queryFn: () => mediaAPI.getMediaFiles(projectId),
    staleTime: 30 * 1000, // 30秒間
    ...(options as any),
  });
};

export const useUploadMedia = (options?: {
  onProgress?: (progress: number) => void;
  mutationOptions?: UseMutationOptions<MediaFile, APIError, { file: File; projectId?: string }>;
}) => {
  const queryClient = useQueryClient();
  
  return useMutation<MediaFile, APIError, { file: File; projectId?: string }>({
    mutationFn: ({ file, projectId }) => mediaAPI.uploadMedia(file, projectId, options?.onProgress),
    onSuccess: (newMedia, { projectId }) => {
      // メディアリストを無効化
      queryClient.invalidateQueries({ queryKey: queryKeys.mediaList(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.media });
    },
    onError: handleMutationError,
    ...(options?.mutationOptions as any),
  });
};

export const useDeleteMedia = (options?: UseMutationOptions<void, APIError, string>) => {
  const queryClient = useQueryClient();
  
  return useMutation<void, APIError, string>({
    mutationFn: mediaAPI.deleteMedia,
    onSuccess: () => {
      // すべてのメディアクエリを無効化
      queryClient.invalidateQueries({ queryKey: queryKeys.media });
    },
    onError: handleMutationError,
    ...(options as any),
  });
};

// ==================== EXPORT HOOKS ====================

export const useCreateExport = (options?: UseMutationOptions<ExportJob, APIError, { projectId: string; settings: ExportForm }>) => {
  const queryClient = useQueryClient();
  
  return useMutation<ExportJob, APIError, { projectId: string; settings: ExportForm }>({
    mutationFn: ({ projectId, settings }) => exportAPI.createExportJob(projectId, settings),
    onSuccess: () => {
      // エクスポート履歴を無効化
      queryClient.invalidateQueries({ queryKey: queryKeys.exports });
    },
    onError: handleMutationError,
    ...(options as any),
  });
};

export const useExportJob = (
  jobId: string,
  options?: UseQueryOptions<ExportJob, APIError>
) => {
  return useQuery<ExportJob, APIError>({
    queryKey: queryKeys.exportJob(jobId),
    queryFn: () => exportAPI.getExportJob(jobId),
    // TanStack Query v5: refetchInterval のコールバック引数は Query
    refetchInterval: (query) => {
      const status = (query.state.data as ExportJob | undefined)?.status;
      return status === 'processing' || status === 'queued' ? 5000 : false;
    },
    enabled: !!jobId,
    ...(options as any),
  });
};

export const useExportHistory = (
  page: number = 1,
  limit: number = 20,
  options?: UseQueryOptions<PaginatedResponse<ExportJob>, APIError>
) => {
  return useQuery<PaginatedResponse<ExportJob>, APIError>({
    queryKey: queryKeys.exportHistory(page, limit),
    queryFn: () => exportAPI.getExportHistory(page, limit),
    staleTime: 1 * 60 * 1000, // 1分間
    ...(options as any),
  });
};

// ==================== TEMPLATE HOOKS ====================

export const useTemplates = (
  filters: { category?: string; difficulty?: string; page?: number; limit?: number } = {},
  options?: UseQueryOptions<PaginatedResponse<Template>, APIError>
) => {
  const { category, difficulty, page = 1, limit = 20 } = filters;
  
  return useQuery<PaginatedResponse<Template>, APIError>({
    queryKey: queryKeys.templateList(category, difficulty, page),
    queryFn: () => templateAPI.getTemplates(category, difficulty, page, limit),
    staleTime: 10 * 60 * 1000, // 10分間（テンプレートは変更頻度が低い）
    ...(options as any),
  });
};

export const useFeaturedTemplates = (options?: UseQueryOptions<Template[], APIError>) => {
  return useQuery<Template[], APIError>({
    queryKey: queryKeys.featuredTemplates,
    queryFn: templateAPI.getFeaturedTemplates,
    staleTime: 30 * 60 * 1000, // 30分間
    ...(options as any),
  });
};

export const useCreateProjectFromTemplate = (
  options?: UseMutationOptions<Project, APIError, { templateId: string; projectName: string }>
) => {
  const queryClient = useQueryClient();
  
  return useMutation<Project, APIError, { templateId: string; projectName: string }>({
    mutationFn: ({ templateId, projectName }) => templateAPI.createProjectFromTemplate(templateId, projectName),
    onSuccess: (newProject) => {
      // プロジェクトリストを無効化
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      // 新しいプロジェクトをキャッシュに設定
      queryClient.setQueryData(queryKeys.project(newProject.id), newProject);
    },
    onError: handleMutationError,
    ...(options as any),
  });
};

// ==================== BILLING HOOKS ====================

export const usePlans = (options?: UseQueryOptions<any[], APIError>) => {
  return useQuery<any[], APIError>({
    queryKey: queryKeys.plans,
    queryFn: billingAPI.getPlans,
    staleTime: 60 * 60 * 1000, // 1時間
    ...(options as any),
  });
};

export const useSubscription = (options?: UseQueryOptions<any, APIError>) => {
  return useQuery<any, APIError>({
    queryKey: queryKeys.subscription,
    queryFn: billingAPI.getCurrentSubscription,
    staleTime: 5 * 60 * 1000, // 5分間
    ...(options as any),
  });
};

export const useCreateCheckoutSession = (
  options?: UseMutationOptions<{ url: string }, APIError, string>
) => {
  return useMutation<{ url: string }, APIError, string>({
    mutationFn: billingAPI.createCheckoutSession,
    onError: handleMutationError,
    ...(options as any),
  });
};

// ==================== CUSTOM UTILITY HOOKS ====================

// プロジェクト作成からテンプレート選択まで一括で行うフック
export const useProjectWorkflow = () => {
  const createProject = useCreateProject();
  const createFromTemplate = useCreateProjectFromTemplate();
  
  return {
    createProject: createProject.mutate,
    createFromTemplate: createFromTemplate.mutate,
    // v5 の mutation は isPending を使用
    isLoading: createProject.isPending || createFromTemplate.isPending,
    error: (createProject as any).error || (createFromTemplate as any).error,
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
