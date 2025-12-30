import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';

export type StepPhase = 'analyzing' | 'executing' | 'observing' | 'completed' | 'waiting';

export interface BrowserStep {
  type: string;
  timestamp: string;
  description?: string;
  target?: string;
  status?: 'completed' | 'running' | 'pending';
  phase?: StepPhase;
}

export type TaskStatus = 
  | 'pending' 
  | 'analyzing' 
  | 'gathering_info' 
  | 'running' 
  | 'awaiting_input' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'stopped' 
  | 'standby';

export type InterventionReason = 
  | 'login_required' 
  | 'captcha_detected' 
  | 'confirmation_needed' 
  | 'error_recovery' 
  | 'user_requested' 
  | 'unknown';

export interface TaskDeliverable {
  type: 'screenshot' | 'data' | 'file' | 'text';
  name: string;
  url?: string;
  content?: string;
  mimeType?: string;
  timestamp: string;
}

export interface BrowserTask {
  id: string;
  status: TaskStatus;
  liveUrl?: string;
  actions?: any[];
  steps?: BrowserStep[];
  screenshots?: string[];
  error_message?: string;
  requiresLogin?: boolean;
  loginUrl?: string;
  loginSite?: string;
  // Enhanced properties
  interventionReason?: InterventionReason;
  interventionMessage?: string;
  currentPhase?: StepPhase;
  deliverables?: TaskDeliverable[];
  extractedData?: Record<string, any>;
  taskSummary?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
}

