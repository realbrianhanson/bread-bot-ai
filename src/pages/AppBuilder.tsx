import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Hammer, Square, ExternalLink, Loader2, Sparkles, Zap, History, Wand2, Bug, Rocket, Download, Copy, EyeOff, PlayCircle, CheckCircle2 } from 'lucide-react';
import garlicSpin from '@/assets/garlic-spin.png';

interface BuildLogEntry {
  t: string;
  m: string;
}

interface BuildTask {
  id: string;
  status: string;
  error_message: string | null;
  completed_at: string | null;
  input_data: {
    prompt?: string;
    model?: string;
    parent_task_id?: string;
    edit?: boolean;
  } | null;
  output_data: {
    preview_url?: string;
    current_step?: string;
    phase?: string;
    summary?: string;
    files_changed?: number;
    snapshot_path?: string;
    parent_task_id?: string;
    sandbox_id?: string;
    log?: BuildLogEntry[];
    published_app_id?: string;
    published_slug?: string;
    published_version?: number;
    published_at?: string;
    qa_task_id?: string;
    qa_report?: string;
    qa_pending?: boolean;
    needs_continue?: boolean;
  } | null;
}

const STATUS_STYLES: Record<string, string> = {
  initializing: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  running: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  completed: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  completed_partial: 'bg-amber-500/15 text-amber-700 border-amber-500/40',
  failed: 'bg-red-500/15 text-red-600 border-red-500/30',
  stopped: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
};

const SANDBOX_TTL_MS = 30 * 60 * 1000;

const CONTINUE_PROMPT = 'Continue where you left off. Finish any sections that were cut short, wire up any placeholder buttons, and make sure the whole app is complete and polished. Then run check_build and call finish.';

