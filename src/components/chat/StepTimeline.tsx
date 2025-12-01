import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Circle, Mouse, Keyboard, Globe, Eye } from 'lucide-react';
import { BrowserStep } from '@/hooks/useBrowserTask';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface StepTimelineProps {
  steps: BrowserStep[];
  isRunning: boolean;
}

const getStepIcon = (type: string) => {
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
  return Eye;
};

const getStepStatusIcon = (status?: string) => {
  if (status === 'running') {
    return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
  }
  if (status === 'completed') {
    return <Check className="h-3 w-3 text-green-500" />;
  }
  return <Circle className="h-3 w-3 text-muted-foreground" />;
};

const StepTimeline = ({ steps, isRunning }: StepTimelineProps) => {
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
            <h3 className="font-semibold text-sm">Step Progress</h3>
            <Badge variant="secondary" className="text-xs">
              {steps.length} {steps.length === 1 ? 'step' : 'steps'}
            </Badge>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div 
            ref={scrollRef}
            className="px-4 pb-3 max-h-[300px] overflow-y-auto space-y-2"
          >
            {steps.map((step, index) => {
              const Icon = getStepIcon(step.type);
              const isLatest = index === steps.length - 1 && isRunning;
              
              return (
                <div
                  key={`${step.timestamp}-${index}`}
                  className={`flex items-start gap-3 p-2 rounded-lg transition-all ${
                    isLatest ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getStepStatusIcon(step.status)}
                  </div>
                  
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className={`h-4 w-4 ${isLatest ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${isLatest ? 'text-primary' : 'text-foreground'}`}>
                      {step.type}
                    </p>
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
