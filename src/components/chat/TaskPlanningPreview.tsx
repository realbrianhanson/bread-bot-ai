import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ListTodo, ArrowRight, Globe, Search, FileText, Map, Sparkles } from 'lucide-react';
import { useState } from 'react';

const TOOL_ICON_MAP: Record<string, typeof Globe> = {
  browse: Globe,
  scrape: FileText,
  crawl: Map,
  search: Search,
  research: Sparkles,
};

const TOOL_LABEL_MAP: Record<string, string> = {
  browse: 'Browse',
  scrape: 'Scrape',
  crawl: 'Crawl',
  search: 'Search',
  research: 'Research',
};

export interface PlannedStep {
  id: number;
  description: string;
  title?: string;
  tool?: string;
  prompt?: string;
  status: 'pending' | 'current' | 'completed' | 'skipped';
}

interface TaskPlanningPreviewProps {
  steps: PlannedStep[];
  currentStepId?: number;
  isPlanning?: boolean;
}

const TaskPlanningPreview = ({ steps, currentStepId, isPlanning = false }: TaskPlanningPreviewProps) => {
  const [isOpen, setIsOpen] = useState(true);

  if (steps.length === 0 && !isPlanning) return null;

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <Card className="bg-primary/5 backdrop-blur-sm border-primary/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-colors">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Execution Plan</h3>
            {isPlanning ? (
              <Badge className="text-xs bg-primary/20 text-primary animate-pulse">
                Planning...
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                {completedCount}/{steps.length} ({progress}%)
              </Badge>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            {isPlanning && steps.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>Analyzing task and creating execution plan...</span>
              </div>
            )}
            
            {steps.map((step) => {
              const isCurrent = step.id === currentStepId || step.status === 'current';
              const ToolIcon = step.tool ? (TOOL_ICON_MAP[step.tool] || Globe) : null;
              const toolLabel = step.tool ? (TOOL_LABEL_MAP[step.tool] || step.tool) : null;
              
              return (
                <div 
                  key={step.id}
                  className={`flex items-start gap-3 p-2.5 rounded-lg transition-all ${
                    isCurrent 
                      ? 'bg-primary/10 border border-primary/25' 
                      : step.status === 'completed' 
                        ? 'bg-primary/5' 
                        : 'hover:bg-muted/20'
                  }`}
                >
                  {/* Step Number */}
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${
                    step.status === 'completed' 
                      ? 'bg-primary text-primary-foreground' 
                      : isCurrent 
                        ? 'bg-primary text-primary-foreground animate-pulse' 
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {step.status === 'completed' ? '✓' : step.id}
                  </div>
                  
                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {step.title && (
                        <span className={`text-sm font-medium ${
                          step.status === 'completed' ? 'text-muted-foreground line-through' :
                          isCurrent ? 'text-primary' : 'text-foreground'
                        }`}>
                          {step.title}
                        </span>
                      )}
                      {ToolIcon && toolLabel && (
                        <Badge variant="outline" className="text-[10px] h-5 gap-1 border-border/60 font-normal">
                          <ToolIcon className="h-2.5 w-2.5" />
                          {toolLabel}
                        </Badge>
                      )}
                    </div>
                    <p className={`text-xs ${
                      step.status === 'completed' ? 'text-muted-foreground/60' :
                      isCurrent ? 'text-muted-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                  
                  {/* Current Indicator */}
                  {isCurrent && (
                    <ArrowRight className="h-4 w-4 text-primary animate-pulse flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default TaskPlanningPreview;
