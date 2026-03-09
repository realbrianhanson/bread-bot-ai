import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  GitBranch,
  Plus,
  Play,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Loader2,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface WorkflowStep {
  id: string;
  name: string;
  prompt: string;
  order: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

interface WorkflowBuilderProps {
  onExecuteWorkflow: (steps: WorkflowStep[]) => void;
}

export function WorkflowBuilder({ onExecuteWorkflow }: WorkflowBuilderProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("garlicbread-workflows") || "[]");
    } catch {
      return [];
    }
  });
  const [activeWorkflow, setActiveWorkflow] = useState<Workflow | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const save = useCallback((wfs: Workflow[]) => {
    setWorkflows(wfs);
    localStorage.setItem("garlicbread-workflows", JSON.stringify(wfs));
  }, []);

  const createWorkflow = () => {
    if (!newName.trim()) return;
    const wf: Workflow = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      description: newDesc.trim(),
      steps: [
        { id: crypto.randomUUID(), name: "Step 1", prompt: "", order: 0 },
      ],
    };
    save([wf, ...workflows]);
    setActiveWorkflow(wf);
    setNewName("");
    setNewDesc("");
    setCreateOpen(false);
  };

  const updateWorkflow = (wf: Workflow) => {
    const updated = workflows.map((w) => (w.id === wf.id ? wf : w));
    save(updated);
    setActiveWorkflow(wf);
  };

  const deleteWorkflow = (id: string) => {
    save(workflows.filter((w) => w.id !== id));
    if (activeWorkflow?.id === id) setActiveWorkflow(null);
  };

  const addStep = () => {
    if (!activeWorkflow) return;
    const wf = {
      ...activeWorkflow,
      steps: [
        ...activeWorkflow.steps,
        {
          id: crypto.randomUUID(),
          name: `Step ${activeWorkflow.steps.length + 1}`,
          prompt: "",
          order: activeWorkflow.steps.length,
        },
      ],
    };
    updateWorkflow(wf);
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    if (!activeWorkflow) return;
    const wf = {
      ...activeWorkflow,
      steps: activeWorkflow.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
    };
    updateWorkflow(wf);
  };

  const removeStep = (stepId: string) => {
    if (!activeWorkflow) return;
    const wf = {
      ...activeWorkflow,
      steps: activeWorkflow.steps
        .filter((s) => s.id !== stepId)
        .map((s, i) => ({ ...s, order: i })),
    };
    updateWorkflow(wf);
  };

  const moveStep = (from: number, to: number) => {
    if (!activeWorkflow) return;
    const steps = [...activeWorkflow.steps];
    const [moved] = steps.splice(from, 1);
    steps.splice(to, 0, moved);
    updateWorkflow({
      ...activeWorkflow,
      steps: steps.map((s, i) => ({ ...s, order: i })),
    });
  };

  const runWorkflow = async () => {
    if (!activeWorkflow || activeWorkflow.steps.length === 0) return;
    const emptySteps = activeWorkflow.steps.filter((s) => !s.prompt.trim());
    if (emptySteps.length > 0) {
      toast({ title: "Missing prompts", description: "Fill in all step prompts before running.", variant: "destructive" });
      return;
    }
    setIsRunning(true);
    onExecuteWorkflow(activeWorkflow.steps);
    setOpen(false);
    setIsRunning(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <GitBranch className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[480px] flex flex-col">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Workflows
              </SheetTitle>
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 min-h-0 mt-4 overflow-y-auto space-y-3">
            {activeWorkflow ? (
              /* Workflow Editor */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={() => setActiveWorkflow(null)}>
                    ← Back
                  </Button>
                  <h3 className="text-sm font-semibold truncate">{activeWorkflow.name}</h3>
                  <Button size="sm" onClick={runWorkflow} disabled={isRunning} className="gap-1.5">
                    {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    Run
                  </Button>
                </div>

                {activeWorkflow.description && (
                  <p className="text-xs text-muted-foreground">{activeWorkflow.description}</p>
                )}

                <div className="space-y-2">
                  {activeWorkflow.steps.map((step, i) => (
                    <div key={step.id}>
                      <div className="rounded-lg border border-border/50 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {i + 1}
                            </span>
                            <Input
                              value={step.name}
                              onChange={(e) => updateStep(step.id, { name: e.target.value })}
                              className="h-7 text-sm font-medium border-none shadow-none px-1"
                              placeholder="Step name"
                            />
                          </div>
                          <div className="flex gap-0.5 shrink-0">
                            {i > 0 && (
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStep(i, i - 1)}>
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                            )}
                            {i < activeWorkflow.steps.length - 1 && (
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStep(i, i + 1)}>
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 hover:text-destructive"
                              onClick={() => removeStep(step.id)}
                              disabled={activeWorkflow.steps.length <= 1}
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
                        />
                      </div>
                      {i < activeWorkflow.steps.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 rotate-90" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={addStep}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Step
                </Button>
              </div>
            ) : (
              /* Workflow List */
              <>
                {workflows.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <GitBranch className="h-10 w-10 mx-auto text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No workflows yet</p>
                    <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Create your first
                    </Button>
                  </div>
                ) : (
                  workflows.map((wf) => (
                    <button
                      key={wf.id}
                      onClick={() => setActiveWorkflow(wf)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border border-border/50 transition-all",
                        "hover:border-primary/30 hover:bg-primary/5 group"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{wf.name}</p>
                          {wf.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{wf.description}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {wf.steps.length} step{wf.steps.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); deleteWorkflow(wf.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Input placeholder="Workflow name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Input placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createWorkflow} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
