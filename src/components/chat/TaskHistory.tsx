import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Loader2 } from 'lucide-react';
import { useTaskHistory } from '@/hooks/useTaskHistory';
import TaskHistoryCard from './TaskHistoryCard';

interface TaskHistoryProps {
  onRerunTask?: (taskDescription: string) => void;
}

const TaskHistory = ({ onRerunTask }: TaskHistoryProps) => {
  const { tasks, isLoading, error } = useTaskHistory();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          Task History
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Browser Automation History</SheetTitle>
          <SheetDescription>
            View past tasks, see results, and re-run previous automations
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive">Failed to load task history: {error}</p>
            </div>
          )}

          {!isLoading && !error && tasks.length === 0 && (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No browser automation tasks yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Start a task to see it here
              </p>
            </div>
          )}

          {!isLoading && !error && tasks.length > 0 && (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-3 pr-4">
                {tasks.map((task) => (
                  <TaskHistoryCard
                    key={task.id}
                    task={task}
                    onRerun={onRerunTask}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskHistory;
