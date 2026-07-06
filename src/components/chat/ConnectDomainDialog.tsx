import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, Trash2, Loader2, Crown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sharedPreviewId: string;
  pageTitle: string;
}

interface DomainRow {
  id: string;
  domain: string;
  verification_token: string;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
}

const HOSTNAME_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const PAID_TIERS = new Set(['pro', 'enterprise', 'lifetime']);

export function ConnectDomainDialog({ open, onOpenChange, sharedPreviewId, pageTitle }: Props) {
  const { tier } = useSubscription();
  const navigate = useNavigate();
  const isPaid = PAID_TIERS.has((tier || 'free').toLowerCase());

  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('custom_domains')
      .select('id, domain, verification_token, verified, verified_at, created_at')
      .eq('shared_preview_id', sharedPreviewId)
      .order('created_at', { ascending: false });
    setDomains((data as DomainRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (open && isPaid) load(); /* eslint-disable-next-line */ }, [open, sharedPreviewId, isPaid]);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleAdd = async () => {
    const domain = newDomain.trim().toLowerCase();
    if (!HOSTNAME_RE.test(domain)) {
      toast.error('Enter a valid domain (example.com)');
      return;
    }
    setAdding(true);
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) { setAdding(false); return; }
    const { error } = await (supabase as any).from('custom_domains').insert({
      user_id: userId,
      shared_preview_id: sharedPreviewId,
      domain,
    });
    setAdding(false);
    if (error) {
      toast.error(error.message.includes('limit') ? 'You reached the 5-domain limit.' : error.message);
      return;
    }
    setNewDomain('');
    toast.success('Domain added — now add the DNS records below.');
    load();
  };

  const handleVerify = async (d: DomainRow) => {
    setVerifyingId(d.id);
    const { data, error } = await supabase.functions.invoke('verify-domain', { body: { domainId: d.id } });
    setVerifyingId(null);
    if (error) {
      toast.error(error.message || 'Verification failed');
      return;
    }
    if ((data as any)?.verified) {
      toast.success('Domain verified!');
      load();
    } else {
      toast.message('DNS record not found yet.', { description: 'It can take a few minutes to propagate.' });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('custom_domains').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Domain removed');
    load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Connect a custom domain</DialogTitle>
          <DialogDescription>Serve <span className="text-foreground font-medium">{pageTitle}</span> on your own domain.</DialogDescription>
        </DialogHeader>

        {!isPaid ? (
          <div className="space-y-4">
            <Alert>
              <Crown className="h-4 w-4" />
              <AlertDescription>Custom domains are available on Pro and Business plans.</AlertDescription>
            </Alert>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => { onOpenChange(false); navigate('/pricing'); }}>See plans</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="new-domain">Add a domain</Label>
                <Input id="new-domain" placeholder="example.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} disabled={adding} />
              </div>
              <Button className="self-end" onClick={handleAdd} disabled={adding || !newDomain.trim()}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add domain'}
              </Button>
            </div>

            <div className="space-y-3">
              {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
              {!loading && domains.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6">No domains connected yet.</div>
              )}
              {domains.map((d) => {
                const txtName = `_garlicbread-verify.${d.domain}`;
                return (
                  <div key={d.id} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-sm truncate">{d.domain}</span>
                        {d.verified ? (
                          <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Verified · Live</Badge>
                        ) : (
                          <Badge variant="secondary">Pending DNS</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!d.verified && (
                          <Button size="sm" variant="outline" onClick={() => handleVerify(d)} disabled={verifyingId === d.id}>
                            {verifyingId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                            Verify
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" aria-label="Remove domain" onClick={() => handleDelete(d.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {!d.verified && (
                      <div className="space-y-2 text-xs">
                        <p className="text-muted-foreground">Add these two DNS records at your registrar:</p>
                        <DnsRow label="TXT (verification)" name={txtName} value={d.verification_token} onCopy={copy} copied={copied === `t-${d.id}`} copyKey={`t-${d.id}`} />
                        <DnsRow label="CNAME (serving)" name={d.domain} value="pages.garlicbread.ai" onCopy={copy} copied={copied === `c-${d.id}`} copyKey={`c-${d.id}`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DnsRow({ label, name, value, onCopy, copied, copyKey }: {
  label: string; name: string; value: string;
  onCopy: (text: string, key: string) => void; copied: boolean; copyKey: string;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr_1fr_auto] gap-2 items-center bg-muted/30 rounded px-2 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <code className="font-mono truncate">{name}</code>
      <code className="font-mono truncate">{value}</code>
      <Button size="icon" variant="ghost" aria-label="Copy DNS value" className="h-6 w-6" onClick={() => onCopy(value, copyKey)}>
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}