import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface BrowserTask {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  actions?: any[];
  screenshots?: string[];
  error_message?: string;
}

export const useBrowserTask = () => {
  const [currentTask, setCurrentTask] = useState<BrowserTask | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const { user } = useAuth();

  const executeTask = useCallback(
    async (task: string, projectId?: string) => {
      if (!user) return;

      setIsExecuting(true);
      setCurrentTask({ id: '', status: 'pending' });

      try {
        const response = await supabase.functions.invoke('browser-task', {
          body: { task, projectId },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const taskData = response.data;
        setCurrentTask({
          id: taskData.taskId,
          status: taskData.status,
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
            actions: outputData?.actions,
            screenshots: data.screenshots || undefined,
            error_message: data.error_message || undefined,
          });

          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(pollInterval);
            setIsExecuting(false);

            if (data.status === 'completed') {
              toast({
                title: 'Task Completed',
                description: 'Browser automation finished successfully',
              });
            } else {
              toast({
                title: 'Task Failed',
                description: data.error_message || 'Browser automation failed',
                variant: 'destructive',
              });
            }
          }
        }, 2000);

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
      }
    },
    [user]
  );

  return {
    currentTask,
    isExecuting,
    executeTask,
  };
};