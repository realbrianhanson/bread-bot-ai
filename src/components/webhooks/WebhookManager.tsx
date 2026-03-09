import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Webhook,
  Plus,
  Trash2,
  Zap,
  Send,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useWebhooks } from "@/hooks/useWebhooks";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const AVAILABLE_EVENTS = [
  { id: "task.completed", label: "Task Completed", description: "When a browser task finishes successfully" },
  { id: "task.failed", label: "Task Failed", description: "When a browser task fails" },
  { id: "scheduled.completed", label: "Scheduled Run Done", description: "When a scheduled task run completes" },
];

export function WebhookManager() {
  const { webhooks, loading, createWebhook, deleteWebhook, toggleWebhook, testWebhook } = useWebhooks();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    url: "",
    secret: "",
    events: ["task.completed", "task.failed"] as string[],
  });

  const toggleEvent = (eventId: string) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter((e) => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.url.trim() || form.events.length === 0) return;
    await createWebhook(form);
    setForm({ name: "", url: "", secret: "", events: ["task.completed", "task.failed"] });
    setCreateOpen(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Webhook className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[380px] sm:w-[440px]">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhooks
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
            ) : webhooks.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Zap className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No webhooks configured</p>
                <p className="text-xs text-muted-foreground">
                  Get notified via Slack, Discord, or any URL when tasks complete
                </p>
                <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add webhook
                </Button>
              </div>
            ) : (
              webhooks.map((wh) => (
                <div
                  key={wh.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    wh.is_active ? "border-border/50" : "border-border/30 opacity-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {wh.failure_count > 3 ? (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        )}
                        <p className="text-sm font-medium text-foreground truncate">{wh.name}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 ml-5 truncate font-mono">{wh.url}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5 ml-5">
                        {wh.events.map((ev) => (
                          <span
                            key={ev}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                      {wh.last_triggered_at && (
                        <p className="text-[10px] text-muted-foreground mt-1 ml-5">
                          Last triggered {formatDistanceToNow(new Date(wh.last_triggered_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={wh.is_active}
                        onCheckedChange={(checked) => toggleWebhook(wh.id, checked)}
                        className="scale-75"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => testWebhook(wh.id)}
                        title="Send test"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:text-destructive"
                        onClick={() => deleteWebhook(wh.id)}
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
            <DialogTitle>New Webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Slack notifications"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                placeholder="https://hooks.slack.com/services/..."
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">
                Works with Slack, Discord, Zapier, Make, or any URL that accepts POST
              </p>
            </div>
            <div className="space-y-2">
              <Label>Signing Secret (optional)</Label>
              <Input
                placeholder="Optional HMAC secret for verification"
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                type="password"
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="space-y-2">
                {AVAILABLE_EVENTS.map((ev) => (
                  <label
                    key={ev.id}
                    className="flex items-start gap-2.5 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={form.events.includes(ev.id)}
                      onCheckedChange={() => toggleEvent(ev.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">{ev.label}</p>
                      <p className="text-xs text-muted-foreground">{ev.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!form.name.trim() || !form.url.trim() || form.events.length === 0}
            >
              Add Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