export default function AppBuilder() {
  const [prompt, setPrompt] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [model, setModel] = useState<'claude-sonnet-4-6' | 'claude-fable-5'>('claude-sonnet-4-6');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [task, setTask] = useState<BuildTask | null>(null);
  const [recentBuilds, setRecentBuilds] = useState<BuildTask[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isQaStarting, setIsQaStarting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [qaDispatched, setQaDispatched] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const isActive = task ? ['initializing', 'running'].includes(task.status) : false;
  const isTerminal = task ? ['completed', 'completed_partial', 'failed', 'stopped'].includes(task.status) : false;
  const isPartial = task?.status === 'completed_partial';
  const isComplete = task?.status === 'completed' || isPartial;
  const canEdit = isTerminal && !!(task?.output_data?.snapshot_path || task?.output_data?.sandbox_id);
  const previewExpired = isTerminal && !!task?.completed_at && Date.now() - new Date(task.completed_at).getTime() > SANDBOX_TTL_MS;
  const publishedSlug = task?.output_data?.published_slug;
  const publishedVersion = task?.output_data?.published_version;
  const publishedUrl = publishedSlug ? `${(import.meta.env.VITE_SUPABASE_URL as string) || ''}/functions/v1/serve-app/${publishedSlug}/` : null;

  const loadRecentBuilds = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('id, status, error_message, completed_at, input_data, output_data')
      .eq('task_type', 'app_build')
      .order('created_at', { ascending: false })
      .limit(8);
    if (data) setRecentBuilds(data as BuildTask[]);
  }, []);

  useEffect(() => {
    loadRecentBuilds();
  }, [loadRecentBuilds]);

  useEffect(() => {
    if (!taskId) return;

    let cancelled = false;

    const fetchStatus = async () => {
      const { data, error } = await supabase.functions.invoke('sandbox-manager', {
        body: { action: 'status', taskId },
      });
      if (!cancelled && !error && data?.task) setTask(data.task as BuildTask);
    };
    fetchStatus();

    const channel = supabase
      .channel(`app-build-${taskId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `id=eq.${taskId}` },
        (payload) => {
          const next = payload.new as BuildTask;
          setTask(next);
          if (['completed', 'completed_partial', 'failed', 'stopped'].includes(next.status)) {
            loadRecentBuilds();
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [taskId, loadRecentBuilds]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task?.output_data?.log?.length]);

  // Auto-dispatch QA on first observation of a completed build with qa_pending.
  useEffect(() => {
    if (!task || !taskId) return;
    if (task.status !== 'completed') return;
    if (!task.output_data?.qa_pending) return;
    if (task.output_data?.qa_task_id) return;
    if (qaDispatched === taskId) return;
    setQaDispatched(taskId);
    (async () => {
      const url = task.output_data?.preview_url;
      if (!url) return;
      try {
        const appDesc = task.input_data?.prompt ? ` The app was built from this brief: "${task.input_data.prompt.slice(0, 400)}".` : '';
        const qaTask = `Open ${url} and act as a meticulous QA tester.${appDesc} Click every navigation link and button, fill and submit any forms with realistic test data, scroll through every section, and check that nothing is broken, overlapping, or unreadable. Then give a concise QA report: 1) what works, 2) what is broken or looks off, 3) the top 3 improvements you would make.`;
        const { data, error } = await supabase.functions.invoke('browser-task', { body: { task: qaTask, metadata: { source: 'auto_qa', build_task_id: taskId } } });
        if (error || !data?.taskId) {
          // Quota or other rejection — silently mark qa_pending false so we don't retry every render
          await supabase.functions.invoke('sandbox-manager', { body: { action: 'attach_qa', taskId, report: null } });
          return;
        }
        await supabase.functions.invoke('sandbox-manager', { body: { action: 'attach_qa', taskId, qaTaskId: data.taskId } });
      } catch (e) {
        console.error('auto-QA dispatch failed:', e);
      }
    })();
  }, [task, taskId, qaDispatched]);

  // When a QA task id is present, poll for its result and persist when done.
  useEffect(() => {
    const qaId = task?.output_data?.qa_task_id;
    if (!qaId || !taskId) return;
    if (task?.output_data?.qa_report) return;
    let cancelled = false;
    const poll = async () => {
      const { data: qa } = await supabase.from('tasks').select('id, status, output_data').eq('id', qaId).maybeSingle();
      if (cancelled || !qa) return;
      if (['finished', 'completed', 'failed', 'stopped'].includes(qa.status)) {
        const od = (qa.output_data || {}) as any;
        const report = od.output || od.summary || (od.actions ? JSON.stringify(od.actions).slice(0, 4000) : '') || 'QA finished with no report.';
        await supabase.functions.invoke('sandbox-manager', { body: { action: 'attach_qa', taskId, report } });
      }
    };
    const interval = setInterval(poll, 8000);
    poll();
    return () => { cancelled = true; clearInterval(interval); };
  }, [task?.output_data?.qa_task_id, task?.output_data?.qa_report, taskId]);

  const startBuild = async () => {
    if (prompt.trim().length < 10) {
      toast({ title: 'Add more detail', description: 'Describe the app you want in at least a sentence.', variant: 'destructive' });
      return;
    }
    setIsStarting(true);
    setTask(null);
    try {
      const { data, error } = await supabase.functions.invoke('sandbox-manager', {
        body: { action: 'create', prompt: prompt.trim(), model },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      setTaskId(data.taskId);
      toast({ title: 'Build started', description: 'Spinning up your sandbox — preview appears in ~60-90 seconds.' });
    } catch (e: any) {
      toast({ title: 'Failed to start build', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setIsStarting(false);
    }
  };

  const sendEdit = async (overridePrompt?: string) => {
    const usePrompt = (overridePrompt ?? editPrompt).trim();
    if (!taskId || usePrompt.length < 5) {
      toast({ title: 'Describe your change', description: 'Tell the agent what to update.', variant: 'destructive' });
      return;
    }
    setIsStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('sandbox-manager', {
        body: { action: 'edit', taskId, prompt: usePrompt, model },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      setEditPrompt('');
      setTask(null);
      setTaskId(data.taskId);
      toast({ title: 'Edit started', description: 'Resuming your build — fast if the sandbox is still warm.' });
    } catch (e: any) {
      toast({ title: 'Failed to start edit', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setIsStarting(false);
    }
  };

  const publishBuild = async () => {
    if (!taskId) return;
    setIsPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sandbox-manager', { body: { action: 'publish', taskId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: publishedSlug ? `Republished v${data.version}` : 'Published', description: 'Live at ' + data.url });
    } catch (e: any) {
      toast({ title: 'Publish failed', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setIsPublishing(false);
    }
  };

  const unpublishBuild = async () => {
    if (!taskId) return;
    setIsPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sandbox-manager', { body: { action: 'unpublish', taskId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Unpublished', description: 'Your app is no longer public.' });
    } catch (e: any) {
      toast({ title: 'Unpublish failed', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setIsPublishing(false);
    }
  };

  const exportBuild = async () => {
    if (!taskId) return;
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('sandbox-manager', { body: { action: 'export', taskId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      window.open(data.url, '_blank', 'noopener');
      toast({ title: 'Download ready', description: 'Zip is opening — link expires in 10 minutes.' });
    } catch (e: any) {
      toast({ title: 'Export failed', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const copyPublishedUrl = async () => {
    if (!publishedUrl) return;
    try {
      await navigator.clipboard.writeText(publishedUrl);
      toast({ title: 'URL copied' });
    } catch { /* ignore */ }
  };

  const applyQaFixes = () => {
    const report = task?.output_data?.qa_report;
    if (!report) return;
    const fixPrompt = `A QA agent tested the app and reported the following. Please fix every "broken or looks off" issue and the top improvements, then run check_build and finish.\n\n${report}`;
    setEditPrompt(fixPrompt);
    sendEdit(fixPrompt);
  };

  const runQA = async () => {
    const url = task?.output_data?.preview_url;
    if (!url) return;
    setIsQaStarting(true);
    try {
      const appDesc = task?.input_data?.prompt ? ` The app was built from this brief: "${task.input_data.prompt.slice(0, 400)}".` : '';
      const qaTask = `Open ${url} and act as a meticulous QA tester.${appDesc} Click every navigation link and button, fill and submit any forms with realistic test data, scroll through every section, and check that nothing is broken, overlapping, or unreadable. Then give a concise QA report: 1) what works, 2) what is broken or looks off, 3) the top 3 improvements you would make.`;
      const { data, error } = await supabase.functions.invoke('browser-task', { body: { task: qaTask, metadata: { source: 'manual_qa', build_task_id: taskId } } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (taskId && data?.taskId) {
        await supabase.functions.invoke('sandbox-manager', { body: { action: 'attach_qa', taskId, qaTaskId: data.taskId } });
      }
      toast({ title: 'QA agent dispatched', description: 'The browser agent is now testing your app. Watch it in your tasks.' });
    } catch (e: any) {
      toast({ title: 'Failed to start QA', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setIsQaStarting(false);
    }
  };

  const openBuild = (b: BuildTask) => {
    if (isActive) return;
    setTask(null);
    setEditPrompt('');
    setTaskId(b.id);
  };

  const previewUrl = task?.output_data?.preview_url;
  const log = task?.output_data?.log || [];
  const qaReport = task?.output_data?.qa_report;
  const qaRunning = !!task?.output_data?.qa_task_id && !qaReport;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Hammer className="h-5 w-5 text-primary" /> App Builder
              <Badge variant="outline" className="text-xs">Beta</Badge>
            </h1>
            <p className="text-xs text-muted-foreground">Agent-built React apps with a live sandbox preview</p>
          </div>
        </div>
        {task && (
          <div className="flex items-center gap-2">
            {task.input_data?.edit && <Badge variant="outline" className="text-xs">edit</Badge>}
            {publishedSlug && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                <Rocket className="h-3 w-3 mr-1" /> published v{publishedVersion}
              </Badge>
            )}
            <Badge variant="outline" className={STATUS_STYLES[task.status] || ''}>
              {isActive && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {task.status === 'completed_partial' ? 'partial' : task.status}
            </Badge>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] h-[calc(100vh-73px)]">
        {/* Left: controls + log */}
        <div className="border-r border-border p-5 flex flex-col gap-4 overflow-hidden">
          <Textarea
            placeholder="Describe the app you want. e.g. A landing page for an AI marketing agency with hero, services grid, testimonials, pricing, and a contact form with validation."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={isActive}
          />

          <div className="flex gap-2">
            <Button
              variant={model === 'claude-sonnet-4-6' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setModel('claude-sonnet-4-6')}
              disabled={isActive}
            >
              <Zap className="h-4 w-4 mr-1" /> Fast (Sonnet)
            </Button>
            <Button
              variant={model === 'claude-fable-5' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setModel('claude-fable-5')}
              disabled={isActive}
            >
              <Sparkles className="h-4 w-4 mr-1" /> Max (Fable 5)
            </Button>
          </div>

          {isActive ? (
            <Button variant="destructive" onClick={() => taskId && supabase.functions.invoke('sandbox-manager', { body: { action: 'stop', taskId } })} className="w-full">
              <Square className="h-4 w-4 mr-2" /> Stop Build
            </Button>
          ) : (
            <Button onClick={startBuild} disabled={isStarting} className="w-full">
              {isStarting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Hammer className="h-4 w-4 mr-2" />}
              Build New App
            </Button>
          )}

          {isPartial && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                <PlayCircle className="h-3 w-3" /> Build paused at step limit
              </p>
              <p className="text-xs text-muted-foreground">Everything so far is saved. Continue to finish it.</p>
              <Button size="sm" className="w-full" onClick={() => sendEdit(CONTINUE_PROMPT)} disabled={isStarting}>
                {isStarting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                Continue building
              </Button>
            </div>
          )}

          {canEdit && (
            <div className="rounded-md border border-border p-3 space-y-2 bg-muted/30">
              <p className="text-xs font-semibold flex items-center gap-1"><Wand2 className="h-3 w-3" /> Continue building</p>
              <Textarea
                placeholder="Describe your change. e.g. Make the hero darker and add an FAQ section."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className="min-h-[70px] resize-none text-sm"
              />
              <Button size="sm" onClick={() => sendEdit()} disabled={isStarting} className="w-full">
                {isStarting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                Send Edit
              </Button>
            </div>
          )}

          {isComplete && (
            <div className="rounded-md border border-border p-3 space-y-2 bg-card">
              <p className="text-xs font-semibold flex items-center gap-1"><Rocket className="h-3 w-3" /> Publish &amp; export</p>
              {publishedSlug && publishedUrl && (
                <div className="text-xs bg-muted rounded px-2 py-1.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                  <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline flex-1" title={publishedUrl}>
                    {publishedUrl.replace(/^https?:\/\//, '')}
                  </a>
                  <button aria-label="Copy URL" onClick={copyPublishedUrl} className="p-1 hover:bg-background rounded">
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" onClick={publishBuild} disabled={isPublishing}>
                  {isPublishing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Rocket className="h-4 w-4 mr-1" />}
                  {publishedSlug ? `Republish v${(publishedVersion || 0) + 1}` : 'Publish'}
                </Button>
                <Button size="sm" variant="outline" onClick={exportBuild} disabled={isExporting}>
                  {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                  Download code
                </Button>
              </div>
              {publishedSlug && (
                <Button size="sm" variant="ghost" onClick={unpublishBuild} disabled={isPublishing} className="w-full text-muted-foreground">
                  <EyeOff className="h-4 w-4 mr-1" /> Unpublish
                </Button>
              )}
              {previewUrl && !previewExpired && (
                <Button variant="outline" size="sm" onClick={runQA} disabled={isQaStarting} className="w-full">
                  {isQaStarting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bug className="h-4 w-4 mr-2" />}
                  Re-run QA
                </Button>
              )}
            </div>
          )}

          {isComplete && (qaRunning || qaReport) && (
            <div className="rounded-md border border-border p-3 space-y-2 bg-card">
              <p className="text-xs font-semibold flex items-center gap-1"><Bug className="h-3 w-3" /> QA report</p>
              {qaRunning && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Browser agent is testing your app…
                </p>
              )}
              {qaReport && (
                <>
                  <div className="text-xs whitespace-pre-wrap max-h-40 overflow-y-auto bg-muted/50 rounded p-2 leading-relaxed">
                    {qaReport}
                  </div>
                  <Button size="sm" onClick={applyQaFixes} disabled={isStarting} className="w-full">
                    <Wand2 className="h-4 w-4 mr-2" /> Apply these fixes
                  </Button>
                </>
              )}
            </div>
          )}

          {task?.output_data?.current_step && (
            <div className="text-sm font-medium text-foreground bg-muted rounded-md px-3 py-2">
              {isActive && <Loader2 className="h-3 w-3 mr-2 inline animate-spin" />}
              {task.output_data.current_step}
            </div>
          )}

          {task?.error_message && (
            <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
              {task.error_message}
            </div>
          )}

          {task?.output_data?.summary && task.status === 'completed' && (
            <div className="text-sm bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-2">
              {task.output_data.summary}
            </div>
          )}

          <div className="flex-1 overflow-y-auto rounded-md border border-border bg-muted/40 p-3 text-xs font-mono space-y-1 min-h-[100px]">
            {log.length === 0 && <span className="text-muted-foreground">Build log will stream here…</span>}
            {log.map((entry, i) => (
              <div key={i} className="text-muted-foreground">
                <span className="opacity-50">{new Date(entry.t).toLocaleTimeString()}</span>{' '}
                <span className="text-foreground">{entry.m}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          {recentBuilds.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><History className="h-3 w-3" /> Recent builds</p>
              <div className="max-h-[130px] overflow-y-auto space-y-1">
                {recentBuilds.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => openBuild(b)}
                    disabled={isActive}
                    className={`w-full text-left text-xs rounded-md border px-2 py-1.5 transition-colors hover:bg-muted ${b.id === taskId ? 'border-primary bg-muted/60' : 'border-border'}`}
                  >
                    <span className="line-clamp-1 text-foreground">{b.input_data?.prompt || 'Untitled build'}</span>
                    <span className="text-muted-foreground">{b.status}{b.input_data?.edit ? ' · edit' : ''}{b.output_data?.snapshot_path ? ' · saved' : ''}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: live preview */}
        <div className="relative bg-muted/20">
          {previewUrl && !previewExpired ? (
            <>
              <div className="absolute top-3 right-3 z-10">
                <Button asChild size="sm" variant="secondary">
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" /> Open
                  </a>
                </Button>
              </div>
              <iframe
                src={previewUrl}
                title="Live app preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </>
          ) : (
            isActive ? (
              <div className="h-full relative flex items-center justify-center overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'conic-gradient(from 0deg at 50% 50%, #ff006e, #fb5607, #ffbe0b, #8338ec, #3a86ff, #06d6a0, #ff006e)',
                    filter: 'blur(60px) saturate(1.4)',
                    animation: 'spin 18s linear infinite',
                  }}
                />
                <div
                  className="absolute inset-0 opacity-60 mix-blend-overlay"
                  style={{
                    background:
                      'radial-gradient(circle at 20% 30%, #ff00ff 0%, transparent 40%), radial-gradient(circle at 80% 70%, #00ffff 0%, transparent 40%), radial-gradient(circle at 50% 50%, #ffff00 0%, transparent 35%)',
                    animation: 'spin 25s linear infinite reverse',
                  }}
                />
                <div className="relative z-10 text-center">
                  <img
                    src={garlicSpin}
                    alt="Building"
                    style={{ animation: 'spin 3s linear infinite' }}
                    className="h-32 w-32 mx-auto mb-4 drop-shadow-2xl"
                  />
                  <p className="text-sm font-semibold text-white drop-shadow-lg">
                    Cooking up your app...
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center p-8">
                <div>
                  <Hammer className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {previewExpired
                      ? 'This sandbox has expired, but your files are saved. Send an edit to relaunch the live preview with your project restored.'
                      : 'Describe your app and hit Build. A real Vite dev server preview will appear here, updating live as the agent writes files.'}
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}