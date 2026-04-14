import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  StopCircle, 
  Pause, 
  Brain, 
  Search, 
  Hand,
  Clock,
  Zap,
  Eye
} from 'lucide-react';
import { TaskStatus as TaskStatusType } from '@/hooks/useBrowserTask';

interface TaskStatusProps {
  status: TaskStatusType;
  message?: string;
  currentPhase?: 'analyzing' | 'executing' | 'observing' | 'completed' | 'waiting';
  duration?: number;
}

const TaskStatus = ({ status, message, currentPhase, duration }: TaskStatusProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'failed':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'running':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'stopped':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'paused':
      case 'awaiting_input':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'analyzing':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'gathering_info':
        return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      case 'standby':
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-border/20';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'stopped':
        return <StopCircle className="h-4 w-4" />;
      case 'paused':
        return <Pause className="h-4 w-4" />;
      case 'awaiting_input':
        return <Hand className="h-4 w-4 animate-pulse" />;
      case 'analyzing':
        return <Brain className="h-4 w-4 animate-pulse" />;
      case 'gathering_info':
        return <Search className="h-4 w-4 animate-pulse" />;
      case 'standby':
        return <Clock className="h-4 w-4" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'analyzing':
        return 'Analyzing Task';
      case 'gathering_info':
        return 'Gathering Information';
      case 'awaiting_input':
        return 'Awaiting Your Input';
      case 'standby':
        return 'Standby';
      default:
        return status;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Card className={`p-3 border ${getStatusColor()}`}>
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs capitalize">
              {getStatusLabel()}
            </Badge>
            {currentPhase && status === 'running' && (
              <Badge variant="secondary" className="text-xs">
                {currentPhase === 'analyzing' && <><Brain className="h-3 w-3 inline mr-1" />Thinking</>}
                {currentPhase === 'executing' && <><Zap className="h-3 w-3 inline mr-1" />Executing</>}
                {currentPhase === 'observing' && <><Eye className="h-3 w-3 inline mr-1" />Observing</>}
              </Badge>
            )}
            {duration !== undefined && (
              <span className="text-xs text-muted-foreground ml-auto">
                {formatDuration(duration)}
              </span>
            )}
          </div>
          {message && <p className="text-xs mt-1 text-muted-foreground">{message}</p>}
        </div>
      </div>
      {(status === 'running' || status === 'analyzing' || status === 'gathering_info') && (
        <Progress value={undefined} className="mt-2 h-1" />
      )}
    </Card>
  );
};

export default TaskStatus;
