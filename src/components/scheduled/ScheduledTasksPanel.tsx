import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus, Trash2, Play, Pause, Calendar } from "lucide-react";
import { useScheduledTasks } from "@/hooks/useScheduledTasks";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const CRON_PRESETS = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily at 9 AM", value: "0 9 * * *" },
  { label: "Weekdays at 9 AM", value: "0 9 * * 1-5" },
  { label: "Weekly (Monday)", value: "0 9 * * 1" },
  { label: "Monthly (1st)", value: "0 9 1 * *" },
];

export function ScheduledTasksPanel() {
  const { tasks, loading, createTask, toggleTask, deleteTask } = useScheduledTasks();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    prompt: "",
    cron_expression: "0 9 * * *",
  });

  const handleCreate = async () => {
    if (!form.name.trim() || !form.prompt.trim()) return;
    await createTask(form);
    setForm({ name: "", description: "", prompt: "", cron_expression: "0 9 * * *" });
    setCreateOpen(false);
  };

  const getCronLabel = (cron: string) => {
    const preset = CRON_PRESETS.find((p) => p.value === cron);
    return preset?.label || cron;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative">
            <Clock className="h-4 w-4" />
            {tasks.filter((t) => t.is_active).length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                {tasks.filter((t) => t.is_active).length}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[380px] sm:w-[440px]">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Scheduled Tasks
              </SheetTitle>
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            {loading ? (
              <div className="text-center text-sm text-muted-foreground py-12">Loading…</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No scheduled tasks yet</p>
                <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Create your first
                </Button>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    task.is_active
                      ? "border-primary/20 bg-primary/5"
                      : "border-border/50 bg-muted/30 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {task.is_active ? (
                          <Play className="h-3 w-3 text-primary shrink-0" />
                        ) : (
                          <Pause className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        <p className="text-sm font-medium text-foreground truncate">{task.name}</p>
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 ml-5">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 ml-5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                          {getCronLabel(task.cron_expression)}
                        </span>
                        {task.last_run_at && (
                          <span className="text-[10px] text-muted-foreground">
                            Last: {formatDistanceToNow(new Date(task.last_run_at), { addSuffix: true })}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {task.run_count} runs
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Switch
                        checked={task.is_active}
                        onCheckedChange={(checked) => toggleTask(task.id, checked)}
                        className="scale-75"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Scheduled Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sched-name">Name</Label>
              <Input
                id="sched-name"
                placeholder="e.g. Daily price check"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sched-desc">Description (optional)</Label>
              <Input
                id="sched-desc"
                placeholder="Brief description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sched-prompt">Task Prompt</Label>
              <Textarea
                id="sched-prompt"
                placeholder="/browse Go to example.com and check prices…"
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Schedule</Label>
              <Select
                value={form.cron_expression}
                onValueChange={(v) => setForm({ ...form, cron_expression: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRON_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim() || !form.prompt.trim()}>
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
