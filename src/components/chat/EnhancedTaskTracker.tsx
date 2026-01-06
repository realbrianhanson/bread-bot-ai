import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Plus,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export type TaskItemStatus = 'todo' | 'in_progress' | 'done' | 'blocked' | 'skipped';

export interface TaskNote {
  id: string;
  text: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: TaskItemStatus;
  notes: TaskNote[];
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  progress?: number;
  subtasks?: TaskItem[];
}

interface EnhancedTaskTrackerProps {
  tasks: TaskItem[];
  onUpdateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  onAddNote: (taskId: string, note: string, type?: TaskNote['type']) => void;
  onAddTask?: (task: Omit<TaskItem, 'id' | 'notes' | 'createdAt'>) => void;
  compact?: boolean;
  showAddTask?: boolean;
}

const statusConfig: Record<TaskItemStatus, { 
  icon: React.ReactNode; 
  color: string; 
  label: string;
  bgColor: string;
}> = {
  todo: {
    icon: <Circle className="h-4 w-4" />,
    color: 'text-muted-foreground',
    label: 'To Do',
    bgColor: 'bg-muted/50',
  },
  in_progress: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    color: 'text-blue-500',
    label: 'In Progress',
    bgColor: 'bg-blue-500/10',
  },
  done: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-green-500',
    label: 'Done',
    bgColor: 'bg-green-500/10',
  },
  blocked: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-red-500',
    label: 'Blocked',
    bgColor: 'bg-red-500/10',
  },
  skipped: {
    icon: <RotateCcw className="h-4 w-4" />,
    color: 'text-yellow-500',
    label: 'Skipped',
    bgColor: 'bg-yellow-500/10',
  },
};

const TaskItemComponent = ({ 
  task, 
  onUpdateTask, 
  onAddNote,
  depth = 0 
}: { 
  task: TaskItem; 
  onUpdateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  onAddNote: (taskId: string, note: string, type?: TaskNote['type']) => void;
  depth?: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(task.status === 'in_progress');
  const [newNote, setNewNote] = useState('');
  const config = statusConfig[task.status];

  const handleStatusChange = (newStatus: TaskItemStatus) => {
    const updates: Partial<TaskItem> = { 
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    if (newStatus === 'done') {
      updates.completedAt = new Date().toISOString();
    }
    onUpdateTask(task.id, updates);
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(task.id, newNote.trim());
      setNewNote('');
    }
  };

  const completedSubtasks = task.subtasks?.filter(s => s.status === 'done').length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progressPercent = task.progress ?? (totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0);

  return (
    <div className={cn("rounded-lg border", config.bgColor, depth > 0 && "ml-4")}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-3">
          <div className="flex items-start gap-3">
            <button
              onClick={() => handleStatusChange(task.status === 'done' ? 'todo' : 'done')}
              className={cn("mt-0.5 transition-colors", config.color)}
            >
              {config.icon}
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  "font-medium text-sm",
                  task.status === 'done' && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </span>
                <Badge variant="outline" className={cn("text-xs", config.color)}>
                  {config.label}
                </Badge>
              </div>
              
              {task.description && (
                <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
              )}

              {(totalSubtasks > 0 || task.progress !== undefined) && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-1.5" />
                </div>
              )}
            </div>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            {/* Status Actions */}
            <div className="flex flex-wrap gap-1">
              {Object.entries(statusConfig).map(([status, cfg]) => (
                <Button
                  key={status}
                  variant={task.status === status ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleStatusChange(status as TaskItemStatus)}
                >
                  {cfg.label}
                </Button>
              ))}
            </div>

            {/* Notes */}
            {task.notes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Notes ({task.notes.length})
                </h4>
                <ScrollArea className="max-h-32">
                  <div className="space-y-1.5">
                    {task.notes.map((note) => (
                      <div 
                        key={note.id} 
                        className={cn(
                          "text-xs p-2 rounded",
                          note.type === 'error' && "bg-red-500/10 text-red-700 dark:text-red-300",
                          note.type === 'warning' && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
                          note.type === 'success' && "bg-green-500/10 text-green-700 dark:text-green-300",
                          note.type === 'info' && "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                        )}
                      >
                        {note.text}
                        <span className="block text-[10px] opacity-60 mt-0.5">
                          {new Date(note.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Add Note */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="min-h-[60px] text-xs resize-none"
              />
              <Button 
                size="sm" 
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Subtasks */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">
                  Subtasks ({completedSubtasks}/{totalSubtasks})
                </h4>
                <div className="space-y-2">
                  {task.subtasks.map((subtask) => (
                    <TaskItemComponent
                      key={subtask.id}
                      task={subtask}
                      onUpdateTask={onUpdateTask}
                      onAddNote={onAddNote}
                      depth={depth + 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

const EnhancedTaskTracker = ({ 
  tasks, 
  onUpdateTask, 
  onAddNote,
  onAddTask,
  compact = false,
  showAddTask = false
}: EnhancedTaskTrackerProps) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const overallProgress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  const handleAddTask = () => {
    if (newTaskTitle.trim() && onAddTask) {
      onAddTask({
        title: newTaskTitle.trim(),
        status: 'todo',
      });
      setNewTaskTitle('');
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {completedTasks}/{tasks.length} tasks
          </span>
          <Badge variant="outline">{Math.round(overallProgress)}%</Badge>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Task Progress
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {inProgressTasks > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                {inProgressTasks} active
              </Badge>
            )}
            <span>{completedTasks}/{tasks.length}</span>
          </div>
        </div>
        <Progress value={overallProgress} className="h-2 mt-2" />
      </CardHeader>

      <CardContent className="space-y-3">
        {showAddTask && onAddTask && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a new task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              className="flex-1 text-sm px-3 py-2 rounded-md border bg-background"
            />
            <Button size="sm" onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2 pr-2">
            {tasks.map((task) => (
              <TaskItemComponent
                key={task.id}
                task={task}
                onUpdateTask={onUpdateTask}
                onAddNote={onAddNote}
              />
            ))}
          </div>
        </ScrollArea>

        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No tasks yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedTaskTracker;
