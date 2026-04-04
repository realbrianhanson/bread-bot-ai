import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, RefreshCw, Search, Trash2, Loader2, Sparkles, MessageCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function AgentMemoryPanel() {
  const [memoryContext, setMemoryContext] = useState('');
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [query, setQuery] = useState('');
  const [queryResponse, setQueryResponse] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('honcho-proxy', {
        body: { action: 'status' },
      });
      if (error) throw error;
      setIsAvailable(data?.available ?? false);
      if (data?.available) {
        loadContext();
      }
    } catch {
      setIsAvailable(false);
    }
  };

  const loadContext = async () => {
    setIsLoadingContext(true);
    try {
      const { data, error } = await supabase.functions.invoke('honcho-proxy', {
        body: {
          action: 'chat',
          query: 'Provide a comprehensive summary of everything you know about this user, organized by category: personal details, work/industry, preferences, communication style, and past topics of interest.',
        },
      });
      if (error) throw error;
      setMemoryContext(data?.response || 'No memory data yet.');
    } catch (err) {
      console.error('Failed to load memory context:', err);
      setMemoryContext('Failed to load memory data.');
    } finally {
      setIsLoadingContext(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;
    setIsQuerying(true);
    setQueryResponse('');
    try {
      const { data, error } = await supabase.functions.invoke('honcho-proxy', {
        body: { action: 'chat', query: query.trim() },
      });
      if (error) throw error;
      setQueryResponse(data?.response || 'No information found.');
    } catch (err) {
      console.error('Memory query failed:', err);
      setQueryResponse('Query failed. Please try again.');
    } finally {
      setIsQuerying(false);
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    try {
      const { error } = await supabase.functions.invoke('honcho-proxy', {
        body: { action: 'clear' },
      });
      if (error) throw error;
      setMemoryContext('');
      setQueryResponse('');
      toast.success('Memory cleared successfully');
    } catch (err) {
      console.error('Failed to clear memory:', err);
      toast.error('Failed to clear memory');
    } finally {
      setIsClearing(false);
    }
  };

  if (isAvailable === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <Card className="glass-strong border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            Agent Memory
          </CardTitle>
          <CardDescription>
            Memory system is not configured. Contact your administrator to enable Honcho integration.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-purple-400" />
          Agent Memory
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your AI agent learns from conversations to provide better, personalized results. Here's what it knows about you.
        </p>
      </div>

      {/* Memory Summary */}
      <Card className="relative overflow-hidden border-purple-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-indigo-500/5" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-purple-400" />
              What I Know About You
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadContext}
              disabled={isLoadingContext}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingContext ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {isLoadingContext ? (
            <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading memory...</span>
            </div>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
                {memoryContext || 'No memory data yet. Start chatting to build your profile!'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Query Memory */}
      <Card className="glass-strong border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-blue-400" />
            Query Memory
          </CardTitle>
          <CardDescription>
            Ask what the AI remembers about a specific topic
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What do you know about my business?"
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              className="flex-1"
            />
            <Button onClick={handleQuery} disabled={isQuerying || !query.trim()} size="sm">
              {isQuerying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {queryResponse && (
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
              <div className="flex items-start gap-2">
                <MessageCircle className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
                  {queryResponse}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete all learned data about you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2" disabled={isClearing}>
                {isClearing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Reset All Memory
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset All Memory?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete everything the AI has learned about you. This cannot be undone.
                  Your future conversations will start fresh without any personalization context.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, Reset Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Powered by</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Honcho</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
