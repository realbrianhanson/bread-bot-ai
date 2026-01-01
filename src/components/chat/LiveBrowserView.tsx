import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Monitor, Loader2, Square, Pause, Play, Brain, Search } from 'lucide-react';
import BrowserPreview from './BrowserPreview';
import StepTimeline from './StepTimeline';
import TaskDeliverables from './TaskDeliverables';
import InterventionPrompt from './InterventionPrompt';
import TaskPlanningPreview from './TaskPlanningPreview';
import TodoChecklist from './TodoChecklist';
import SiteKnowledgePanel from './SiteKnowledgePanel';
import NextStepsSuggestions, { NextStep } from './NextStepsSuggestions';
import ChallengeIdentification, { Challenge } from './ChallengeIdentification';
import ProcessDocumentation, { ProcessReport } from './ProcessDocumentation';
import TaskFeedback from './TaskFeedback';
import { 
  BrowserStep, 
  TaskStatus, 
  InterventionReason, 
  InterventionType,
  TaskDeliverable, 
  StepPhase,
  PlannedStep,
  TodoItem,
  SiteKnowledge
} from '@/hooks/useBrowserTask';

interface LiveBrowserViewProps {
  liveUrl?: string;
  status: TaskStatus;
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
  interventionReason?: InterventionReason;
  interventionMessage?: string;
  interventionType?: InterventionType;
  currentPhase?: StepPhase;
  deliverables?: TaskDeliverable[];
  extractedData?: Record<string, any>;
  taskSummary?: string;
  // Planning and todo props
  plannedSteps?: PlannedStep[];
  currentPlanStepId?: number;
  todoItems?: TodoItem[];
  isPlanning?: boolean;
  siteKnowledge?: SiteKnowledge[];
  // New feature props
  nextSteps?: NextStep[];
  challenges?: Challenge[];
  processReport?: ProcessReport;
  taskDescription?: string;
  onSelectNextStep?: (step: NextStep) => void;
  onSubmitFeedback?: (feedback: { taskId: string; rating: 'positive' | 'negative' | null; stars?: number | null; comment?: string }) => void;
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
  loginSite,
  interventionReason,
  interventionMessage,
  interventionType = 'ask',
  currentPhase,
  deliverables = [],
  extractedData,
  taskSummary,
  plannedSteps = [],
  currentPlanStepId,
  todoItems = [],
  isPlanning = false,
  siteKnowledge = [],
  nextSteps = [],
  challenges = [],
  processReport,
  taskDescription,
  onSelectNextStep,
  onSubmitFeedback
}: LiveBrowserViewProps) => {

  // Show planning state
  if (status === 'planning' || isPlanning) {
    return (
      <div className="space-y-3">
        <TaskPlanningPreview steps={plannedSteps} currentStepId={currentPlanStepId} isPlanning={true} />
      </div>
    );
  }

  // Show analyzing state
  if (status === 'analyzing') {
    return (
      <Card className="p-4 bg-purple-500/10 backdrop-blur-sm border-purple-500/30">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 animate-pulse text-purple-500" />
          <div>
            <h3 className="font-semibold text-sm">Analyzing Task</h3>
            <p className="text-xs text-muted-foreground">Understanding your request and planning actions...</p>
          </div>
        </div>
      </Card>
    );
  }

  // Show gathering info state
  if (status === 'gathering_info') {
    return (
      <Card className="p-4 bg-cyan-500/10 backdrop-blur-sm border-cyan-500/30">
        <div className="flex items-center gap-3">
          <Search className="h-5 w-5 animate-pulse text-cyan-500" />
          <div>
            <h3 className="font-semibold text-sm">Gathering Information</h3>
            <p className="text-xs text-muted-foreground">Collecting data from the page...</p>
          </div>
        </div>
        {steps.length > 0 && <StepTimeline steps={steps} isRunning={true} currentPhase={currentPhase} />}
      </Card>
    );
  }

  // Show paused/awaiting_input state with intervention prompt
  if ((status === 'paused' || status === 'awaiting_input') && liveUrl) {
    const reason = interventionReason || (requiresLogin ? 'login_required' : 'user_requested');
    const message = interventionMessage || (requiresLogin 
      ? `Please log in to ${loginSite || 'the website'} to continue.`
      : 'You now have control of the browser.');
    
    return (
      <div className="space-y-3">
        <InterventionPrompt
          reason={reason}
          message={message}
          loginSite={loginSite}
          taskId={taskId}
          onResume={onResumeTask}
          onStop={onStopTask}
          isResuming={isResuming}
          isStopping={isStopping}
        />

        <Card className="p-4 bg-muted/30 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="h-4 w-4 text-orange-500" />
            <h3 className="font-semibold text-sm">Live Browser Session</h3>
            <div className="flex items-center gap-1 ml-auto text-xs text-orange-500">
              <Pause className="h-3 w-3" />
              <span>Paused</span>
            </div>
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

        <StepTimeline steps={steps} isRunning={false} currentPhase={currentPhase} />
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

        <StepTimeline steps={steps} isRunning={true} currentPhase={currentPhase} />
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

  // Show completed state with deliverables, next steps, report, and feedback
  if (status === 'completed') {
    return (
      <div className="space-y-3">
        {/* Task Deliverables */}
        {(deliverables.length > 0 || taskSummary || extractedData) && (
          <TaskDeliverables 
            deliverables={deliverables}
            taskSummary={taskSummary}
            extractedData={extractedData}
          />
        )}
        
        {/* Process Report */}
        {processReport && (
          <ProcessDocumentation report={processReport} />
        )}
        
        {/* Next Steps Suggestions */}
        {nextSteps.length > 0 && onSelectNextStep && (
          <NextStepsSuggestions 
            suggestions={nextSteps}
            onSelectSuggestion={onSelectNextStep}
            taskSummary={taskSummary}
          />
        )}
        
        {/* Task Feedback */}
        {taskId && (
          <TaskFeedback 
            taskId={taskId}
            onSubmitFeedback={onSubmitFeedback}
          />
        )}
        
        <BrowserPreview screenshots={screenshots} actions={actions} />
        {steps.length > 0 && <StepTimeline steps={steps} isRunning={false} currentPhase="completed" />}
      </div>
    );
  }

  // Fall back to screenshots after failure, stop, or pause without live URL
  if (status === 'failed' || status === 'stopped' || ((status === 'paused' || status === 'awaiting_input') && !liveUrl)) {
    return (
      <div className="space-y-3">
        {/* Show challenges if any for failed tasks */}
        {status === 'failed' && challenges.length > 0 && (
          <ChallengeIdentification challenges={challenges} />
        )}
        
        {/* Process Report for failed/stopped */}
        {processReport && (
          <ProcessDocumentation report={processReport} />
        )}
        
        {/* Next Steps for failed tasks */}
        {nextSteps.length > 0 && onSelectNextStep && (
          <NextStepsSuggestions 
            suggestions={nextSteps}
            onSelectSuggestion={onSelectNextStep}
          />
        )}
        
        {/* Task Feedback */}
        {taskId && (
          <TaskFeedback 
            taskId={taskId}
            onSubmitFeedback={onSubmitFeedback}
          />
        )}
        
        <BrowserPreview screenshots={screenshots} actions={actions} />
        {steps.length > 0 && <StepTimeline steps={steps} isRunning={false} currentPhase={currentPhase} />}
      </div>
    );
  }

  return null;
};

export default LiveBrowserView;
