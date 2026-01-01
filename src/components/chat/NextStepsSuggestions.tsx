import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, ArrowRight, Repeat, Download, Share2, Copy } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export interface NextStep {
  id: string;
  title: string;
  description: string;
  action: 'rerun' | 'modify' | 'export' | 'share' | 'new';
  prompt?: string;
}

interface NextStepsSuggestionsProps {
  suggestions: NextStep[];
  onSelectSuggestion: (step: NextStep) => void;
  taskSummary?: string;
}

const getActionIcon = (action: NextStep['action']) => {
  switch (action) {
    case 'rerun':
      return Repeat;
    case 'modify':
      return Copy;
    case 'export':
      return Download;
    case 'share':
      return Share2;
    case 'new':
    default:
      return ArrowRight;
  }
};

const NextStepsSuggestions = ({ suggestions, onSelectSuggestion, taskSummary }: NextStepsSuggestionsProps) => {
  const [isOpen, setIsOpen] = useState(true);

  if (suggestions.length === 0) return null;

  return (
    <Card className="bg-muted/20 backdrop-blur-sm border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <h3 className="font-semibold text-sm">Suggested Next Steps</h3>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            {suggestions.map((step) => {
              const Icon = getActionIcon(step.action);
              return (
                <Button
                  key={step.id}
                  variant="ghost"
                  className="w-full justify-start h-auto py-3 px-3 hover:bg-primary/10 border border-transparent hover:border-primary/20"
                  onClick={() => onSelectSuggestion(step)}
                >
                  <div className="flex items-start gap-3 text-left">
                    <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{step.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{step.description}</p>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default NextStepsSuggestions;
