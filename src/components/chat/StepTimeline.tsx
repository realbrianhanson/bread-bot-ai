import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Circle, Mouse, Keyboard, Globe, Eye, Brain, Search, Zap } from 'lucide-react';
import { BrowserStep, StepPhase } from '@/hooks/useBrowserTask';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface StepTimelineProps {
  steps: BrowserStep[];
  isRunning: boolean;
  currentPhase?: StepPhase;
}

const getStepIcon = (type?: string) => {
  if (!type) return Eye;
  const lowerType = type.toLowerCase();
  if (lowerType.includes('click') || lowerType.includes('mouse')) {
    return Mouse;
  }
  if (lowerType.includes('type') || lowerType.includes('input') || lowerType.includes('keyboard')) {
    return Keyboard;
  }
  if (lowerType.includes('navigate') || lowerType.includes('goto') || lowerType.includes('url')) {
    return Globe;
  }
  if (lowerType.includes('analyz') || lowerType.includes('think') || lowerType.includes('plan')) {
    return Brain;
  }
  if (lowerType.includes('extract') || lowerType.includes('gather') || lowerType.includes('search')) {
    return Search;
  }
  return Eye;
};

const getStepStatusIcon = (status?: string, phase?: StepPhase) => {
  if (status === 'running' || phase === 'executing') {
    return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
  }
  if (status === 'completed' || phase === 'completed') {
    return <Check className="h-3 w-3 text-green-500" />;
  }
  if (phase === 'analyzing') {
    return <Brain className="h-3 w-3 animate-pulse text-purple-500" />;
  }
  if (phase === 'observing') {
    return <Eye className="h-3 w-3 animate-pulse text-cyan-500" />;
  }
  return <Circle className="h-3 w-3 text-muted-foreground" />;
};

const getPhaseLabel = (phase?: StepPhase) => {
  switch (phase) {
    case 'analyzing':
      return { label: 'Analyze', color: 'bg-purple-500/20 text-purple-500' };
    case 'executing':
      return { label: 'Execute', color: 'bg-blue-500/20 text-blue-500' };
    case 'observing':
      return { label: 'Observe', color: 'bg-cyan-500/20 text-cyan-500' };
    case 'completed':
      return { label: 'Done', color: 'bg-green-500/20 text-green-500' };
    case 'waiting':
      return { label: 'Waiting', color: 'bg-orange-500/20 text-orange-500' };
    default:
      return null;
  }
};

const StepTimeline = ({ steps, isRunning, currentPhase }: StepTimelineProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest step
  useEffect(() => {
    if (scrollRef.current && steps.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  if (steps.length === 0) return null;

  return (
    <Card className="bg-muted/20 backdrop-blur-sm border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Agent Activity</h3>
            <Badge variant="secondary" className="text-xs">
              {steps.length} {steps.length === 1 ? 'action' : 'actions'}
            </Badge>
            {isRunning && currentPhase && (
              <Badge className={`text-xs ${getPhaseLabel(currentPhase)?.color}`}>
                <Zap className="h-3 w-3 mr-1" />
                {currentPhase === 'analyzing' && 'Thinking...'}
                {currentPhase === 'executing' && 'Acting...'}
                {currentPhase === 'observing' && 'Observing...'}
              </Badge>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          {/* Phase indicator bar */}
          {isRunning && (
            <div className="px-4 pb-2">
              <div className="flex items-center gap-1 text-xs">
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all ${
                  currentPhase === 'analyzing' ? 'bg-purple-500/20 text-purple-500' : 'bg-muted/30 text-muted-foreground'
                }`}>
                  <Brain className="h-3 w-3" />
                  <span>Analyze</span>
                </div>
                <div className="w-4 h-px bg-border" />
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all ${
                  currentPhase === 'executing' ? 'bg-blue-500/20 text-blue-500' : 'bg-muted/30 text-muted-foreground'
                }`}>
                  <Zap className="h-3 w-3" />
                  <span>Execute</span>
                </div>
                <div className="w-4 h-px bg-border" />
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all ${
                  currentPhase === 'observing' ? 'bg-cyan-500/20 text-cyan-500' : 'bg-muted/30 text-muted-foreground'
                }`}>
                  <Eye className="h-3 w-3" />
                  <span>Observe</span>
                </div>
              </div>
            </div>
          )}

          <div 
            ref={scrollRef}
            className="px-4 pb-3 max-h-[300px] overflow-y-auto space-y-2"
          >
            {steps.map((step, index) => {
              const Icon = getStepIcon(step.type);
              const isLatest = index === steps.length - 1 && isRunning;
              const phaseInfo = getPhaseLabel(step.phase);
              
              return (
                <div
                  key={`${step.timestamp}-${index}`}
                  className={`flex items-start gap-3 p-2 rounded-lg transition-all ${
                    isLatest ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getStepStatusIcon(step.status, step.phase)}
                  </div>
                  
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className={`h-4 w-4 ${isLatest ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-medium ${isLatest ? 'text-primary' : 'text-foreground'}`}>
                        {step.type}
                      </p>
                      {phaseInfo && (
                        <Badge className={`text-[10px] px-1.5 py-0 ${phaseInfo.color}`}>
                          {phaseInfo.label}
                        </Badge>
                      )}
                    </div>
                    {step.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {step.description}
                      </p>
                    )}
                    {step.target && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5 font-mono truncate">
                        {step.target}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0 text-xs text-muted-foreground">
                    {new Date(step.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit' 
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default StepTimeline;
