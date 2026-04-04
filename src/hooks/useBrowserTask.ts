import { useState, useCallback, useEffect, useRef } from 'react';
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
  | 'planning'
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

export type InterventionType = 'notify' | 'ask';

export type TakeoverType = 'browser' | 'input' | 'none';

export interface TaskDeliverable {
  type: 'screenshot' | 'data' | 'file' | 'text';
  name: string;
  url?: string;
  content?: string;
  mimeType?: string;
  timestamp: string;
}

// Shell session types
export interface ShellSession {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'waiting' | 'completed' | 'error';
  workingDir: string;
  output: string[];
  lastCommand?: string;
  startedAt?: string;
}

// Deployment types
export type DeploymentType = 'static' | 'nextjs' | 'port';

export interface Deployment {
  id: string;
  type: DeploymentType;
  status: 'pending' | 'deploying' | 'live' | 'error';
  url?: string;
  port?: number;
  localDir?: string;
  createdAt: string;
  expiresAt?: string;
}

// Notify message types
export type NotifyLevel = 'info' | 'success' | 'warning' | 'progress';

export interface NotifyMessageData {
  id: string;
  level: NotifyLevel;
  message: string;
  timestamp: string;
  attachments?: string[];
  autoHideAfter?: number;
}

export interface PlannedStep {
  id: number;
  description: string;
  status: 'pending' | 'current' | 'completed' | 'skipped';
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  inProgress?: boolean;
}

export interface SiteKnowledge {
  domain: string;
  loginMethod?: 'form' | 'oauth' | 'sso' | 'magic-link';
  loginUrl?: string;
  requiresLogin?: boolean;
  notes?: string[];
  quirks?: string[];
  lastUsed?: string;
  successRate?: number;
}

// New types for the four new features
export interface NextStep {
  id: string;
  title: string;
  description: string;
  action: 'rerun' | 'modify' | 'export' | 'share' | 'new';
  prompt?: string;
}

export type ChallengeType = 'auth' | 'complexity' | 'time' | 'access' | 'unknown';
export type ChallengeSeverity = 'low' | 'medium' | 'high';

export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  severity: ChallengeSeverity;
  mitigation?: string;
}

export interface ProcessStep {
  id: string;
  timestamp: string;
  action: string;
  details?: string;
  status: 'completed' | 'failed' | 'skipped';
  duration?: number;
}

export interface ProcessReport {
  taskId: string;
  taskDescription: string;
  startedAt: string;
  completedAt?: string;
  status: 'completed' | 'failed' | 'stopped';
  totalDuration: number;
  steps: ProcessStep[];
  summary?: string;
  errors?: string[];
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
  interventionType?: InterventionType;
  currentPhase?: StepPhase;
  deliverables?: TaskDeliverable[];
  extractedData?: Record<string, any>;
  taskSummary?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  // Planning and todo properties
  plannedSteps?: PlannedStep[];
  currentPlanStepId?: number;
  todoItems?: TodoItem[];
  isPlanning?: boolean;
  siteKnowledge?: SiteKnowledge[];
  // New properties for the four new features
  nextSteps?: NextStep[];
  challenges?: Challenge[];
  processReport?: ProcessReport;
  taskDescription?: string;
  // New properties for notify/ask, takeover, shell, deployment
  suggestedTakeover?: TakeoverType;
  takeoverMessage?: string;
  shellSessions?: ShellSession[];
  activeShellSessionId?: string;
  deployments?: Deployment[];
  notifications?: NotifyMessageData[];
}

