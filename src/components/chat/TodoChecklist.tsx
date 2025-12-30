import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, CheckSquare, Square, Circle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  inProgress?: boolean;
}

interface TodoChecklistProps {
  items: TodoItem[];
  title?: string;
}

const TodoChecklist = ({ items, title = "Task Checklist" }: TodoChecklistProps) => {
  const [isOpen, setIsOpen] = useState(true);

  if (items.length === 0) return null;

  const completedCount = items.filter(i => i.completed).length;
  const progress = Math.round((completedCount / items.length) * 100);

  return (
    <Card className="bg-muted/20 backdrop-blur-sm border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">{title}</h3>
            <Badge variant="secondary" className="text-xs">
              {completedCount}/{items.length}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{progress}%</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4">
            <Progress value={progress} className="h-1.5 mb-3" />
          </div>
          
          <div className="px-4 pb-4 space-y-1">
            {items.map((item) => (
              <div 
                key={item.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                  item.inProgress 
                    ? 'bg-primary/10 border border-primary/20' 
                    : item.completed 
                      ? 'bg-green-500/10' 
                      : 'hover:bg-muted/20'
                }`}
              >
                {/* Checkbox Icon */}
                <div className="flex-shrink-0">
                  {item.inProgress ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  ) : item.completed ? (
                    <CheckSquare className="h-4 w-4 text-green-500" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                
                {/* Item Text */}
                <span className={`text-sm flex-1 ${
                  item.completed 
                    ? 'text-muted-foreground line-through' 
                    : item.inProgress 
                      ? 'text-primary font-medium' 
                      : 'text-foreground'
                }`}>
                  {item.text}
                </span>
                
                {/* In Progress Badge */}
                {item.inProgress && (
                  <Badge className="text-[10px] bg-primary/20 text-primary">
                    In Progress
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default TodoChecklist;