export const useBrowserTask = () => {
  const [currentTask, setCurrentTask] = useState<BrowserTask | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const { user } = useAuth();
  const { canRunBrowserTask, refreshSubscription } = useSubscription();

  // Determine intervention reason from task data
  const getInterventionReason = (outputData: any): { reason: InterventionReason; message: string } => {
    if (outputData?.requires_login) {
      return {
        reason: 'login_required',
        message: `Please log in to ${outputData.login_site || 'the website'} to continue.`
      };
    }
    if (outputData?.captcha_detected) {
      return {
        reason: 'captcha_detected',
        message: 'A CAPTCHA was detected. Please solve it to continue.'
      };
    }
    if (outputData?.confirmation_needed) {
      return {
        reason: 'confirmation_needed',
        message: outputData.confirmation_message || 'Please confirm the action to continue.'
      };
    }
    if (outputData?.error_recovery) {
      return {
        reason: 'error_recovery',
        message: 'An error occurred. Please help resolve the issue.'
      };
    }
    return {
      reason: 'user_requested',
      message: 'You now have control of the browser.'
    };
  };

  // Parse deliverables from task output
  const parseDeliverables = (data: any, screenshots?: string[]): TaskDeliverable[] => {
    const deliverables: TaskDeliverable[] = [];

    // Add screenshots as deliverables
    if (screenshots?.length) {
      screenshots.forEach((url, index) => {
        deliverables.push({
          type: 'screenshot',
          name: `Screenshot ${index + 1}`,
          url,
          mimeType: 'image/png',
          timestamp: new Date().toISOString()
        });
      });
    }

    // Add extracted data as deliverables
    if (data?.extracted_data) {
      deliverables.push({
        type: 'data',
        name: 'Extracted Data',
        content: JSON.stringify(data.extracted_data, null, 2),
        mimeType: 'application/json',
        timestamp: new Date().toISOString()
      });
    }

    // Add output text as deliverable
    if (data?.output && typeof data.output === 'string') {
      deliverables.push({
        type: 'text',
        name: 'Task Output',
        content: data.output,
        mimeType: 'text/plain',
        timestamp: new Date().toISOString()
      });
    }

    return deliverables;
  };

  // Determine current phase from steps
  const getCurrentPhase = (steps: any[], status: string): StepPhase => {
    if (status === 'completed') return 'completed';
    if (status === 'paused' || status === 'awaiting_input') return 'waiting';
    
    const lastStep = steps?.[steps.length - 1];
    if (!lastStep) return 'analyzing';
    
    const action = lastStep.action?.toLowerCase() || lastStep.type?.toLowerCase() || '';
    
    if (action.includes('analyz') || action.includes('think') || action.includes('plan')) {
      return 'analyzing';
    }
    if (action.includes('click') || action.includes('type') || action.includes('navigate')) {
      return 'executing';
    }
    if (action.includes('extract') || action.includes('read') || action.includes('observe')) {
      return 'observing';
    }
    
    return 'executing';
  };

  // Map database status to enhanced status
  const mapToEnhancedStatus = (dbStatus: string, outputData: any): TaskStatus => {
    if (dbStatus === 'pending') {
      // Check if we're in an initial analysis phase
      if (outputData?.steps?.length === 0 || !outputData?.steps) {
        return 'analyzing';
      }
      return 'pending';
    }
    if (dbStatus === 'running') {
      // Check if gathering info
      const lastStep = outputData?.steps?.[outputData.steps.length - 1];
      if (lastStep?.action?.toLowerCase().includes('gather') || 
          lastStep?.action?.toLowerCase().includes('extract')) {
        return 'gathering_info';
      }
      return 'running';
    }
    if (dbStatus === 'paused') {
      if (outputData?.requires_login || outputData?.captcha_detected || outputData?.confirmation_needed) {
        return 'awaiting_input';
      }
      return 'paused';
    }
    return dbStatus as TaskStatus;
  };

  const executeTask = useCallback(
    async (task: string, projectId?: string, profileId?: string) => {
      if (!user) return;

      // Check if user can run browser task
      if (!canRunBrowserTask()) {
        return;
      }

      setIsExecuting(true);
      setCurrentTask({ 
        id: '', 
        status: 'analyzing',
        currentPhase: 'analyzing',
        startedAt: new Date().toISOString()
      });

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
          status: 'running',
          liveUrl: taskData.liveUrl,
          actions: taskData.actions,
          currentPhase: 'executing',
          startedAt: new Date().toISOString()
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
          const steps = outputData?.actions || [];
          const enhancedStatus = mapToEnhancedStatus(data.status, outputData);
          const currentPhase = getCurrentPhase(steps, data.status);
          const intervention = getInterventionReason(outputData);
          const deliverables = parseDeliverables(outputData, data.screenshots || undefined);

          // Calculate duration
          const startTime = data.started_at ? new Date(data.started_at).getTime() : Date.now();
          const endTime = data.completed_at ? new Date(data.completed_at).getTime() : Date.now();
          const duration = Math.round((endTime - startTime) / 1000);

          setCurrentTask({
            id: data.id,
            status: enhancedStatus,
            liveUrl: outputData?.live_url,
            actions: outputData?.actions,
            steps: steps.map((step: any, index: number) => ({
              ...step,
              phase: index === steps.length - 1 ? currentPhase : 'completed'
            })),
            screenshots: data.screenshots || undefined,
            error_message: data.error_message || undefined,
            requiresLogin: outputData?.requires_login || false,
            loginUrl: outputData?.login_url,
            loginSite: outputData?.login_site,
            interventionReason: (enhancedStatus === 'paused' || enhancedStatus === 'awaiting_input') 
              ? intervention.reason 
              : undefined,
            interventionMessage: (enhancedStatus === 'paused' || enhancedStatus === 'awaiting_input')
              ? intervention.message
              : undefined,
            currentPhase,
            deliverables,
            extractedData: outputData?.extracted_data,
            taskSummary: outputData?.output,
            startedAt: data.started_at,
            completedAt: data.completed_at,
            duration
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

        // Check if this was an auto-pause for login
        const isAutoLogin = currentTask?.requiresLogin;
        
        toast({
          title: isAutoLogin ? 'Login Required' : 'Task Paused',
          description: isAutoLogin 
            ? `Please log in to ${currentTask?.loginSite || 'the website'} and click Resume when ready.`
            : 'You can now take over the browser. Click Resume when ready.',
        });

        // Update current task status
        if (currentTask?.id === taskId) {
          setCurrentTask({
            ...currentTask,
            status: 'paused',
            interventionReason: 'user_requested',
            interventionMessage: 'You now have control of the browser.',
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
            interventionReason: undefined,
            interventionMessage: undefined,
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
