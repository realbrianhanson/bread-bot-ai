import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings2, 
  Sparkles, 
  Clock, 
  RefreshCw, 
  Camera, 
  Database,
  Play,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { WorkflowAgent, AgentConfig } from '@/lib/types/workflowAgents';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AgentConfigPanelProps {
  agent: WorkflowAgent;
  config: AgentConfig;
  onConfigChange: (config: AgentConfig) => void;
  onExecute: (prompt: string) => void;
  isExecuting?: boolean;
}

const AgentConfigPanel = ({ 
  agent, 
  config, 
  onConfigChange, 
  onExecute,
  isExecuting = false 
}: AgentConfigPanelProps) => {
  const [prompt, setPrompt] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handlePromptSubmit = () => {
    if (prompt.trim()) {
      onExecute(prompt);
    }
  };

  const handleSuggestedPrompt = (suggestedPrompt: string) => {
    setPrompt(suggestedPrompt);
  };

  return (
    <div className="space-y-4">
      {/* Agent Header */}
      <Card className={cn("border-2 bg-gradient-to-br", agent.color, "bg-opacity-10")}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-xl bg-gradient-to-br text-white", agent.color)}>
              <Settings2 className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <CardDescription>{agent.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Task Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            What would you like to do?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`Describe your ${agent.name.toLowerCase()} task...`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] resize-none"
          />
          
          {/* Suggested Prompts */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick suggestions:</Label>
            <div className="flex flex-wrap gap-2">
              {agent.suggestedPrompts.slice(0, 3).map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleSuggestedPrompt(suggestion)}
                >
                  {suggestion.length > 40 ? suggestion.slice(0, 40) + '...' : suggestion}
                </Badge>
              ))}
            </div>
          </div>

          <Button 
            onClick={handlePromptSubmit} 
            disabled={!prompt.trim() || isExecuting}
            className={cn("w-full bg-gradient-to-r", agent.color, "text-white hover:opacity-90")}
          >
            <Play className="h-4 w-4 mr-2" />
            {isExecuting ? 'Running...' : `Run ${agent.name}`}
          </Button>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Advanced Settings
                </CardTitle>
                {advancedOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-6 pt-0">
              {/* Timeout */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Timeout
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {Math.round((config.timeout || 60000) / 1000)}s
                  </span>
                </div>
                <Slider
                  value={[(config.timeout || 60000) / 1000]}
                  onValueChange={([value]) => onConfigChange({ ...config, timeout: value * 1000 })}
                  min={10}
                  max={300}
                  step={10}
                />
              </div>

              {/* Max Retries */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    Max Retries
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {config.maxRetries || 3}
                  </span>
                </div>
                <Slider
                  value={[config.maxRetries || 3]}
                  onValueChange={([value]) => onConfigChange({ ...config, maxRetries: value })}
                  min={0}
                  max={10}
                  step={1}
                />
              </div>

              {/* Toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    Capture Screenshots
                  </Label>
                  <Switch
                    checked={config.captureScreenshots ?? true}
                    onCheckedChange={(checked) => 
                      onConfigChange({ ...config, captureScreenshots: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    Save to Database
                  </Label>
                  <Switch
                    checked={config.saveToDatabase ?? false}
                    onCheckedChange={(checked) => 
                      onConfigChange({ ...config, saveToDatabase: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default AgentConfigPanel;
