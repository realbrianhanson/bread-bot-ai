import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, PlayCircle, CheckCircle, XCircle, StopCircle } from 'lucide-react';
import { TaskHistoryItem } from '@/hooks/useTaskHistory';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface TaskHistoryCardProps {
  task: TaskHistoryItem;
  onRerun?: (taskDescription: string) => void;
}

const TaskHistoryCard = ({ task, onRerun }: TaskHistoryCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'stopped':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'running':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'failed':
        return <XCircle className="h-3 w-3" />;
      case 'stopped':
        return <StopCircle className="h-3 w-3" />;
      case 'running':
        return <PlayCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const taskDescription = task.input_data?.task || 'Browser automation task';
  const firstScreenshot = task.screenshots?.[0];

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="p-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <div className="flex items-start gap-3">
            {firstScreenshot && (
              <img 
                src={firstScreenshot} 
                alt="Task preview" 
                className="w-16 h-16 object-cover rounded border border-border flex-shrink-0"
              />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={getStatusColor(task.status)}>
                  {getStatusIcon(task.status)}
                  <span className="ml-1 capitalize">{task.status}</span>
                </Badge>
              </div>
              
              <p className="text-sm font-medium line-clamp-2 mb-1">
                {taskDescription}
              </p>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{new Date(task.created_at).toLocaleString()}</span>
              </div>
            </div>

            {onRerun && task.status === 'completed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRerun(taskDescription);
                }}
                className="h-7 text-xs"
              >
                <PlayCircle className="h-3 w-3 mr-1" />
                Re-run
              </Button>
            )}
          </div>
        </CardHeader>

        <CollapsibleTrigger className="w-full" />
        
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0">
            {task.error_message && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-3">
                <p className="text-xs text-destructive">{task.error_message}</p>
              </div>
            )}

            {task.screenshots && task.screenshots.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Screenshots ({task.screenshots.length})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {task.screenshots.map((screenshot, index) => (
                    <img
                      key={index}
                      src={screenshot}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-32 object-cover rounded border border-border"
                    />
                  ))}
                </div>
              </div>
            )}

            {task.output_data?.actions && task.output_data.actions.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Actions Performed ({task.output_data.actions.length})
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {task.output_data.actions.slice(0, 5).map((action: any, index: number) => (
                    <div key={index} className="text-xs bg-muted/30 rounded px-2 py-1">
                      <span className="font-medium">{action.type}</span>
                      {action.description && (
                        <span className="text-muted-foreground ml-2">- {action.description}</span>
                      )}
                    </div>
                  ))}
                  {task.output_data.actions.length > 5 && (
                    <p className="text-xs text-muted-foreground italic">
                      +{task.output_data.actions.length - 5} more actions
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default TaskHistoryCard;
