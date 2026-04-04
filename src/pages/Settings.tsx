import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Eye, EyeOff, Crown, RefreshCw, Settings2, BarChart3, Shield, FileUp, Book, Globe, Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { AnalyticsDashboard } from '@/components/settings/AnalyticsDashboard';
import { SecurityScanner } from '@/components/settings/SecurityScanner';
import { DocumentationSearch } from '@/components/settings/DocumentationSearch';
import { DocumentParser } from '@/components/settings/DocumentParser';
import { WebScraper } from '@/components/settings/WebScraper';
import WorkflowAgentPanel from '@/components/agents/WorkflowAgentPanel';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { 
    tier, 
    subscribed, 
    subscriptionEnd, 
    canUseOwnKeys,
    chatMessagesUsed,
    chatMessagesLimit,
    browserTasksUsed,
    browserTasksLimit,
    codeExecutionsUsed,
    codeExecutionsLimit,
    getUsagePercentage,
    refreshSubscription
  } = useSubscription();
  const navigate = useNavigate();
  const [showKeys, setShowKeys] = useState({ browserUse: false, anthropic: false, e2b: false });
  const [apiKeys, setApiKeys] = useState({
    browserUse: '',
    anthropic: '',
    e2b: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);

  useEffect(() => {
    if (canUseOwnKeys) {
      loadApiKeys();
    }
  }, [canUseOwnKeys]);

  const loadApiKeys = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('api_keys')
      .select('provider, encrypted_key')
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to load API keys');
      return;
    }

    const keys = data?.reduce((acc, item) => {
      if (item.provider === 'browser_use') {
        acc.browserUse = item.encrypted_key;
      } else if (item.provider === 'anthropic') {
        acc.anthropic = item.encrypted_key;
      } else if (item.provider === 'e2b') {
        acc.e2b = item.encrypted_key;
      }
      return acc;
    }, { browserUse: '', anthropic: '', e2b: '' });

    setApiKeys(keys || { browserUse: '', anthropic: '', e2b: '' });
  };

  const handleSaveApiKeys = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      if (apiKeys.browserUse) {
        await supabase
          .from('api_keys')
          .upsert({
            user_id: user.id,
            provider: 'browser_use',
            encrypted_key: apiKeys.browserUse,
            is_active: true,
          });
      }

      if (apiKeys.anthropic) {
        await supabase
          .from('api_keys')
          .upsert({
            user_id: user.id,
            provider: 'anthropic',
            encrypted_key: apiKeys.anthropic,
            is_active: true,
          });
      }

      if (apiKeys.e2b) {
        await supabase
          .from('api_keys')
          .upsert({
            user_id: user.id,
            provider: 'e2b',
            encrypted_key: apiKeys.e2b,
            is_active: true,
          });
      }

      toast.success('API keys saved successfully');
    } catch (error) {
      toast.error('Failed to save API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Unable to open subscription portal');
    } finally {
      setManagingSubscription(false);
    }
  };

  const getTierBadgeVariant = () => {
    if (tier === 'lifetime') return 'default';
    if (tier === 'pro') return 'secondary';
    if (tier === 'starter') return 'outline';
    return 'outline';
  };

  return (
    <div className="min-h-screen gradient-primary">
      <header className="border-b border-white/10 glass">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="glass-strong border-white/20 grid w-full max-w-4xl grid-cols-7">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Agents</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="scraper" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Scraper</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-2">
              <Book className="h-4 w-4" />
              <span className="hidden sm:inline">Docs</span>
            </TabsTrigger>
          </TabsList>

          {/* Account Tab */}
          <TabsContent value="account" className="max-w-2xl space-y-6">
            <Card className="glass-strong border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {tier === 'lifetime' && <Crown className="h-5 w-5 text-yellow-500" />}
                  Subscription
                </CardTitle>
                <CardDescription>
                  Manage your subscription and usage
                </CardDescription>
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
                        <p className="text-xs text-muted-foreground">
                          Renews {new Date(subscriptionEnd).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshSubscription()}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <Label>Chat Messages</Label>
                      <span className="text-muted-foreground">
                        {chatMessagesUsed} / {chatMessagesLimit}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(chatMessagesUsed, chatMessagesLimit)} />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <Label>Browser Tasks</Label>
                      <span className="text-muted-foreground">
                        {browserTasksUsed} / {browserTasksLimit}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(browserTasksUsed, browserTasksLimit)} />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <Label>Code Executions</Label>
                      <span className="text-muted-foreground">
                        {codeExecutionsUsed} / {codeExecutionsLimit}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(codeExecutionsUsed, codeExecutionsLimit)} />
                  </div>
                </div>

                <div className="flex gap-2">
                  {subscribed && tier !== 'lifetime' && (
                    <Button
                      variant="outline"
                      onClick={handleManageSubscription}
                      disabled={managingSubscription}
                      className="flex-1"
                    >
                      Manage Subscription
                    </Button>
                  )}
                  {tier === 'free' || !subscribed ? (
                    <Button
                      onClick={() => navigate('/pricing')}
                      className="flex-1"
                    >
                      Upgrade Plan
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {canUseOwnKeys && (
              <Card className="glass-strong border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    API Keys (Lifetime Tier)
                  </CardTitle>
                  <CardDescription>
                    Use your own API keys for unlimited usage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="browser-use-key">Browser Use API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="browser-use-key"
                        type={showKeys.browserUse ? 'text' : 'password'}
                        value={apiKeys.browserUse}
                        onChange={(e) => setApiKeys({ ...apiKeys, browserUse: e.target.value })}
                        placeholder="Enter your Browser Use API key"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowKeys({ ...showKeys, browserUse: !showKeys.browserUse })}
                      >
                        {showKeys.browserUse ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="anthropic-key">Anthropic API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="anthropic-key"
                        type={showKeys.anthropic ? 'text' : 'password'}
                        value={apiKeys.anthropic}
                        onChange={(e) => setApiKeys({ ...apiKeys, anthropic: e.target.value })}
                        placeholder="Enter your Anthropic API key"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowKeys({ ...showKeys, anthropic: !showKeys.anthropic })}
                      >
                        {showKeys.anthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="e2b-key">E2B API Key (Code Sandbox)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="e2b-key"
                        type={showKeys.e2b ? 'text' : 'password'}
                        value={apiKeys.e2b}
                        onChange={(e) => setApiKeys({ ...apiKeys, e2b: e.target.value })}
                        placeholder="Enter your E2B API key"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowKeys({ ...showKeys, e2b: !showKeys.e2b })}
                      >
                        {showKeys.e2b ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button onClick={handleSaveApiKeys} disabled={isLoading} className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Save API Keys
                  </Button>
                </CardContent>
              </Card>
            )}

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

          {/* Agents Tab */}
          <TabsContent value="agents" className="max-w-5xl">
            <WorkflowAgentPanel />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="max-w-4xl">
            <AnalyticsDashboard />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="max-w-2xl">
            <SecurityScanner />
          </TabsContent>
          <TabsContent value="scraper" className="max-w-2xl">
            <WebScraper />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="max-w-2xl">
            <DocumentParser />
          </TabsContent>

          {/* Docs Tab */}
          <TabsContent value="docs" className="max-w-2xl">
            <DocumentationSearch />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
