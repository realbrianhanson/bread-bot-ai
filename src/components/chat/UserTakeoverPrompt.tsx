import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MousePointer2, Globe, Keyboard, X, Loader2 } from 'lucide-react';

export type TakeoverType = 'browser' | 'input' | 'none';

interface UserTakeoverPromptProps {
  suggestedAction: TakeoverType;
  message?: string;
  taskId?: string;
  onAcceptTakeover?: (taskId: string) => void;
  onDecline?: () => void;
  isAccepting?: boolean;
}

const getTakeoverConfig = (type: TakeoverType) => {
  switch (type) {
    case 'browser':
      return {
        icon: Globe,
        title: 'Browser Control Suggested',
        description: 'The agent suggests you take control of the browser to complete this action.',
        buttonText: 'Take Control',
        color: 'bg-purple-500/10 border-purple-500/30'
      };
    case 'input':
      return {
        icon: Keyboard,
        title: 'Input Required',
        description: 'The agent needs you to provide some input or perform a specific action.',
        buttonText: 'Provide Input',
        color: 'bg-blue-500/10 border-blue-500/30'
      };
    default:
      return {
        icon: MousePointer2,
        title: 'Action Suggested',
        description: 'The agent suggests a manual action.',
        buttonText: 'Take Action',
        color: 'bg-muted/50 border-border/50'
      };
  }
};

const UserTakeoverPrompt = ({
  suggestedAction,
  message,
  taskId,
  onAcceptTakeover,
  onDecline,
  isAccepting = false
}: UserTakeoverPromptProps) => {
  if (suggestedAction === 'none') return null;

  const config = getTakeoverConfig(suggestedAction);
  const Icon = config.icon;

  return (
    <Card className={`p-4 border-2 ${config.color} animate-in slide-in-from-bottom-2 duration-300`}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-background/50">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm">{config.title}</h3>
            <Badge variant="secondary" className="text-[10px]">
              Suggested
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {message || config.description}
          </p>
        </div>

        {onDecline && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onDecline}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {taskId && onAcceptTakeover && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-border/30">
          <Button
            onClick={() => onAcceptTakeover(taskId)}
            disabled={isAccepting}
            className="flex-1"
            size="sm"
          >
            {isAccepting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                <Icon className="h-4 w-4 mr-2" />
                {config.buttonText}
              </>
            )}
          </Button>
          {onDecline && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDecline}
            >
              Continue Automatically
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

export default UserTakeoverPrompt;
