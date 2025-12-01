import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';

export interface BrowserStep {
  type: string;
  timestamp: string;
  description?: string;
  target?: string;
  status?: 'completed' | 'running' | 'pending';
}

export interface BrowserTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped' | 'paused';
  liveUrl?: string;
  actions?: any[];
  steps?: BrowserStep[];
  screenshots?: string[];
  error_message?: string;
}

export const useBrowserTask = () => {
  const [currentTask, setCurrentTask] = useState<BrowserTask | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const { user } = useAuth();
  const { canRunBrowserTask, refreshSubscription } = useSubscription();

  const executeTask = useCallback(
    async (task: string, projectId?: string, profileId?: string) => {
      if (!user) return;

      // Check if user can run browser task
      if (!canRunBrowserTask()) {
        return;
      }

      setIsExecuting(true);
      setCurrentTask({ id: '', status: 'pending' });

      try {
        const response = await supabase.functions.invoke('browser-task', {
          body: { task, projectId, profileId },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const taskData = response.data;
        setCurrentTask({
          id: taskData.taskId,
          status: taskData.status,
          liveUrl: taskData.liveUrl,
          actions: taskData.actions,
        });

        toast({
          title: 'Task Started',
          description: 'Browser automation is running',
        });

        // Poll for task completion
        const pollInterval = setInterval(async () => {
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskData.taskId)
            .single();

          if (error || !data) {
            clearInterval(pollInterval);
            setIsExecuting(false);
            return;
          }

          const outputData = data.output_data as any;
          setCurrentTask({
            id: data.id,
            status: data.status as BrowserTask['status'],
            liveUrl: outputData?.live_url,
            actions: outputData?.actions,
            steps: outputData?.actions || [],
            screenshots: data.screenshots || undefined,
            error_message: data.error_message || undefined,
          });

          if (data.status === 'completed' || data.status === 'failed' || data.status === 'stopped') {
            clearInterval(pollInterval);
            setIsExecuting(false);

            if (data.status === 'completed') {
              toast({
                title: 'Task Completed',
                description: 'Browser automation finished successfully',
              });
            } else if (data.status === 'failed') {
              toast({
                title: 'Task Failed',
                description: data.error_message || 'Browser automation failed',
                variant: 'destructive',
              });
            } else if (data.status === 'stopped') {
              toast({
                title: 'Task Stopped',
                description: 'Browser automation was stopped by user',
                variant: 'default',
              });
            } else if (data.status === 'paused') {
              // Don't clear interval when paused, keep polling
            }
          }
        }, 1000);

        return taskData.taskId;
      } catch (error: any) {
        console.error('Error executing browser task:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to execute browser task',
          variant: 'destructive',
        });
        setIsExecuting(false);
        setCurrentTask(null);
        // Refresh subscription to update usage
        refreshSubscription();
      }
    },
    [user, canRunBrowserTask, refreshSubscription]
  );

  const stopTask = useCallback(
    async (taskId: string) => {
      if (!user) return;

      setIsStopping(true);

      try {
        const response = await supabase.functions.invoke('stop-browser-task', {
          body: { taskId },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        toast({
          title: 'Task Stopped',
          description: 'Browser automation stopped successfully',
        });

        // Update current task status
        if (currentTask?.id === taskId) {
          setCurrentTask({
            ...currentTask,
            status: 'stopped',
          });
        }
      } catch (error: any) {
        console.error('Error stopping task:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to stop task',
          variant: 'destructive',
        });
      } finally {
        setIsStopping(false);
      }
    },
    [user, currentTask]
  );

  const pauseTask = useCallback(
    async (taskId: string) => {
      if (!user) return;

      setIsPausing(true);

      try {
        const response = await supabase.functions.invoke('pause-browser-task', {
          body: { taskId },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        toast({
          title: 'Task Paused',
          description: 'You can now take over the browser. Click Resume when ready.',
        });

        // Update current task status
        if (currentTask?.id === taskId) {
          setCurrentTask({
            ...currentTask,
            status: 'paused',
          });
        }
      } catch (error: any) {
        console.error('Error pausing task:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to pause task',
          variant: 'destructive',
        });
      } finally {
        setIsPausing(false);
      }
    },
    [user, currentTask]
  );

  const resumeTask = useCallback(
    async (taskId: string) => {
      if (!user) return;

      setIsResuming(true);

      try {
        const response = await supabase.functions.invoke('resume-browser-task', {
          body: { taskId },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        toast({
          title: 'Task Resumed',
          description: 'Automation is continuing',
        });

        // Update current task status
        if (currentTask?.id === taskId) {
          setCurrentTask({
            ...currentTask,
            status: 'running',
          });
        }
      } catch (error: any) {
        console.error('Error resuming task:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to resume task',
          variant: 'destructive',
        });
      } finally {
        setIsResuming(false);
      }
    },
    [user, currentTask]
  );

  return {
    currentTask,
    isExecuting,
    isStopping,
    isPausing,
    isResuming,
    executeTask,
    stopTask,
    pauseTask,
    resumeTask,
  };
};