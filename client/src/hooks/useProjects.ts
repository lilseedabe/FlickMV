import { useState, useEffect, useCallback } from 'react';
import { projectsAPI, handleApiError } from '@/utils/api';
import type { Project, Timeline } from '@/types';

interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
}

interface ProjectsActions {
  loadProjects: (params?: any) => Promise<void>;
  loadProject: (id: string) => Promise<Project | null>;
  createProject: (data: Partial<Project>) => Promise<Project | null>;
  updateProject: (id: string, data: Partial<Project>) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  duplicateProject: (id: string) => Promise<Project | null>;
  updateTimeline: (id: string, timeline: Timeline) => Promise<boolean>;
  clearError: () => void;
  setCurrentProject: (project: Project | null) => void;
}

export const useProjects = (): ProjectsState & ProjectsActions => {
  const [state, setState] = useState<ProjectsState>({
    projects: [],
    currentProject: null,
    isLoading: false,
    error: null
  });

  const loadProjects = useCallback(async (params?: any) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await projectsAPI.getAll(params) as any;
      setState(prev => ({
        ...prev,
        projects: response.projects,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: handleApiError(error as Error)
      }));
    }
  }, []);

  const loadProject = useCallback(async (id: string): Promise<Project | null> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const response = await projectsAPI.getById(id) as any;
      const project = response.project;
      
      setState(prev => ({
        ...prev,
        currentProject: project
      }));
      
      return project;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: handleApiError(error as Error)
      }));
      return null;
    }
  }, []);

  const createProject = useCallback(async (data: Partial<Project>): Promise<Project | null> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await projectsAPI.create(data) as any;
      const project = response.project;
      
      setState(prev => ({
        ...prev,
        projects: [project, ...prev.projects],
        currentProject: project,
        isLoading: false
      }));
      
      return project;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: handleApiError(error as Error)
      }));
      return null;
    }
  }, []);

  const updateProject = useCallback(async (id: string, data: Partial<Project>): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const response = await projectsAPI.update(id, data) as any;
      const updatedProject = response.project;
      
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === id ? updatedProject : p),
        currentProject: prev.currentProject?.id === id ? updatedProject : prev.currentProject
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: handleApiError(error as Error)
      }));
      return false;
    }
  }, []);

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      await projectsAPI.delete(id);
      
      setState(prev => ({
        ...prev,
        projects: prev.projects.filter(p => p.id !== id),
        currentProject: prev.currentProject?.id === id ? null : prev.currentProject
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: handleApiError(error as Error)
      }));
      return false;
    }
  }, []);

  const duplicateProject = useCallback(async (id: string): Promise<Project | null> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await projectsAPI.duplicate(id) as any;
      const project = response.project;
      
      setState(prev => ({
        ...prev,
        projects: [project, ...prev.projects],
        isLoading: false
      }));
      
      return project;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: handleApiError(error as Error)
      }));
      return null;
    }
  }, []);

  const updateTimeline = useCallback(async (id: string, timeline: Timeline): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      await projectsAPI.updateTimeline(id, timeline);
      
      // Update current project timeline
      setState(prev => ({
        ...prev,
        currentProject: prev.currentProject?.id === id 
          ? { ...prev.currentProject, timeline }
          : prev.currentProject
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: handleApiError(error as Error)
      }));
      return false;
    }
  }, []);

  const setCurrentProject = useCallback((project: Project | null) => {
    setState(prev => ({ ...prev, currentProject: project }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    loadProjects,
    loadProject,
    createProject,
    updateProject,
    deleteProject,
    duplicateProject,
    updateTimeline,
    setCurrentProject,
    clearError
  };
};

// Hook for auto-saving project changes
export const useAutoSave = (
  project: Project | null,
  updateTimeline: (id: string, timeline: Timeline) => Promise<boolean>,
  debounceMs = 2000
) => {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveProject = useCallback(async () => {
    if (!project) return;

    try {
      setIsSaving(true);
      await updateTimeline(project.id, project.timeline);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [project, updateTimeline]);

  // Debounced save function
  useEffect(() => {
    if (!project) return;

    const timeoutId = setTimeout(() => {
      saveProject();
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [project?.timeline, saveProject, debounceMs]);

  const manualSave = useCallback(async () => {
    await saveProject();
  }, [saveProject]);

  return {
    lastSaved,
    isSaving,
    manualSave
  };
};