import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  CheckCircle, 
  Info, 
  AlertCircle,
  X,
  Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';

export type NotifyLevel = 'info' | 'success' | 'warning' | 'progress';

interface NotifyMessageProps {
  id: string;
  level: NotifyLevel;
  message: string;
  timestamp?: string;
  attachments?: string[];
  autoHideAfter?: number;
  onDismiss?: (id: string) => void;
}

const getNotifyConfig = (level: NotifyLevel) => {
  switch (level) {
    case 'success':
      return {
        icon: CheckCircle,
        color: 'bg-green-500/10 border-green-500/20 text-green-600',
        iconColor: 'text-green-500'
      };
    case 'warning':
      return {
        icon: AlertCircle,
        color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600',
        iconColor: 'text-yellow-500'
      };
    case 'progress':
      return {
        icon: Clock,
        color: 'bg-blue-500/10 border-blue-500/20 text-blue-600',
        iconColor: 'text-blue-500'
      };
    case 'info':
    default:
      return {
        icon: Info,
        color: 'bg-muted/50 border-border/30 text-muted-foreground',
        iconColor: 'text-muted-foreground'
      };
  }
};

const NotifyMessage = ({
  id,
  level,
  message,
  timestamp,
  attachments,
  autoHideAfter,
  onDismiss
}: NotifyMessageProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const config = getNotifyConfig(level);
  const Icon = config.icon;

  useEffect(() => {
    if (autoHideAfter && autoHideAfter > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.(id);
      }, autoHideAfter);
      return () => clearTimeout(timer);
    }
  }, [autoHideAfter, id, onDismiss]);

  if (!isVisible) return null;

  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200">
      <Card className={`px-3 py-2 max-w-[85%] ${config.color} border`}>
        <div className="flex items-start gap-2">
          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.iconColor}`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {level === 'progress' ? 'Progress' : 'Notification'}
              </Badge>
              {timestamp && (
                <span className="text-[10px] text-muted-foreground">
                  {new Date(timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
            
            <p className="text-sm">{message}</p>
            
            {attachments && attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {attachments.map((attachment, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    📎 {attachment}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 shrink-0"
              onClick={() => {
                setIsVisible(false);
                onDismiss(id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default NotifyMessage;
