import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";
import { toast } from "sonner";

interface FeatureCheck {
  featureId: string;
  requiredBalance?: number;
}

interface TrackUsage {
  featureId: string;
  value?: number;
  idempotencyKey?: string;
}

export const useFeatureGating = () => {
  const { 
    tier, 
    subscribed, 
    chatMessagesUsed, 
    chatMessagesLimit, 
    browserTasksUsed, 
    browserTasksLimit,
    refreshSubscription 
  } = useAuth();

  const getFeatureBalance = useCallback((featureId: string) => {
    switch (featureId) {
      case 'chat_messages':
        return {
          usage: chatMessagesUsed,
          limit: chatMessagesLimit,
          balance: chatMessagesLimit - chatMessagesUsed,
          unlimited: chatMessagesLimit === -1
        };
      case 'browser_tasks':
        return {
          usage: browserTasksUsed,
          limit: browserTasksLimit,
          balance: browserTasksLimit - browserTasksUsed,
          unlimited: browserTasksLimit === -1
        };
      default:
        return { usage: 0, limit: 0, balance: 0, unlimited: false };
    }
  }, [chatMessagesUsed, chatMessagesLimit, browserTasksUsed, browserTasksLimit]);

  const check = useCallback(({ featureId, requiredBalance = 1 }: FeatureCheck): boolean => {
    const feature = getFeatureBalance(featureId);
    
    if (feature.unlimited) return true;
    return feature.balance >= requiredBalance;
  }, [getFeatureBalance]);

  const allowed = useCallback(({ featureId, requiredBalance = 1 }: FeatureCheck): boolean => {
    return check({ featureId, requiredBalance });
  }, [check]);

  const requireFeature = useCallback(({ featureId, requiredBalance = 1 }: FeatureCheck): boolean => {
    const isAllowed = check({ featureId, requiredBalance });
    
    if (!isAllowed) {
      toast.error(`You've reached your ${featureId.replace('_', ' ')} limit. Please upgrade your plan.`);
    }
    
    return isAllowed;
  }, [check]);

  const track = useCallback(async ({ featureId, value = 1 }: TrackUsage) => {
    // Usage is tracked server-side, this triggers a refresh
    await refreshSubscription();
  }, [refreshSubscription]);

  const refetch = useCallback(async () => {
    await refreshSubscription();
  }, [refreshSubscription]);

  return {
    tier,
    subscribed,
    check,
    allowed,
    requireFeature,
    track,
    refetch,
    getFeatureBalance
  };
};
