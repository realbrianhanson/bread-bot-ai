import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LogIn, 
  ShieldCheck, 
  AlertTriangle, 
  WrenchIcon, 
  Hand,
  Play,
  Square,
  Loader2,
  Info,
  Bell,
  X
} from 'lucide-react';
import { InterventionReason } from '@/hooks/useBrowserTask';
import { useState, useEffect } from 'react';

// Intervention type: notify (info only, can dismiss) vs ask (requires action)
export type InterventionType = 'notify' | 'ask';

interface InterventionPromptProps {
  reason: InterventionReason;
  message?: string;
  loginSite?: string;
  taskId?: string;
  onResume?: (taskId: string) => void;
  onStop?: (taskId: string) => void;
  isResuming?: boolean;
  isStopping?: boolean;
  // Tiered intervention props
  interventionType?: InterventionType;
  onDismiss?: () => void;
  autoHideAfter?: number; // milliseconds to auto-hide notify type
}

const getInterventionConfig = (reason: InterventionReason, type: InterventionType = 'ask') => {
  // For notify type, use softer colors
  const isNotify = type === 'notify';
  
  switch (reason) {
    case 'login_required':
      return {
        icon: LogIn,
        title: 'Login Required',
        color: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
        iconColor: 'text-blue-500',
        defaultMessage: 'Please log in to continue with the automation.',
        interventionLevel: 'ask' as const
      };
    case 'captcha_detected':
      return {
        icon: ShieldCheck,
        title: 'CAPTCHA Detected',
        color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
        iconColor: 'text-yellow-500',
        defaultMessage: 'A CAPTCHA verification is required. Please solve it to continue.',
        interventionLevel: 'ask' as const
      };
    case 'confirmation_needed':
      return {
        icon: AlertTriangle,
        title: 'Confirmation Needed',
        color: 'bg-orange-500/10 border-orange-500/30 text-orange-500',
        iconColor: 'text-orange-500',
        defaultMessage: 'The automation needs your confirmation before proceeding.',
        interventionLevel: 'ask' as const
      };
    case 'error_recovery':
      return {
        icon: WrenchIcon,
        title: 'Help Needed',
        color: 'bg-red-500/10 border-red-500/30 text-red-500',
        iconColor: 'text-red-500',
        defaultMessage: 'An issue occurred. Please help resolve it to continue.',
        interventionLevel: 'ask' as const
      };
    case 'user_requested':
    default:
      return {
        icon: isNotify ? Info : Hand,
        title: isNotify ? 'Status Update' : 'Manual Control',
        color: isNotify 
          ? 'bg-muted/50 border-border/50 text-muted-foreground' 
          : 'bg-purple-500/10 border-purple-500/30 text-purple-500',
        iconColor: isNotify ? 'text-muted-foreground' : 'text-purple-500',
        defaultMessage: isNotify 
          ? 'Task update: automation is proceeding as planned.'
          : 'You now have control of the browser session.',
        interventionLevel: type
      };
  }
};

const InterventionPrompt = ({ 
  reason, 
  message, 
  loginSite,
  taskId,
  onResume,
  onStop,
  isResuming = false,
  isStopping = false,
  interventionType = 'ask',
  onDismiss,
  autoHideAfter
}: InterventionPromptProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const config = getInterventionConfig(reason, interventionType);
  const Icon = config.icon;
  const displayMessage = message || config.defaultMessage;
  const isNotify = interventionType === 'notify';

  // Auto-hide for notify type
  useEffect(() => {
    if (isNotify && autoHideAfter && autoHideAfter > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoHideAfter);
      return () => clearTimeout(timer);
    }
  }, [isNotify, autoHideAfter, onDismiss]);

  if (!isVisible) return null;

  // Notify type - simple info card with dismiss
  if (isNotify) {
    return (
      <Card className={`p-3 border ${config.color}`}>
        <div className="flex items-start gap-3">
          <Bell className={`h-4 w-4 mt-0.5 ${config.iconColor}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Notification
              </span>
              <Badge variant="outline" className="text-[10px]">
                Info Only
              </Badge>
            </div>
            <p className="text-sm text-foreground mt-1">{displayMessage}</p>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                setIsVisible(false);
                onDismiss();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Ask type - full intervention prompt
  return (
    <Card className={`p-4 border-2 ${config.color}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full bg-background/50 ${config.iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm">{config.title}</h3>
            <Badge variant="outline" className="text-[10px] border-current">
              Action Required
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {displayMessage}
          </p>
          
          {reason === 'login_required' && loginSite && (
            <p className="text-xs text-muted-foreground/70 mt-1">
              Website: <span className="font-mono">{loginSite}</span>
            </p>
          )}

          {/* Instruction steps based on reason */}
          <div className="mt-3 space-y-1">
            {reason === 'login_required' && (
              <>
                <p className="text-xs text-muted-foreground">1. Enter your credentials in the browser below</p>
                <p className="text-xs text-muted-foreground">2. Complete any 2FA if required</p>
                <p className="text-xs text-muted-foreground">3. Click "Resume Automation" when logged in</p>
              </>
            )}
            {reason === 'captcha_detected' && (
              <>
                <p className="text-xs text-muted-foreground">1. Solve the CAPTCHA in the browser below</p>
                <p className="text-xs text-muted-foreground">2. Click "Resume Automation" when complete</p>
              </>
            )}
            {reason === 'confirmation_needed' && (
              <>
                <p className="text-xs text-muted-foreground">1. Review the action in the browser below</p>
                <p className="text-xs text-muted-foreground">2. Confirm or modify as needed</p>
                <p className="text-xs text-muted-foreground">3. Click "Resume Automation" to continue</p>
              </>
            )}
            {reason === 'error_recovery' && (
              <>
                <p className="text-xs text-muted-foreground">1. Check the error in the browser</p>
                <p className="text-xs text-muted-foreground">2. Fix the issue manually if possible</p>
                <p className="text-xs text-muted-foreground">3. Click "Resume" or "Stop" based on resolution</p>
              </>
            )}
            {reason === 'user_requested' && (
              <>
                <p className="text-xs text-muted-foreground">1. Perform any manual actions needed</p>
                <p className="text-xs text-muted-foreground">2. Click "Resume Automation" when ready</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {taskId && (onResume || onStop) && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-border/30">
          {onResume && (
            <Button
              onClick={() => onResume(taskId)}
              disabled={isResuming}
              className="flex-1"
              size="sm"
            >
              {isResuming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resuming...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2 fill-current" />
                  Resume Automation
                </>
              )}
            </Button>
          )}
          {onStop && (
            <Button
              variant="outline"
              onClick={() => onStop(taskId)}
              disabled={isStopping}
              size="sm"
            >
              {isStopping ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2 fill-current" />
                  Stop
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

export default InterventionPrompt;
