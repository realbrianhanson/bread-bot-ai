import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkflows, type WorkflowStep } from '@/hooks/useWorkflows';
import { useBrowserTask } from '@/hooks/useBrowserTask';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Play, Plus, Trash2, ChevronUp, ChevronDown,
  ArrowRight, Loader2, Save, GripVertical, CheckCircle2,
} from 'lucide-react';
import { GarlicLogo } from '@/components/ui/logo-icon';
import { cn } from '@/lib/utils';

const WorkflowEditor = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workflows, isLoading, updateWorkflow } = useWorkflows();
  const { executeTask } = useBrowserTask();

  const workflow = workflows.find(w => w.id === id);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runningStepIndex, setRunningStepIndex] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (workflow) {
      setName(workflow.name);
      setDescription(workflow.description);
      setSteps(workflow.steps || []);
    }
  }, [workflow]);

  const markDirty = () => setIsDirty(true);

  const handleSave = useCallback(async () => {
    if (!id) return;
    await updateWorkflow(id, { name, description, steps });
    setIsDirty(false);
    toast({ title: 'Saved' });
  }, [id, name, description, steps, updateWorkflow]);

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: crypto.randomUUID(),
      name: `Step ${steps.length + 1}`,
      prompt: '',
      order: steps.length,
    };
    setSteps(prev => [...prev, newStep]);
    markDirty();
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...updates } : s));
    markDirty();
  };

  const removeStep = (stepId: string) => {
    setSteps(prev => prev.filter(s => s.id !== stepId).map((s, i) => ({ ...s, order: i })));
    markDirty();
  };

  const moveStep = (from: number, to: number) => {
    setSteps(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr.map((s, i) => ({ ...s, order: i }));
    });
    markDirty();
  };

  const runWorkflow = async () => {
    const emptySteps = steps.filter(s => !s.prompt.trim());
    if (emptySteps.length > 0) {
      toast({ title: 'Missing prompts', description: 'Fill in all step prompts first.', variant: 'destructive' });
      return;
    }

    // Save first
    if (isDirty) await handleSave();

    setIsRunning(true);
    setCompletedSteps(new Set());

    for (let i = 0; i < steps.length; i++) {
      setRunningStepIndex(i);
      try {
        await executeTask(steps[i].prompt);
        setCompletedSteps(prev => new Set([...prev, i]));
      } catch (err: any) {
        toast({ title: `Step ${i + 1} failed`, description: err.message, variant: 'destructive' });
        break;
      }
    }

    // Update last_run_at
    if (id) await updateWorkflow(id, { last_run_at: new Date().toISOString() });

    setIsRunning(false);
    setRunningStepIndex(-1);
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">Workflow not found</p>
        <Button variant="outline" onClick={() => navigate('/workflows')}>Back to Workflows</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-12 shrink-0 border-b border-border/50 bg-card/80 backdrop-blur-sm flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/workflows')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <GarlicLogo size={20} />
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); markDirty(); }}
            className="h-7 text-sm font-semibold border-none shadow-none bg-transparent w-48"
          />
          {isDirty && <Badge variant="outline" className="text-[10px]">Unsaved</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleSave} disabled={!isDirty} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>
          <Button size="sm" onClick={runWorkflow} disabled={isRunning || steps.length === 0} className="gap-1.5">
            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {isRunning ? 'Running…' : 'Run All'}
          </Button>
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-4">
          <Input
            value={description}
            onChange={(e) => { setDescription(e.target.value); markDirty(); }}
            placeholder="Workflow description (optional)"
            className="text-sm text-muted-foreground"
          />

          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={step.id}>
                <div className={cn(
                  'rounded-xl border p-4 transition-all',
                  runningStepIndex === i ? 'border-primary bg-primary/5' :
                  completedSteps.has(i) ? 'border-green-500/50 bg-green-500/5' :
                  'border-border/50'
                )}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30" />
                        {runningStepIndex === i ? (
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        ) : completedSteps.has(i) ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {i + 1}
                          </span>
                        )}
                      </div>
                      <Input
                        value={step.name}
                        onChange={(e) => updateStep(step.id, { name: e.target.value })}
                        className="h-7 text-sm font-medium border-none shadow-none px-1"
                        placeholder="Step name"
                        disabled={isRunning}
                      />
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      {i > 0 && (
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStep(i, i - 1)} disabled={isRunning}>
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                      )}
                      {i < steps.length - 1 && (
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStep(i, i + 1)} disabled={isRunning}>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="icon" variant="ghost"
                        className="h-6 w-6 hover:text-destructive"
                        onClick={() => removeStep(step.id)}
                        disabled={isRunning || steps.length <= 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={step.prompt}
                    onChange={(e) => updateStep(step.id, { prompt: e.target.value })}
                    placeholder="/browse Go to website and..."
                    rows={2}
                    className="text-xs"
                    disabled={isRunning}
                  />
                </div>
                {i < steps.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 rotate-90" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={addStep} disabled={isRunning}>
            <Plus className="h-3.5 w-3.5" />
            Add Step
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowEditor;
