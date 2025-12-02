import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Monitor, Loader2, Square, Pause, Play } from 'lucide-react';
import BrowserPreview from './BrowserPreview';
import StepTimeline from './StepTimeline';
import { BrowserStep } from '@/hooks/useBrowserTask';

interface LiveBrowserViewProps {
  liveUrl?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped' | 'paused';
  screenshots?: string[];
  actions?: Array<{ type: string; timestamp: string; [key: string]: any }>;
  steps?: BrowserStep[];
  taskId?: string;
  onStopTask?: (taskId: string) => void;
  onPauseTask?: (taskId: string) => void;
  onResumeTask?: (taskId: string) => void;
  isStopping?: boolean;
  isPausing?: boolean;
  isResuming?: boolean;
  requiresLogin?: boolean;
  loginUrl?: string;
  loginSite?: string;
}

const LiveBrowserView = ({ 
  liveUrl, 
  status, 
  screenshots, 
  actions, 
  steps = [],
  taskId,
  onStopTask,
  onPauseTask,
  onResumeTask,
  isStopping = false,
  isPausing = false,
  isResuming = false,
  requiresLogin = false,
  loginUrl,
  loginSite
}: LiveBrowserViewProps) => {
  // Show paused state with login required
  if (status === 'paused' && liveUrl) {
    const isLoginRequired = requiresLogin;
    const displaySite = loginSite || 'this website';
    
    return (
      <div className="space-y-3">
        <Card className="p-4 bg-muted/30 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="h-4 w-4 text-orange-500" />
            <h3 className="font-semibold text-sm">
              {isLoginRequired ? 'Login Required' : 'Live Browser Session - Paused'}
            </h3>
            <div className="flex items-center gap-1 ml-auto text-xs text-orange-500">
              <Pause className="h-3 w-3" />
              <span>Paused</span>
            </div>
            {taskId && onResumeTask && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onResumeTask(taskId)}
                disabled={isResuming}
                className="h-7 text-xs"
              >
                {isResuming ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Resuming...
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1 fill-current" />
                    Resume Automation
                  </>
                )}
              </Button>
            )}
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
                    Stop
                  </>
                )}
              </Button>
            )}
          </div>

          <div className={`mb-3 p-3 rounded-lg border ${
            isLoginRequired 
              ? 'bg-blue-500/10 border-blue-500/30' 
              : 'bg-orange-500/10 border-orange-500/20'
          }`}>
            {isLoginRequired ? (
              <>
                <p className="text-sm font-medium text-blue-500">
                  🔐 Login page detected at {displaySite}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  The automation has automatically paused. Please enter your credentials below, then click "Resume Automation" to continue.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-orange-500 font-medium">
                  🔐 You now have control of the browser
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Log in or complete any manual actions needed, then click "Resume Automation" to continue.
                </p>
              </>
            )}
          </div>
          
          <div className="relative bg-black rounded-lg overflow-hidden border border-border/50">
            <iframe 
              src={liveUrl}
              className="w-full h-[500px]"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
              allow="clipboard-write; clipboard-read"
              title="Live Browser Automation"
            />
          </div>
        </Card>

        <StepTimeline steps={steps} isRunning={false} />
      </div>
    );
  }

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
            {taskId && onPauseTask && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onPauseTask(taskId)}
                disabled={isPausing}
                className="h-7 text-xs"
              >
                {isPausing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Pausing...
                  </>
                ) : (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    Take Over
                  </>
                )}
              </Button>
            )}
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
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
              allow="clipboard-write; clipboard-read"
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

  // Fall back to screenshots after completion, failure, stop, or pause without live URL
  if (status === 'completed' || status === 'failed' || status === 'stopped' || (status === 'paused' && !liveUrl)) {
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
