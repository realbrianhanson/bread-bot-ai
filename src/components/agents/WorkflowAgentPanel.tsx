import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Sparkles, 
  History, 
  Settings2,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import AgentSelector from './AgentSelector';
import AgentConfigPanel from './AgentConfigPanel';
import EnhancedTaskTracker, { TaskItem } from '@/components/chat/EnhancedTaskTracker';
import { useTaskTracker } from '@/hooks/useTaskTracker';
import { AgentType, WorkflowAgent, AgentConfig, getAgentByType } from '@/lib/types/workflowAgents';
import { LoadingState, SuccessState, ErrorState } from '@/components/ui/api-state';
import { useApiState } from '@/hooks/useApiState';
import { cn } from '@/lib/utils';

interface WorkflowAgentPanelProps {
  onExecuteTask?: (prompt: string, agentType: AgentType, config: AgentConfig) => Promise<void>;
}

const WorkflowAgentPanel = ({ onExecuteTask }: WorkflowAgentPanelProps) => {
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType | null>(null);
  const [config, setConfig] = useState<AgentConfig>({});
  const [activeTab, setActiveTab] = useState('select');
  
  const taskTracker = useTaskTracker({
    onAllComplete: (tasks) => {
      taskTracker.addNote(tasks[tasks.length - 1].id, 'All tasks completed!', 'success');
    },
  });

  const executionState = useApiState<{ taskId: string; result: any }>();

  const handleSelectAgent = (agent: WorkflowAgent) => {
    setSelectedAgentType(agent.type);
    setConfig(agent.defaultConfig);
    setActiveTab('configure');
  };

  const handleExecute = async (prompt: string) => {
    if (!selectedAgentType) return;

    // Create task tracking
    const mainTask = taskTracker.createTask(`Execute: ${prompt.slice(0, 50)}...`);
    taskTracker.setTaskStatus(mainTask.id, 'in_progress');
    taskTracker.addNote(mainTask.id, `Starting ${getAgentByType(selectedAgentType).name} agent`, 'info');

    try {
      await executionState.execute(async () => {
        if (onExecuteTask) {
          await onExecuteTask(prompt, selectedAgentType, config);
        }
        // Simulate execution for demo
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { taskId: mainTask.id, result: 'completed' };
      });

      taskTracker.setTaskStatus(mainTask.id, 'done');
      taskTracker.addNote(mainTask.id, 'Task completed successfully', 'success');
    } catch (error) {
      taskTracker.setTaskStatus(mainTask.id, 'blocked');
      taskTracker.addNote(mainTask.id, `Error: ${error}`, 'error');
    }
  };

  const selectedAgent = selectedAgentType ? getAgentByType(selectedAgentType) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/60">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Workflow Agents</h2>
            <p className="text-sm text-muted-foreground">
              Specialized agents for different automation patterns
            </p>
          </div>
        </div>
        
        {selectedAgent && (
          <Badge 
            className={cn(
              "bg-gradient-to-r text-white border-0",
              selectedAgent.color
            )}
          >
            {selectedAgent.name} Active
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="select" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Select Agent
          </TabsTrigger>
          <TabsTrigger value="configure" disabled={!selectedAgentType} className="gap-2">
            <Settings2 className="h-4 w-4" />
            Configure
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="select" className="mt-6">
          <AgentSelector
            selectedAgent={selectedAgentType}
            onSelectAgent={handleSelectAgent}
          />
        </TabsContent>

        <TabsContent value="configure" className="mt-6">
          {selectedAgent && (
            <div className="grid md:grid-cols-2 gap-6">
              <AgentConfigPanel
                agent={selectedAgent}
                config={config}
                onConfigChange={setConfig}
                onExecute={handleExecute}
                isExecuting={executionState.isLoading}
              />

              <div className="space-y-4">
                {/* Execution State */}
                {executionState.isLoading && (
                  <LoadingState message="Running agent..." />
                )}
                
                {executionState.isError && (
                  <ErrorState 
                    message="Agent execution failed" 
                    error={executionState.error}
                    onRetry={() => executionState.reset()}
                    compact
                  />
                )}

                {executionState.isSuccess && (
                  <SuccessState 
                    message="Agent completed successfully!"
                    autoHide
                    onHide={() => executionState.reset()}
                  />
                )}

                {/* Task Tracker */}
                {taskTracker.tasks.length > 0 && (
                  <EnhancedTaskTracker
                    tasks={taskTracker.tasks}
                    onUpdateTask={taskTracker.updateTask}
                    onAddNote={taskTracker.addNote}
                  />
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Agent Runs</CardTitle>
              <CardDescription>
                View and re-run previous agent executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {taskTracker.tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No agent runs yet</p>
                  <p className="text-xs mt-1">Select an agent and run a task to see history</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {taskTracker.tasks.map((task) => (
                    <div 
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        {task.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {task.status === 'in_progress' && <Play className="h-4 w-4 text-blue-500" />}
                        {task.status === 'blocked' && <Pause className="h-4 w-4 text-red-500" />}
                        <div>
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(task.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Rerun
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorkflowAgentPanel;
