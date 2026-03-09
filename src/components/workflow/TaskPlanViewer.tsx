import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  Play,
  Edit3,
  Check,
  X,
  Loader2,
  Sparkles,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskPlan, PlanStep } from "@/hooks/useTaskPlanner";

interface TaskPlanViewerProps {
  plan: TaskPlan;
  onUpdateStep: (stepId: string, updates: Partial<PlanStep>) => void;
  onRemoveStep: (stepId: string) => void;
  onAddStep: (afterIndex: number) => void;
  onReorderSteps: (from: number, to: number) => void;
  onExecute: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

export function TaskPlanViewer({
  plan,
  onUpdateStep,
  onRemoveStep,
  onAddStep,
  onReorderSteps,
  onExecute,
  onCancel,
  isExecuting = false,
}: TaskPlanViewerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", prompt: "" });

  const startEdit = (step: PlanStep) => {
    setEditingId(step.id);
    setEditForm({ title: step.title, description: step.description, prompt: step.prompt });
  };

  const saveEdit = (stepId: string) => {
    onUpdateStep(stepId, editForm);
    setEditingId(null);
  };

  const statusColor = (status: PlanStep["status"]) => {
    switch (status) {
      case "running": return "border-primary bg-primary/10";
      case "done": return "border-green-500/50 bg-green-500/5";
      case "failed": return "border-destructive/50 bg-destructive/5";
      default: return "border-border/50";
    }
  };

  const statusIcon = (status: PlanStep["status"]) => {
    switch (status) {
      case "running": return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />;
      case "done": return <Check className="h-3.5 w-3.5 text-green-500" />;
      case "failed": return <X className="h-3.5 w-3.5 text-destructive" />;
      default: return <span className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 block" />;
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-xl border border-border/50 bg-card/50">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Task Plan</h3>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={isExecuting}>
            Cancel
          </Button>
          <Button size="sm" onClick={onExecute} disabled={isExecuting || plan.steps.length === 0} className="gap-1.5">
            {isExecuting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {isExecuting ? "Running…" : "Execute All"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{plan.summary}</p>

      {/* Steps */}
      <div className="space-y-2">
        {plan.steps.map((step, i) => (
          <div key={step.id}>
            <div
              className={cn(
                "rounded-lg border p-3 transition-all",
                statusColor(step.status)
              )}
            >
              {editingId === step.id ? (
                <div className="space-y-2">
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    placeholder="Step title"
                    className="h-8 text-sm"
                  />
                  <Input
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Description"
                    className="h-8 text-sm"
                  />
                  <Textarea
                    value={editForm.prompt}
                    onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })}
                    placeholder="/browse prompt"
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-1.5 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" onClick={() => saveEdit(step.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0 flex flex-col items-center gap-1">
                    {statusIcon(step.status)}
                    <GripVertical className="h-3 w-3 text-muted-foreground/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {i + 1}
                      </span>
                      <p className="text-sm font-medium text-foreground truncate">{step.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {step.description}
                    </p>
                    <p className="text-[10px] font-mono text-primary/60 mt-1 truncate">
                      {step.prompt}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {i > 0 && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onReorderSteps(i, i - 1)}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                    )}
                    {i < plan.steps.length - 1 && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onReorderSteps(i, i + 1)}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(step)}>
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveStep(step.id)}
                      disabled={isExecuting}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Add step button between steps */}
            {i < plan.steps.length - 1 && !isExecuting && (
              <div className="flex justify-center py-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 text-muted-foreground/40 hover:text-primary"
                  onClick={() => onAddStep(i)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add step at end */}
      {!isExecuting && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-muted-foreground gap-1.5"
          onClick={() => onAddStep(plan.steps.length - 1)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Step
        </Button>
      )}
    </div>
  );
}
