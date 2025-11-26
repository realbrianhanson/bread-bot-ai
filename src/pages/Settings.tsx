import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showKeys, setShowKeys] = useState({ browserUse: false, anthropic: false });
  const [apiKeys, setApiKeys] = useState({
    browserUse: '',
    anthropic: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadApiKeys();
  }, []);

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
      }
      return acc;
    }, { browserUse: '', anthropic: '' });

    setApiKeys(keys || { browserUse: '', anthropic: '' });
  };

  const handleSaveApiKeys = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Save Browser Use key
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

      // Save Anthropic key
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

      toast.success('API keys saved successfully');
    } catch (error) {
      toast.error('Failed to save API keys');
    } finally {
      setIsLoading(false);
    }
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="glass-strong border-white/20 mb-6">
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Manage your API keys for Browser Use and Anthropic Claude
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

            <Button onClick={handleSaveApiKeys} disabled={isLoading} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Save API Keys
            </Button>
          </CardContent>
        </Card>

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
      </main>
    </div>
  );
}
