import { useState, useCallback } from 'react';
import { TaskItem, TaskItemStatus, TaskNote } from '@/components/chat/EnhancedTaskTracker';

interface UseTaskTrackerOptions {
  onTaskComplete?: (task: TaskItem) => void;
  onAllComplete?: (tasks: TaskItem[]) => void;
}

export function useTaskTracker(options?: UseTaskTrackerOptions) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const generateId = () => `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const createTask = useCallback((
    title: string, 
    description?: string,
    status: TaskItemStatus = 'todo'
  ): TaskItem => {
    const task: TaskItem = {
      id: generateId(),
      title,
      description,
      status,
      notes: [],
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [...prev, task]);
    return task;
  }, []);

  const createTasks = useCallback((
    taskDefs: Array<{ title: string; description?: string; status?: TaskItemStatus }>
  ): TaskItem[] => {
    const newTasks = taskDefs.map(def => ({
      id: generateId(),
      title: def.title,
      description: def.description,
      status: def.status || 'todo',
      notes: [],
      createdAt: new Date().toISOString(),
    }));
    setTasks(prev => [...prev, ...newTasks]);
    return newTasks;
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<TaskItem>) => {
    setTasks(prev => {
      const updated = prev.map(task => {
        if (task.id === taskId) {
          const updatedTask = {
            ...task,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          
          // Check if task just completed
          if (updates.status === 'done' && task.status !== 'done') {
            updatedTask.completedAt = new Date().toISOString();
            options?.onTaskComplete?.(updatedTask);
          }
          
          return updatedTask;
        }
        return task;
      });

      // Check if all tasks are complete
      const allDone = updated.every(t => t.status === 'done' || t.status === 'skipped');
      if (allDone && updated.length > 0) {
        options?.onAllComplete?.(updated);
      }

      return updated;
    });
  }, [options]);

  const setTaskStatus = useCallback((taskId: string, status: TaskItemStatus) => {
    updateTask(taskId, { status });
  }, [updateTask]);

  const addNote = useCallback((
    taskId: string, 
    text: string, 
    type: TaskNote['type'] = 'info'
  ) => {
    const note: TaskNote = {
      id: generateId(),
      text,
      timestamp: new Date().toISOString(),
      type,
    };

    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          notes: [...task.notes, note],
          updatedAt: new Date().toISOString(),
        };
      }
      return task;
    }));
  }, []);

  const setProgress = useCallback((taskId: string, progress: number) => {
    updateTask(taskId, { progress: Math.min(100, Math.max(0, progress)) });
  }, [updateTask]);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const clearTasks = useCallback(() => {
    setTasks([]);
  }, []);

  const getTask = useCallback((taskId: string): TaskItem | undefined => {
    return tasks.find(t => t.id === taskId);
  }, [tasks]);

  const getTasksByStatus = useCallback((status: TaskItemStatus): TaskItem[] => {
    return tasks.filter(t => t.status === status);
  }, [tasks]);

  const getCurrentTask = useCallback((): TaskItem | undefined => {
    return tasks.find(t => t.status === 'in_progress');
  }, [tasks]);

  const startNextTask = useCallback((): TaskItem | undefined => {
    const nextTodo = tasks.find(t => t.status === 'todo');
    if (nextTodo) {
      setTaskStatus(nextTodo.id, 'in_progress');
      return nextTodo;
    }
    return undefined;
  }, [tasks, setTaskStatus]);

  const completeCurrentAndStartNext = useCallback((): TaskItem | undefined => {
    const current = getCurrentTask();
    if (current) {
      setTaskStatus(current.id, 'done');
    }
    return startNextTask();
  }, [getCurrentTask, setTaskStatus, startNextTask]);

  // Computed values
  const completedCount = tasks.filter(t => t.status === 'done').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const blockedCount = tasks.filter(t => t.status === 'blocked').length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isAllComplete = totalCount > 0 && completedCount === totalCount;
  const hasBlockedTasks = blockedCount > 0;

  return {
    tasks,
    createTask,
    createTasks,
    updateTask,
    setTaskStatus,
    addNote,
    setProgress,
    deleteTask,
    clearTasks,
    getTask,
    getTasksByStatus,
    getCurrentTask,
    startNextTask,
    completeCurrentAndStartNext,
    // Computed
    completedCount,
    inProgressCount,
    todoCount,
    blockedCount,
    totalCount,
    progressPercent,
    isAllComplete,
    hasBlockedTasks,
  };
}
