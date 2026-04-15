import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Eye, EyeOff, Crown, RefreshCw, Settings2, BarChart3, Shield, Book, Globe, Bot, CheckCircle2, Unlink, Brain, Key, Plug, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { AnalyticsDashboard } from '@/components/settings/AnalyticsDashboard';
import { SecurityScanner } from '@/components/settings/SecurityScanner';
import { DocumentationSearch } from '@/components/settings/DocumentationSearch';
import WorkflowAgentPanel from '@/components/agents/WorkflowAgentPanel';
import { AgentMemoryPanel } from '@/components/settings/AgentMemoryPanel';
import { KnowledgeBasePanel } from '@/components/settings/KnowledgeBasePanel';

type KeyProvider = 'browserUse' | 'anthropic' | 'e2b' | 'firecrawl' | 'openai';

const API_KEY_FIELDS: { id: KeyProvider; provider: string; label: string; placeholder: string }[] = [
  { id: 'browserUse', provider: 'browser_use', label: 'Browser Use API Key', placeholder: 'bu-...' },
  { id: 'anthropic', provider: 'anthropic', label: 'Anthropic API Key', placeholder: 'sk-ant-...' },
  { id: 'e2b', provider: 'e2b', label: 'E2B API Key (Code Sandbox)', placeholder: 'e2b_...' },
  { id: 'firecrawl', provider: 'firecrawl', label: 'Firecrawl API Key', placeholder: 'fc-...' },
  { id: 'openai', provider: 'openai', label: 'OpenAI API Key', placeholder: 'sk-...' },
];

