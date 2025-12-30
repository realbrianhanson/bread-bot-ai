import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LogIn, 
  ShieldCheck, 
  AlertTriangle, 
  WrenchIcon, 
  Hand,
  Play,
  Square,
  Loader2
} from 'lucide-react';
import { InterventionReason } from '@/hooks/useBrowserTask';

interface InterventionPromptProps {
  reason: InterventionReason;
  message?: string;
  loginSite?: string;
  taskId?: string;
  onResume?: (taskId: string) => void;
  onStop?: (taskId: string) => void;
  isResuming?: boolean;
  isStopping?: boolean;
}

const getInterventionConfig = (reason: InterventionReason) => {
  switch (reason) {
    case 'login_required':
      return {
        icon: LogIn,
        title: 'Login Required',
        color: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
        iconColor: 'text-blue-500',
        defaultMessage: 'Please log in to continue with the automation.'
      };
    case 'captcha_detected':
      return {
        icon: ShieldCheck,
        title: 'CAPTCHA Detected',
        color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
        iconColor: 'text-yellow-500',
        defaultMessage: 'A CAPTCHA verification is required. Please solve it to continue.'
      };
    case 'confirmation_needed':
      return {
        icon: AlertTriangle,
        title: 'Confirmation Needed',
        color: 'bg-orange-500/10 border-orange-500/30 text-orange-500',
        iconColor: 'text-orange-500',
        defaultMessage: 'The automation needs your confirmation before proceeding.'
      };
    case 'error_recovery':
      return {
        icon: WrenchIcon,
        title: 'Help Needed',
        color: 'bg-red-500/10 border-red-500/30 text-red-500',
        iconColor: 'text-red-500',
        defaultMessage: 'An issue occurred. Please help resolve it to continue.'
      };
    case 'user_requested':
    default:
      return {
        icon: Hand,
        title: 'Manual Control',
        color: 'bg-purple-500/10 border-purple-500/30 text-purple-500',
        iconColor: 'text-purple-500',
        defaultMessage: 'You now have control of the browser session.'
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
  isStopping = false
}: InterventionPromptProps) => {
  const config = getInterventionConfig(reason);
  const Icon = config.icon;
  const displayMessage = message || config.defaultMessage;

  return (
    <Card className={`p-4 border-2 ${config.color}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full bg-background/50 ${config.iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">{config.title}</h3>
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
