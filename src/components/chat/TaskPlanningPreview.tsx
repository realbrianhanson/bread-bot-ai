import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ListTodo, Circle, ArrowRight } from 'lucide-react';
import { useState } from 'react';

export interface PlannedStep {
  id: number;
  description: string;
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
    <Card className="bg-purple-500/10 backdrop-blur-sm border-purple-500/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-purple-500/10 transition-colors">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-purple-500" />
            <h3 className="font-semibold text-sm">Execution Plan</h3>
            {isPlanning ? (
              <Badge className="text-xs bg-purple-500/20 text-purple-500 animate-pulse">
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
                <div className="w-4 h-4 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                <span>Analyzing task and creating execution plan...</span>
              </div>
            )}
            
            {steps.map((step, index) => {
              const isCurrent = step.id === currentStepId || step.status === 'current';
              
              return (
                <div 
                  key={step.id}
                  className={`flex items-start gap-3 p-2 rounded-lg transition-all ${
                    isCurrent 
                      ? 'bg-purple-500/20 border border-purple-500/30' 
                      : step.status === 'completed' 
                        ? 'bg-green-500/10' 
                        : 'hover:bg-muted/20'
                  }`}
                >
                  {/* Step Number */}
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${
                    step.status === 'completed' 
                      ? 'bg-green-500 text-white' 
                      : isCurrent 
                        ? 'bg-purple-500 text-white animate-pulse' 
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {step.status === 'completed' ? '✓' : step.id}
                  </div>
                  
                  {/* Step Description */}
                  <div className="flex-1">
                    <p className={`text-sm ${
                      step.status === 'completed' 
                        ? 'text-muted-foreground line-through' 
                        : isCurrent 
                          ? 'text-purple-500 font-medium' 
                          : 'text-foreground'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                  
                  {/* Current Indicator */}
                  {isCurrent && (
                    <ArrowRight className="h-4 w-4 text-purple-500 animate-pulse flex-shrink-0" />
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
