import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { MessageSquare, Globe, Hammer, Infinity } from "lucide-react";

interface UsageIndicatorProps {
  featureId: "chat_messages" | "browser_tasks" | "app_builds";
  className?: string;
  showLabel?: boolean;
  showIcon?: boolean;
  compact?: boolean;
}

const featureConfig = {
  chat_messages: {
    label: "Chat Messages",
    icon: MessageSquare
  },
  browser_tasks: {
    label: "Browser Tasks",
    icon: Globe
  },
  app_builds: {
    label: "App Builds",
    icon: Hammer
  }
};

export const UsageIndicator = ({ 
  featureId, 
  className,
  showLabel = true,
  showIcon = true,
  compact = false
}: UsageIndicatorProps) => {
  const { 
    chatMessagesUsed, 
    chatMessagesLimit, 
    browserTasksUsed, 
    browserTasksLimit,
    appBuildsUsed,
    appBuildsLimit,
    loading 
  } = useAuth();

  const usage =
    featureId === 'chat_messages' ? chatMessagesUsed
    : featureId === 'browser_tasks' ? browserTasksUsed
    : appBuildsUsed;
  const limit =
    featureId === 'chat_messages' ? chatMessagesLimit
    : featureId === 'browser_tasks' ? browserTasksLimit
    : appBuildsLimit;
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((usage / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && percentage >= 100;

  const config = featureConfig[featureId];
  const Icon = config.icon;

  if (loading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-4 bg-muted rounded w-20" />
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs", className)}>
        {showIcon && <Icon className="w-3 h-3 text-muted-foreground" />}
        <span className={cn(
          "font-medium",
          isAtLimit && "text-destructive",
          isNearLimit && !isAtLimit && "text-yellow-500"
        )}>
          {isUnlimited ? (
            <Infinity className="w-3 h-3 inline" />
          ) : (
            `${usage}/${limit}`
          )}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {showIcon && <Icon className="w-4 h-4 text-muted-foreground" />}
          {showLabel && <span className="text-muted-foreground">{config.label}</span>}
        </div>
        <span className={cn(
          "font-medium",
          isAtLimit && "text-destructive",
          isNearLimit && !isAtLimit && "text-yellow-500"
        )}>
          {isUnlimited ? (
            <span className="flex items-center gap-1">
              <Infinity className="w-4 h-4" /> Unlimited
            </span>
          ) : (
            `${usage} / ${limit}`
          )}
        </span>
      </div>
      {!isUnlimited && (
        <Progress 
          value={percentage} 
          className={cn(
            "h-2",
            isAtLimit && "[&>div]:bg-destructive",
            isNearLimit && !isAtLimit && "[&>div]:bg-yellow-500"
          )}
        />
      )}
    </div>
  );
};

export const UsageOverview = ({ className }: { className?: string }) => {
  return (
    <div className={cn("space-y-4", className)}>
      <UsageIndicator featureId="chat_messages" />
      <UsageIndicator featureId="browser_tasks" />
      <UsageIndicator featureId="app_builds" />
    </div>
  );
};
