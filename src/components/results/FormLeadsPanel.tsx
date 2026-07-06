import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Inbox, Trash2, Download, RefreshCw, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Submission {
  id: string;
  source_type: 'app' | 'page';
  source_id: string;
  form_name: string | null;
  data: Record<string, unknown>;
  forwarded_status: 'sent' | 'failed' | 'none';
  created_at: string;
}

interface SiteLabel { id: string; name: string; kind: 'app' | 'page' }

function toCsv(rows: Submission[]): string {
  const keys = new Set<string>();
  rows.forEach((r) => Object.keys(r.data || {}).forEach((k) => keys.add(k)));
  const cols = ['submitted_at', 'form_name', 'forwarded_status', ...Array.from(keys)];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v);
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const lines = [cols.join(',')];
  for (const r of rows) {
    const row = [r.created_at, r.form_name ?? '', r.forwarded_status, ...Array.from(keys).map((k) => (r.data as any)?.[k])];
    lines.push(row.map(esc).join(','));
  }
  return lines.join('\n');
}

function download(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function FormLeadsPanel() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [labels, setLabels] = useState<Record<string, SiteLabel>>({});
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('form_submissions')
      .select('id, source_type, source_id, form_name, data, forwarded_status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500);
    const rows = (data as Submission[]) || [];
    setSubs(rows);

    const appIds = Array.from(new Set(rows.filter((r) => r.source_type === 'app').map((r) => r.source_id)));
    const pageIds = Array.from(new Set(rows.filter((r) => r.source_type === 'page').map((r) => r.source_id)));
    const nextLabels: Record<string, SiteLabel> = {};
    if (appIds.length) {
      const { data: apps } = await supabase.from('published_apps').select('id, name, slug').in('id', appIds);
      (apps || []).forEach((a: any) => { nextLabels[a.id] = { id: a.id, name: a.name || a.slug, kind: 'app' }; });
    }
    if (pageIds.length) {
      const { data: pages } = await supabase.from('shared_previews').select('id, title, slug').in('id', pageIds);
      (pages || []).forEach((p: any) => { nextLabels[p.id] = { id: p.id, name: p.title || p.slug || 'Untitled page', kind: 'page' }; });
    }
    setLabels(nextLabels);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open, user]);

  const grouped = useMemo(() => {
    const g = new Map<string, Submission[]>();
    for (const s of subs) {
      const k = `${s.source_type}:${s.source_id}`;
      if (!g.has(k)) g.set(k, []);
      g.get(k)!.push(s);
    }
    return Array.from(g.entries());
  }, [subs]);

  const del = async (id: string) => {
    const { error } = await supabase.from('form_submissions').delete().eq('id', id);
    if (error) { toast.error('Delete failed'); return; }
    setSubs((prev) => prev.filter((s) => s.id !== id));
  };

  const statusBadge = (s: Submission['forwarded_status']) => {
    if (s === 'sent') return <Badge variant="outline" className="gap-1 text-xs"><CheckCircle2 className="h-3 w-3 text-green-500" />Forwarded</Badge>;
    if (s === 'failed') return <Badge variant="outline" className="gap-1 text-xs"><XCircle className="h-3 w-3 text-destructive" />Forward failed</Badge>;
    return <Badge variant="outline" className="gap-1 text-xs text-muted-foreground"><MinusCircle className="h-3 w-3" />No webhook</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Form leads" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Form leads">
          <Inbox className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Inbox className="h-4 w-4" /> Form leads</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{subs.length} submissions across {grouped.length} sites</p>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} aria-label="Refresh leads">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="mt-4 space-y-6">
          {grouped.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground py-12 text-center">No form submissions yet. Publish a page or app with a form to start collecting leads.</p>
          )}
          {grouped.map(([key, rows]) => {
            const label = labels[rows[0].source_id];
            const name = label?.name || 'Unknown site';
            const kind = label?.kind || rows[0].source_type;
            return (
              <section key={key} className="border border-border rounded-lg p-4 bg-card">
                <header className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{name}</h3>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{kind} · {rows.length} lead{rows.length === 1 ? '' : 's'}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => download(`${name}-leads.csv`, toCsv(rows))} className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </Button>
                </header>
                <ul className="space-y-2">
                  {rows.map((r) => (
                    <li key={r.id} className="rounded-md border border-border/70 p-3 bg-background">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium text-foreground truncate">{r.form_name || 'Untitled form'}</span>
                          {statusBadge(r.forwarded_status)}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => del(r.id)} aria-label="Delete submission">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
                        {Object.entries(r.data || {}).map(([k, v]) => (
                          <div key={k} className="contents">
                            <dt className="text-muted-foreground font-mono">{k}</dt>
                            <dd className="text-foreground break-words">{typeof v === 'string' ? v : JSON.stringify(v)}</dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default FormLeadsPanel;