export const useBrowserTask = () => {
  const [currentTask, setCurrentTask] = useState<BrowserTask | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [activePollingTaskId, setActivePollingTaskId] = useState<string | null>(null);
  const { user } = useAuth();
  const { canRunBrowserTask, refreshSubscription } = useSubscription();
  const currentTaskIdRef = useRef<string | null>(null);

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

    if (data?.extracted_data) {
      deliverables.push({
        type: 'data',
        name: 'Extracted Data',
        content: JSON.stringify(data.extracted_data, null, 2),
        mimeType: 'application/json',
        timestamp: new Date().toISOString()
      });
    }

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

  // Parse planned steps from task output
  const parsePlannedSteps = (outputData: any, executedSteps: any[]): PlannedStep[] => {
    if (outputData?.plan?.steps) {
      return outputData.plan.steps.map((step: any, index: number) => {
        const stepNum = index + 1;
        const isCompleted = executedSteps.some(
          (es: any) => es.plan_step_id === stepNum || es.step_number === stepNum
        );
        const isCurrent = !isCompleted && executedSteps.length === index;
        
        return {
          id: stepNum,
          description: step.description || step.action || `Step ${stepNum}`,
          status: isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'
        };
      });
    }
    
    if (executedSteps.length > 0) {
      return executedSteps.map((step: any, index: number) => ({
        id: index + 1,
        description: step.description || step.action || step.type || `Step ${index + 1}`,
        status: step.status === 'completed' ? 'completed' : 
                index === executedSteps.length - 1 ? 'current' : 'completed'
      }));
    }
    
    return [];
  };

  // Parse todo items from task output
  const parseTodoItems = (outputData: any, executedSteps: any[]): TodoItem[] => {
    if (outputData?.todo?.items) {
      return outputData.todo.items.map((item: any, index: number) => ({
        id: item.id || `todo-${index}`,
        text: item.text || item.description || item.action,
        completed: item.completed || false,
        inProgress: item.inProgress || item.in_progress || false
      }));
    }
    
    if (executedSteps.length > 0) {
      return executedSteps.map((step: any, index: number) => ({
        id: `step-${index}`,
        text: step.description || step.action || step.type || `Action ${index + 1}`,
        completed: step.status === 'completed',
        inProgress: index === executedSteps.length - 1 && step.status !== 'completed'
      }));
    }
    
    return [];
  };

  // Extract site knowledge from task
  const extractSiteKnowledge = (outputData: any, currentUrl?: string): SiteKnowledge | null => {
    if (!currentUrl) return null;
    
    try {
      const url = new URL(currentUrl);
      const domain = url.hostname.replace('www.', '');
      
      return {
        domain,
        loginMethod: outputData?.login_method || undefined,
        loginUrl: outputData?.login_url || undefined,
        requiresLogin: outputData?.requires_login || false,
        notes: outputData?.site_notes || [],
        quirks: outputData?.site_quirks || [],
        lastUsed: new Date().toISOString()
      };
    } catch {
      return null;
    }
  };

  // Parse challenges from task output
  const parseChallenges = (outputData: any): Challenge[] => {
    if (outputData?.challenges) {
      return outputData.challenges.map((c: any, index: number) => ({
        id: c.id || `challenge-${index}`,
        type: c.type || 'unknown',
        title: c.title || 'Potential Issue',
        description: c.description || '',
        severity: c.severity || 'medium',
        mitigation: c.mitigation
      }));
    }
    
    const challenges: Challenge[] = [];
    
    if (outputData?.requires_login) {
      challenges.push({
        id: 'auth-required',
        type: 'auth',
        title: 'Authentication Required',
        description: `This task requires logging in to ${outputData?.login_site || 'the website'}`,
        severity: 'medium',
        mitigation: 'The task will pause for you to complete login'
      });
    }
    
    if (outputData?.captcha_detected) {
      challenges.push({
        id: 'captcha',
        type: 'access',
        title: 'CAPTCHA Detected',
        description: 'A CAPTCHA challenge may appear during execution',
        severity: 'medium',
        mitigation: 'You will be prompted to solve it if needed'
      });
    }
    
    return challenges;
  };

  // Generate next steps suggestions after task completion
  const generateNextSteps = (outputData: any, taskStatus: string, taskDescription?: string): NextStep[] => {
    if (taskStatus !== 'completed' && taskStatus !== 'failed') return [];
    
    const steps: NextStep[] = [];
    
    if (taskStatus === 'completed') {
      steps.push({
        id: 'rerun',
        title: 'Run Again',
        description: 'Execute the same task again',
        action: 'rerun',
        prompt: taskDescription
      });
      
      if (outputData?.extracted_data) {
        steps.push({
          id: 'export-data',
          title: 'Export Data',
          description: 'Download the extracted data as JSON',
          action: 'export'
        });
      }
      
      steps.push({
        id: 'modify',
        title: 'Modify & Retry',
        description: 'Adjust the task and run a variation',
        action: 'modify',
        prompt: taskDescription
      });
    }
    
    if (taskStatus === 'failed') {
      steps.push({
        id: 'retry',
        title: 'Retry Task',
        description: 'Try running the task again',
        action: 'rerun',
        prompt: taskDescription
      });
      
      steps.push({
        id: 'simplify',
        title: 'Simplify Task',
        description: 'Break down the task into smaller steps',
        action: 'new'
      });
    }
    
    return steps;
  };

  // Build process report from task data
  const buildProcessReport = (
    data: any, 
    outputData: any, 
    steps: any[], 
    taskDescription?: string
  ): ProcessReport | undefined => {
    if (!data.completed_at && data.status !== 'failed' && data.status !== 'stopped') {
      return undefined;
    }
    
    const startTime = data.started_at ? new Date(data.started_at).getTime() : Date.now();
    const endTime = data.completed_at ? new Date(data.completed_at).getTime() : Date.now();
    
    return {
      taskId: data.id,
      taskDescription: taskDescription || outputData?.task || 'Browser automation task',
      startedAt: data.started_at || new Date().toISOString(),
      completedAt: data.completed_at,
      status: data.status as 'completed' | 'failed' | 'stopped',
      totalDuration: Math.round((endTime - startTime) / 1000),
      steps: steps.map((step: any, index: number) => ({
        id: `step-${index}`,
        timestamp: step.timestamp || new Date().toISOString(),
        action: step.action || step.type || step.description || `Step ${index + 1}`,
        details: step.details || step.target,
        status: step.status === 'failed' ? 'failed' : 'completed',
        duration: step.duration
      })),
      summary: outputData?.output,
      errors: data.error_message ? [data.error_message] : undefined
    };
  };

  // Map database status to enhanced status
  const mapToEnhancedStatus = (dbStatus: string, outputData: any): TaskStatus => {
    if (dbStatus === 'pending') {
      if (outputData?.is_planning) return 'planning';
      if (outputData?.steps?.length === 0 || !outputData?.steps) return 'analyzing';
      return 'pending';
    }
    if (dbStatus === 'running') {
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

  // Shared helper to build BrowserTask from a DB row
  const buildBrowserTaskFromRow = (data: any): BrowserTask => {
    const outputData = data.output_data as any;
    const steps = outputData?.actions || [];
    const enhancedStatus = mapToEnhancedStatus(data.status, outputData);
    const currentPhase = getCurrentPhase(steps, data.status);
    const intervention = getInterventionReason(outputData);
    const deliverables = parseDeliverables(outputData, data.screenshots || undefined);
    const plannedSteps = parsePlannedSteps(outputData, steps);
    const todoItems = parseTodoItems(outputData, steps);
    const currentPlanStepId = plannedSteps.find(s => s.status === 'current')?.id;
    const siteKnowledge = extractSiteKnowledge(outputData, outputData?.live_url);
    const inputData = data.input_data as any;
    const taskDescription = inputData?.task || outputData?.task;
    const challenges = parseChallenges(outputData);
    const nextSteps = generateNextSteps(outputData, data.status, taskDescription);
    const processReport = buildProcessReport(data, outputData, steps, taskDescription);
    const startTime = data.started_at ? new Date(data.started_at).getTime() : Date.now();
    const endTime = data.completed_at ? new Date(data.completed_at).getTime() : Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    return {
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
        ? intervention.reason : undefined,
      interventionMessage: (enhancedStatus === 'paused' || enhancedStatus === 'awaiting_input')
        ? intervention.message : undefined,
      interventionType: (enhancedStatus === 'paused' || enhancedStatus === 'awaiting_input')
        ? 'ask' : undefined,
      currentPhase,
      deliverables,
      extractedData: outputData?.extracted_data,
      taskSummary: outputData?.output,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      duration,
      plannedSteps,
      currentPlanStepId,
      todoItems,
      isPlanning: outputData?.is_planning || false,
      siteKnowledge: siteKnowledge ? [siteKnowledge] : undefined,
      taskDescription,
      challenges,
      nextSteps,
      processReport
    };
  };

  // Realtime subscription for task updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`tasks-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const data = payload.new as any;
          if (!currentTaskIdRef.current || data.id !== currentTaskIdRef.current) return;

          const task = buildBrowserTaskFromRow(data);
          setCurrentTask(task);

          // Handle terminal states
          if (data.status === 'completed' || data.status === 'failed' || data.status === 'stopped') {
            setIsExecuting(false);

            if (data.status === 'completed') {
              toast({ title: 'Task Completed', description: 'Browser automation finished successfully' });
            } else if (data.status === 'failed') {
              toast({ title: 'Task Failed', description: data.error_message || 'Browser automation failed', variant: 'destructive' });
            } else if (data.status === 'stopped') {
              toast({ title: 'Task Stopped', description: 'Browser automation was stopped by user' });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Polling — checks Browser Use API for task status updates
  useEffect(() => {
    if (!isExecuting || !activePollingTaskId) return;

    const pollInterval = setInterval(async () => {
      const taskId = activePollingTaskId;
      if (!taskId) {
        clearInterval(pollInterval);
        return;
      }

      try {
        const response = await supabase.functions.invoke('poll-browser-task', {
          body: { taskId },
        });

        if (response.error) {
          console.error('[POLL] Edge function error:', response.error);
          return;
        }

        // Re-read the fresh row from DB after the edge function updates it
        const { data: freshRow, error: fetchError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (fetchError || !freshRow) return;

        const task = buildBrowserTaskFromRow(freshRow);
        setCurrentTask(task);

        if (freshRow.status === 'completed' || freshRow.status === 'failed' || freshRow.status === 'stopped') {
          setIsExecuting(false);
          setActivePollingTaskId(null);
          clearInterval(pollInterval);

          if (freshRow.status === 'completed') {
            toast({ title: 'Task Completed', description: 'Browser automation finished successfully' });
          } else if (freshRow.status === 'failed') {
            toast({ title: 'Task Failed', description: freshRow.error_message || 'Browser automation failed', variant: 'destructive' });
          } else if (freshRow.status === 'stopped') {
            const stoppedByUser = freshRow.error_message === 'Task stopped by user';
            toast({ 
              title: 'Task Stopped', 
              description: stoppedByUser 
                ? 'Browser automation was stopped by user' 
                : 'Browser session ended — the agent may have completed or timed out'
            });
          }
        }
      } catch (err) {
        console.error('[POLL] Error polling task status:', err);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isExecuting, activePollingTaskId]);

  const executeTask = useCallback(
    async (task: string, projectId?: string, profileId?: string) => {
      if (!user) return;

      if (!canRunBrowserTask()) return;

      setIsExecuting(true);
      setCurrentTask({ 
        id: '', 
        status: 'analyzing',
        currentPhase: 'analyzing',
        startedAt: new Date().toISOString()
      });
      currentTaskIdRef.current = null;

      try {
        const response = await supabase.functions.invoke('browser-task', {
          body: { task, projectId, profileId },
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const taskData = response.data;
        currentTaskIdRef.current = taskData.taskId;
        setActivePollingTaskId(taskData.taskId);

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

        return taskData.taskId;
      } catch (error: any) {
        console.error('Error executing browser task:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to execute browser task',
          variant: 'destructive',
        });
        setIsExecuting(false);
        setActivePollingTaskId(null);
        setCurrentTask(null);
        currentTaskIdRef.current = null;
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
