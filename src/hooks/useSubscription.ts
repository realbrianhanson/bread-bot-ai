import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function useSubscription() {
  const { 
    tier, 
    subscribed, 
    subscriptionEnd,
    canUseOwnKeys,
    chatMessagesUsed,
    browserTasksUsed,
    chatMessagesLimit,
    browserTasksLimit,
    codeExecutionsUsed,
    codeExecutionsLimit,
    refreshSubscription
  } = useAuth();

  const canSendMessage = () => {
    if (chatMessagesUsed >= chatMessagesLimit) {
      toast({
        title: "Message Limit Reached",
        description: `You've used all ${chatMessagesLimit} messages this month. Upgrade to continue.`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const canRunBrowserTask = () => {
    if (browserTasksUsed >= browserTasksLimit) {
      toast({
        title: "Browser Task Limit Reached",
        description: `You've used all ${browserTasksLimit} browser tasks this month. Upgrade to continue.`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const canRunCodeExecution = () => {
    if (codeExecutionsUsed >= codeExecutionsLimit) {
      toast({
        title: "Code Execution Limit Reached",
        description: `You've used all ${codeExecutionsLimit} code executions this month. Upgrade to continue.`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const getRemainingMessages = () => chatMessagesLimit - chatMessagesUsed;
  const getRemainingTasks = () => browserTasksLimit - browserTasksUsed;
  const getRemainingCodeExecutions = () => codeExecutionsLimit - codeExecutionsUsed;
  
  const getUsagePercentage = (used: number, limit: number) => {
    // -1 is the unlimited sentinel; treat as 0% used.
    if (limit === -1) return 0;
    if (!limit || limit <= 0) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  return {
    tier,
    subscribed,
    subscriptionEnd,
    canUseOwnKeys,
    chatMessagesUsed,
    browserTasksUsed,
    chatMessagesLimit,
    browserTasksLimit,
    codeExecutionsUsed,
    codeExecutionsLimit,
    canSendMessage,
    canRunBrowserTask,
    canRunCodeExecution,
    getRemainingMessages,
    getRemainingTasks,
    getRemainingCodeExecutions,
    getUsagePercentage,
    refreshSubscription,
  };
}