function maskKey(key: string): string {
  if (!key || key.length < 8) return key;
  const prefix = key.slice(0, key.indexOf('-') + 1 || 3);
  const suffix = key.slice(-4);
  return `${prefix}...${suffix}`;
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const {
    tier, subscribed, subscriptionEnd, canUseOwnKeys,
    chatMessagesUsed, chatMessagesLimit,
    browserTasksUsed, browserTasksLimit,
    codeExecutionsUsed, codeExecutionsLimit,
    getUsagePercentage, refreshSubscription,
  } = useSubscription();
  const navigate = useNavigate();

  const [showKeys, setShowKeys] = useState<Record<KeyProvider, boolean>>({
    browserUse: false, anthropic: false, e2b: false, firecrawl: false, openai: false,
  });
  const [apiKeys, setApiKeys] = useState<Record<KeyProvider, string>>({
    browserUse: '', anthropic: '', e2b: '', firecrawl: '', openai: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [googleIntegration, setGoogleIntegration] = useState<{ provider_email: string | null; connected: boolean }>({ connected: false, provider_email: null });
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  // Google integration
  const loadGoogleIntegration = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_integrations' as any)
      .select('provider_email')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .maybeSingle();
    setGoogleIntegration(data ? { connected: true, provider_email: (data as any).provider_email } : { connected: false, provider_email: null });
  }, [user]);

  useEffect(() => {
    loadGoogleIntegration();
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'google-oauth-success') {
        toast.success('Google account connected!');
        loadGoogleIntegration();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [loadGoogleIntegration]);

  const handleConnectGoogle = async () => {
    if (!user) return;
    setConnectingGoogle(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { setConnectingGoogle(false); return; }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth/authorize?token=${token}`;
    const popup = window.open(url, 'google-oauth', 'width=600,height=700,popup=yes');
    const interval = setInterval(() => {
      if (popup?.closed) { clearInterval(interval); setConnectingGoogle(false); loadGoogleIntegration(); }
    }, 500);
  };

  const handleDisconnectGoogle = async () => {
    if (!user) return;
    await supabase.from('user_integrations' as any).delete().eq('user_id', user.id).eq('provider', 'google');
    setGoogleIntegration({ connected: false, provider_email: null });
    toast.success('Google account disconnected');
  };

  // API Keys
  useEffect(() => { if (canUseOwnKeys) loadApiKeys(); }, [canUseOwnKeys]);

  const loadApiKeys = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('api_keys').select('provider, encrypted_key').eq('user_id', user.id);
    if (error) { toast.error('Failed to load API keys'); return; }
    const keys: Record<KeyProvider, string> = { browserUse: '', anthropic: '', e2b: '', firecrawl: '', openai: '' };
    for (const item of data || []) {
      const field = API_KEY_FIELDS.find(f => f.provider === item.provider);
      if (field) keys[field.id] = item.encrypted_key;
    }
    setApiKeys(keys);
  };

  const handleSaveApiKeys = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const keysToSave = API_KEY_FIELDS.filter(f => apiKeys[f.id]).map(f => ({ provider: f.provider, key: apiKeys[f.id] }));
      for (const { provider, key } of keysToSave) {
        const { error } = await supabase.functions.invoke('manage-api-keys', { body: { action: 'save', provider, key } });
        if (error) throw error;
      }
      toast.success('API keys saved successfully');
    } catch { toast.error('Failed to save API keys'); }
    finally { setIsLoading(false); }
  };

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch { toast.error('Unable to open subscription portal'); }
    finally { setManagingSubscription(false); }
  };

  const getTierBadgeVariant = () => {
    if (tier === 'lifetime') return 'default' as const;
    if (tier === 'pro') return 'secondary' as const;
    return 'outline' as const;
  };

  useEffect(() => {
    const t = requestAnimationFrame(() => setPageReady(true));
    return () => cancelAnimationFrame(t);
  }, []);

  if (!pageReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" style={{ background: 'linear-gradient(135deg, hsl(var(--gradient-from) / 0.03), hsl(var(--gradient-to) / 0.02))' }}>
      <header className="border-b border-white/10 glass">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="plan" className="space-y-6">
          <TabsList className="glass-strong border-white/20 flex w-full max-w-5xl overflow-x-auto no-scrollbar md:grid md:grid-cols-10">
            <TabsTrigger value="plan" className="flex items-center gap-2 shrink-0">
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">Plan</span>
            </TabsTrigger>
            <TabsTrigger value="keys" className="flex items-center gap-2 shrink-0">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Keys</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2 shrink-0">
              <Plug className="h-4 w-4" />
              <span className="hidden sm:inline">Integrations</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 shrink-0">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 shrink-0">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2 shrink-0">
              <Book className="h-4 w-4" />
              <span className="hidden sm:inline">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2 shrink-0">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Agents</span>
            </TabsTrigger>
            <TabsTrigger value="memory" className="flex items-center gap-2 shrink-0">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Memory</span>
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2 shrink-0">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Knowledge</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2 shrink-0">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
          </TabsList>

          {/* Plan & Usage */}
          <TabsContent value="plan" className="max-w-2xl space-y-6">
            <Card className="glass-strong border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {tier === 'lifetime' && <Crown className="h-5 w-5 text-yellow-500" />}
                  Plan & Usage
                </CardTitle>
                <CardDescription>Current billing period usage and subscription management</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Current Plan</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getTierBadgeVariant()}>
                        {tier === 'lifetime' ? 'Lifetime' : tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </Badge>
                      {subscribed && subscriptionEnd && tier !== 'lifetime' && (
                        <p className="text-xs text-muted-foreground">Renews {new Date(subscriptionEnd).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refreshSubscription()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Chat Messages', used: chatMessagesUsed, limit: chatMessagesLimit },
                    { label: 'Browser Tasks', used: browserTasksUsed, limit: browserTasksLimit },
                    { label: 'Code Executions', used: codeExecutionsUsed, limit: codeExecutionsLimit },
                  ].map(q => (
                    <div key={q.label}>
                      <div className="flex justify-between text-sm mb-2">
                        <Label>{q.label}</Label>
                        <span className="text-muted-foreground">{q.used} / {q.limit}</span>
                      </div>
                      <Progress value={getUsagePercentage(q.used, q.limit)} />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  {subscribed && tier !== 'lifetime' && (
                    <Button variant="outline" onClick={handleManageSubscription} disabled={managingSubscription} className="flex-1">
                      Manage Subscription
                    </Button>
                  )}
                  {(tier === 'free' || !subscribed) && (
                    <Button onClick={() => navigate('/pricing')} className="flex-1">Upgrade Plan</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys */}
          <TabsContent value="keys" className="max-w-2xl">
            <Card className="glass-strong border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  {canUseOwnKeys
                    ? 'Use your own API keys for unlimited usage. Keys are encrypted before storage.'
                    : 'Upgrade to Lifetime tier to use your own API keys.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {!canUseOwnKeys ? (
                  <div className="text-center py-8 space-y-3">
                    <Key className="h-10 w-10 mx-auto text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Custom API keys are available on the Lifetime plan.</p>
                    <Button size="sm" variant="outline" onClick={() => navigate('/pricing')}>View Plans</Button>
                  </div>
                ) : (
                  <>
                    {API_KEY_FIELDS.map(field => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={`key-${field.id}`}>{field.label}</Label>
                        <div className="flex gap-2">
                          <Input
                            id={`key-${field.id}`}
                            type={showKeys[field.id] ? 'text' : 'password'}
                            value={apiKeys[field.id]}
                            onChange={(e) => setApiKeys(prev => ({ ...prev, [field.id]: e.target.value }))}
                            placeholder={field.placeholder}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowKeys(prev => ({ ...prev, [field.id]: !prev[field.id] }))}
                          >
                            {showKeys[field.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {apiKeys[field.id] && !showKeys[field.id] && (
                          <p className="text-[10px] text-muted-foreground font-mono">{maskKey(apiKeys[field.id])}</p>
                        )}
                      </div>
                    ))}
                    <Button onClick={handleSaveApiKeys} disabled={isLoading} className="w-full">
                      <Save className="mr-2 h-4 w-4" />
                      Save API Keys
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations" className="max-w-2xl">
            <Card className="glass-strong border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plug className="h-5 w-5" />
                  Integrations
                </CardTitle>
                <CardDescription>Connect external services to extend agent capabilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/30">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-background flex items-center justify-center border border-border/50">
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Google Docs & Drive</p>
                      {googleIntegration.connected ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-muted-foreground">{googleIntegration.provider_email || 'Connected'}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Create docs from research results</p>
                      )}
                    </div>
                  </div>
                  {googleIntegration.connected ? (
                    <Button variant="outline" size="sm" onClick={handleDisconnectGoogle} className="gap-1.5">
                      <Unlink className="h-3.5 w-3.5" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleConnectGoogle} disabled={connectingGoogle}>
                      {connectingGoogle ? 'Connecting...' : 'Connect'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="max-w-4xl">
            <AnalyticsDashboard />
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="max-w-2xl">
            <SecurityScanner />
          </TabsContent>

          {/* Docs */}
          <TabsContent value="docs" className="max-w-2xl">
            <DocumentationSearch />
          </TabsContent>

          {/* Agents */}
          <TabsContent value="agents" className="max-w-5xl">
            <WorkflowAgentPanel />
          </TabsContent>

          {/* Memory */}
          <TabsContent value="memory" className="max-w-2xl">
            <AgentMemoryPanel />
          </TabsContent>

          {/* Knowledge Base */}
          <TabsContent value="knowledge" className="max-w-2xl">
            <KnowledgeBasePanel />
          </TabsContent>

          {/* Account */}
          <TabsContent value="account" className="max-w-2xl">
            <Card className="glass-strong border-white/20">
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>Manage your account settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
                </div>
                <Button variant="destructive" onClick={signOut} className="w-full">
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
