import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ExternalLink,
  Globe,
  FileText,
  Trash2,
} from "lucide-react";
import { useTaskResults, useSavedResults, exportToCsv, exportSavedResultsToCsv, type TaskResult } from "@/hooks/useTaskResults";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { toast } from "@/hooks/use-toast";

const typeIcons: Record<string, typeof Globe> = {
  scrape: FileText,
  search: Search,
  crawl: Globe,
  browse: Globe,
};

const typeColors: Record<string, string> = {
  scrape: "text-blue-400",
  search: "text-emerald-400",
  crawl: "text-purple-400",
  browse: "text-amber-400",
};

export function ResultsDashboard() {
  const { results, allResults, loading, filter, setFilter, search, setSearch } = useTaskResults();
  const saved = useSavedResults();
  const [open, setOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TaskResult | null>(null);
  const [activeTab, setActiveTab] = useState<"tasks" | "saved">("saved");

  const stats = {
    total: allResults.length,
    completed: allResults.filter((r) => r.status === "completed").length,
    failed: allResults.filter((r) => r.status === "failed").length,
    running: allResults.filter((r) => r.status === "running").length,
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "failed": return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      case "running": return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />;
      default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const duration = (r: TaskResult) => {
    if (!r.started_at || !r.completed_at) return null;
    const ms = new Date(r.completed_at).getTime() - new Date(r.started_at).getTime();
    return ms < 60000 ? `${(ms / 1000).toFixed(1)}s` : `${(ms / 60000).toFixed(1)}m`;
  };

  const handleDeleteSaved = async (id: string) => {
    const error = await saved.deleteResult(id);
    if (error) toast({ title: "Failed to delete", variant: "destructive" });
    else toast({ title: "Deleted" });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative">
          <BarChart3 className="h-4 w-4" />
          {stats.running > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
              {stats.running}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[420px] sm:w-[520px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Results
          </SheetTitle>
        </SheetHeader>

        {/* Top-level tabs: Saved Results vs Task History */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-3 flex-1 flex flex-col min-h-0">
          <TabsList className="w-full">
            <TabsTrigger value="saved" className="flex-1 text-xs">Saved Results</TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1 text-xs">Task History</TabsTrigger>
          </TabsList>

          {/* Saved Results Tab */}
          <TabsContent value="saved" className="flex-1 flex flex-col min-h-0 mt-3">
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search saved results..."
                  value={saved.search}
                  onChange={(e) => saved.setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => exportSavedResultsToCsv(saved.results)} className="gap-1.5 shrink-0">
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
            </div>

            {/* Type filter */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {(["all", "scrape", "search", "crawl", "browse"] as const).map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={saved.filter === t ? "default" : "ghost"}
                  className="h-7 text-[11px] px-2.5"
                  onClick={() => saved.setFilter(t)}
                >
                  {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                </Button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
              {saved.loading ? (
                <div className="text-center text-sm text-muted-foreground py-12">Loading…</div>
              ) : Object.keys(saved.grouped).length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  No saved results yet. Use the "Save to History" button on any search, scrape, or crawl result.
                </div>
              ) : (
                Object.entries(saved.grouped).map(([date, items]) => (
                  <div key={date}>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">{date}</p>
                    <div className="space-y-1.5">
                      {items.map((r) => {
                        const Icon = typeIcons[r.task_type] || Globe;
                        const color = typeColors[r.task_type] || "text-muted-foreground";
                        return (
                          <div key={r.id} className="p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group">
                            <div className="flex items-start gap-2.5">
                              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", color)} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize">{r.task_type}</Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-foreground truncate mt-1">
                                  {r.query || r.task_type}
                                </p>
                                {/* Summary line */}
                                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                  {r.results_json?.type === 'search' && `${r.results_json.results?.length || 0} results`}
                                  {r.results_json?.type === 'crawl' && `${r.results_json.pages?.length || 0} pages`}
                                  {r.results_json?.type === 'scrape' && `${r.results_json.wordCount || 0} words`}
                                  {r.results_json?.type === 'browse' && (r.results_json.title || 'Browse result')}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteSaved(r.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Task History Tab */}
          <TabsContent value="tasks" className="flex-1 flex flex-col min-h-0 mt-3">
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: "Total", value: stats.total, color: "text-foreground" },
                { label: "Done", value: stats.completed, color: "text-green-500" },
                { label: "Failed", value: stats.failed, color: "text-destructive" },
                { label: "Running", value: stats.running, color: "text-primary" },
              ].map((s) => (
                <div key={s.label} className="text-center p-2 rounded-lg bg-muted/50">
                  <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => exportToCsv(results)} className="gap-1.5 shrink-0">
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
            </div>

            <div className="flex gap-1.5 mb-3">
              {(["all", "completed", "failed", "running"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "ghost"}
                  className="h-7 text-[11px] px-2.5"
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </Button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
              {loading ? (
                <div className="text-center text-sm text-muted-foreground py-12">Loading…</div>
              ) : results.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">No results found</div>
              ) : selectedResult ? (
                <div className="space-y-3">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedResult(null)}>← Back</Button>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {statusIcon(selectedResult.status)}
                      <span className="text-sm font-medium capitalize">{selectedResult.status}</span>
                      {duration(selectedResult) && (
                        <span className="text-[10px] text-muted-foreground ml-auto">{duration(selectedResult)}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Task</p>
                      <p className="text-sm">{selectedResult.input_data?.task || selectedResult.task_type}</p>
                    </div>
                    {selectedResult.error_message && (
                      <div className="space-y-1">
                        <p className="text-xs text-destructive">Error</p>
                        <p className="text-sm text-destructive/80 bg-destructive/5 p-2 rounded text-xs font-mono">
                          {selectedResult.error_message}
                        </p>
                      </div>
                    )}
                    {selectedResult.output_data?.output && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Output</p>
                        <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto max-h-48 whitespace-pre-wrap">
                          {typeof selectedResult.output_data.output === "string"
                            ? selectedResult.output_data.output
                            : JSON.stringify(selectedResult.output_data.output, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedResult.screenshots && selectedResult.screenshots.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Screenshots</p>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedResult.screenshots.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative group">
                              <img src={url} alt={`Screenshot ${i + 1}`} className="rounded border border-border/50 w-full" />
                              <ExternalLink className="absolute top-1 right-1 h-3 w-3 text-foreground opacity-0 group-hover:opacity-100" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedResult(r)}
                    className="w-full text-left p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">{statusIcon(r.status)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {r.input_data?.task || r.task_type}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          </span>
                          {duration(r) && (
                            <span className="text-[10px] text-muted-foreground">{duration(r)}</span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                            {r.status}
                          </span>
                        </div>
                        {r.error_message && (
                          <p className="text-[10px] text-destructive mt-1 truncate">{r.error_message}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
