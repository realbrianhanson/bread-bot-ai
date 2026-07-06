import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, Webhook, Info } from 'lucide-react';
import { toast } from 'sonner';

type Kind = 'app' | 'page';

interface Props {
  kind: Kind;
  siteId: string;
  formKey?: string | null;
}

const table = (k: Kind) => (k === 'app' ? 'published_apps' : 'shared_previews');

export function ForwardingConfig({ kind, siteId, formKey }: Props) {
  const [url, setUrl] = useState('');
  const [initial, setInitial] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from(table(kind))
        .select('forward_url')
        .eq('id', siteId)
        .maybeSingle();
      if (cancelled) return;
      setUrl(data?.forward_url ?? '');
      setInitial(data?.forward_url ?? '');
    })();
    return () => { cancelled = true; };
  }, [kind, siteId]);

  const validUrl = (v: string) => {
    if (!v) return true;
    try {
      const u = new URL(v);
      return u.protocol === 'https:';
    } catch { return false; }
  };

  const save = async () => {
    if (!validUrl(url)) { toast.error('Webhook URL must be HTTPS'); return; }
    setSaving(true);
    const { error } = await (supabase as any)
      .from(table(kind))
      .update({ forward_url: url.trim() || null })
      .eq('id', siteId);
    setSaving(false);
    if (error) { toast.error('Save failed'); return; }
    setInitial(url);
    toast.success('Webhook saved');
  };

  const sendTest = async () => {
    if (!url || !validUrl(url)) { toast.error('Enter a valid HTTPS URL first'); return; }
    setTesting(true); setTestResult(null);
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_name: 'test',
          fields: { name: 'Test Lead', email: 'test@example.com', message: 'Sample submission from GarlicBread.ai' },
          submitted_at: new Date().toISOString(),
          source: { type: kind, id: siteId },
          _test: true,
        }),
      });
      setTestResult(`${r.status} ${r.statusText}`);
      if (r.ok) toast.success(`Webhook responded: ${r.status}`);
      else toast.error(`Webhook responded: ${r.status}`);
    } catch (e: any) {
      setTestResult('Request failed: ' + (e?.message || 'unknown'));
      toast.error('Test request failed (possibly CORS or network).');
    } finally { setTesting(false); }
  };

  const dirty = url !== initial;

  return (
    <div className="space-y-3 border border-border rounded-md p-4 bg-muted/30">
      <div className="flex items-center gap-2">
        <Webhook className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Send leads to webhook</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Any submission on this {kind} is POSTed as JSON to your webhook. Works with GoHighLevel inbound webhooks, Zapier, Make, or your own endpoint.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="fwd-url" className="text-xs">Webhook URL (HTTPS)</Label>
        <Input
          id="fwd-url"
          type="url"
          placeholder="https://services.leadconnectorhq.com/hooks/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-invalid={!validUrl(url)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={save} disabled={!dirty || saving || !validUrl(url)}>
          {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}Save
        </Button>
        <Button size="sm" variant="outline" onClick={sendTest} disabled={!url || testing || !validUrl(url)} className="gap-1.5">
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Send test
        </Button>
        {testResult && <span className="text-xs text-muted-foreground">Response: {testResult}</span>}
      </div>
      {formKey && (
        <Alert className="text-xs">
          <Info className="h-3.5 w-3.5" />
          <AlertDescription>
            Form key for this {kind}: <code className="font-mono text-[11px]">{formKey}</code>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default ForwardingConfig;