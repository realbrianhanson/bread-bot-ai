import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Monitor, Loader2, Square } from 'lucide-react';
import BrowserPreview from './BrowserPreview';
import StepTimeline from './StepTimeline';
import { BrowserStep } from '@/hooks/useBrowserTask';

interface LiveBrowserViewProps {
  liveUrl?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  screenshots?: string[];
  actions?: Array<{ type: string; timestamp: string; [key: string]: any }>;
  steps?: BrowserStep[];
  taskId?: string;
  onStopTask?: (taskId: string) => void;
  isStopping?: boolean;
}

const LiveBrowserView = ({ 
  liveUrl, 
  status, 
  screenshots, 
  actions, 
  steps = [],
  taskId,
  onStopTask,
  isStopping = false
}: LiveBrowserViewProps) => {
  // Show live browser when running and we have a live URL
  if (status === 'running' && liveUrl) {
    return (
      <div className="space-y-3">
        <Card className="p-4 bg-muted/30 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="h-4 w-4 animate-pulse text-green-500" />
            <h3 className="font-semibold text-sm">Live Browser Session</h3>
            <div className="flex items-center gap-1 ml-auto text-xs text-green-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Active</span>
            </div>
            {taskId && onStopTask && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onStopTask(taskId)}
                disabled={isStopping}
                className="h-7 text-xs"
              >
                {isStopping ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Stopping...
                  </>
                ) : (
                  <>
                    <Square className="h-3 w-3 mr-1 fill-current" />
                    Stop Task
                  </>
                )}
              </Button>
            )}
          </div>
          
          <div className="relative bg-black rounded-lg overflow-hidden border border-border/50">
            <iframe 
              src={liveUrl}
              className="w-full h-[500px]"
              allow="clipboard-write"
              title="Live Browser Automation"
            />
          </div>
        </Card>

        <StepTimeline steps={steps} isRunning={true} />
      </div>
    );
  }

  // Show loading state when pending
  if (status === 'pending') {
    return (
      <Card className="p-4 bg-muted/30 backdrop-blur-sm border-border/50">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Starting browser session...</span>
        </div>
      </Card>
    );
  }

  // Fall back to screenshots after completion, failure, or stop
  if (status === 'completed' || status === 'failed' || status === 'stopped') {
    return (
      <div className="space-y-3">
        <BrowserPreview screenshots={screenshots} actions={actions} />
        {steps.length > 0 && <StepTimeline steps={steps} isRunning={false} />}
      </div>
    );
  }

  return null;
};

export default LiveBrowserView;
