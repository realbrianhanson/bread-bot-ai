import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface TaskStatusProps {
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
}

const TaskStatus: React.FC<TaskStatusProps> = ({ status, message }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'failed':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'running':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
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
      default:
        return null;
    }
  };

  return (
    <Card className={`p-3 border ${getStatusColor()}`}>
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <Badge variant="outline" className="text-xs capitalize">
            {status}
          </Badge>
          {message && <p className="text-xs mt-1 text-muted-foreground">{message}</p>}
        </div>
      </div>
      {status === 'running' && (
        <Progress value={undefined} className="mt-2 h-1" />
      )}
    </Card>
  );
};

export default TaskStatus;