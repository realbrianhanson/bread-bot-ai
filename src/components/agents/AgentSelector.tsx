import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Database, 
  FormInput, 
  Compass, 
  Eye, 
  Globe, 
  Wand2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { AgentType, WorkflowAgent, getAllAgents } from '@/lib/types/workflowAgents';
import { cn } from '@/lib/utils';

interface AgentSelectorProps {
  selectedAgent: AgentType | null;
  onSelectAgent: (agent: WorkflowAgent) => void;
  compact?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  Database: <Database className="h-5 w-5" />,
  FormInput: <FormInput className="h-5 w-5" />,
  Compass: <Compass className="h-5 w-5" />,
  Eye: <Eye className="h-5 w-5" />,
  Globe: <Globe className="h-5 w-5" />,
  Wand2: <Wand2 className="h-5 w-5" />,
};

const AgentSelector = ({ selectedAgent, onSelectAgent, compact = false }: AgentSelectorProps) => {
  const agents = getAllAgents();
  const [hoveredAgent, setHoveredAgent] = useState<AgentType | null>(null);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {agents.map((agent) => (
          <Button
            key={agent.id}
            variant={selectedAgent === agent.type ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelectAgent(agent)}
            className={cn(
              "gap-2 transition-all",
              selectedAgent === agent.type && `bg-gradient-to-r ${agent.color} text-white border-0`
            )}
          >
            {iconMap[agent.icon]}
            {agent.name}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Choose an Agent Type</h3>
      </div>
      
      <ScrollArea className="h-[400px] pr-4">
        <div className="grid gap-3">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md border-2",
                selectedAgent === agent.type 
                  ? "border-primary bg-primary/5" 
                  : "border-transparent hover:border-muted-foreground/20",
                hoveredAgent === agent.type && "scale-[1.02]"
              )}
              onClick={() => onSelectAgent(agent)}
              onMouseEnter={() => setHoveredAgent(agent.type)}
              onMouseLeave={() => setHoveredAgent(null)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg bg-gradient-to-br text-white",
                      agent.color
                    )}>
                      {iconMap[agent.icon]}
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {agent.description}
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform",
                    selectedAgent === agent.type && "text-primary rotate-90"
                  )} />
                </div>
              </CardHeader>
              
              {(selectedAgent === agent.type || hoveredAgent === agent.type) && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {agent.capabilities.slice(0, 4).map((cap) => (
                      <Badge key={cap.id} variant="secondary" className="text-xs">
                        {cap.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AgentSelector;
