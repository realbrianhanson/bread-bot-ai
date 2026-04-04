import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Search, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface KnowledgeEntry {
  id: string;
  topic: string;
  title: string;
  content: string;
  source_urls: string[] | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export function KnowledgeBasePanel() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('knowledge-base', {
        body: {
          action: searchQuery.trim() ? 'search' : 'list',
          userId: user.id,
          ...(searchQuery.trim() ? { query: searchQuery.trim() } : {}),
        },
      });
      if (error) throw error;
      setEntries((data?.entries as KnowledgeEntry[]) || []);
    } catch (err: any) {
      console.error('Failed to load knowledge:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, searchQuery]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleDelete = async (entryId: string) => {
    if (!user) return;
    try {
      await supabase.functions.invoke('knowledge-base', {
        body: { action: 'delete', userId: user.id, entryId },
      });
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      toast.success('Entry deleted');
    } catch {
      toast.error('Failed to delete entry');
    }
  };

  const handleClearAll = async () => {
    if (!user) return;
    try {
      await supabase.functions.invoke('knowledge-base', {
        body: { action: 'clear', userId: user.id },
      });
      setEntries([]);
      setShowClearConfirm(false);
      toast.success('Knowledge base cleared');
    } catch {
      toast.error('Failed to clear knowledge base');
    }
  };

  const topics = [...new Set(entries.map((e) => e.topic))];
  const wordCount = entries.reduce((acc, e) => acc + e.content.split(/\s+/).length, 0);

  return (
    <Card className="glass-strong border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Knowledge Base
        </CardTitle>
        <CardDescription>
          Your agent has researched {topics.length} topic{topics.length !== 1 ? 's' : ''} •{' '}
          {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'} •{' '}
          {wordCount.toLocaleString()} words
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge base..."
              className="pl-9"
            />
          </div>
          {entries.length > 0 && (
            showClearConfirm ? (
              <div className="flex gap-1">
                <Button size="sm" variant="destructive" onClick={handleClearAll}>
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowClearConfirm(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowClearConfirm(true)}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No matching entries found' : 'No knowledge entries yet. Research tasks will automatically populate this.'}
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {topics.map((topic) => (
                <div key={topic}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-3 first:mt-0">
                    {topic}
                  </h4>
                  {entries
                    .filter((e) => e.topic === topic)
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className={cn(
                          'p-3 rounded-lg border border-border/50 transition-all',
                          expandedId === entry.id ? 'bg-muted/30' : 'hover:bg-muted/20'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            className="flex-1 text-left"
                            onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                          >
                            <p className="text-sm font-medium text-foreground">{entry.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(entry.created_at).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {entry.content.split(/\s+/).length} words
                              </span>
                              {entry.tags?.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {expandedId === entry.id && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs text-foreground/80 whitespace-pre-wrap line-clamp-[20]">
                              {entry.content}
                            </p>
                            {entry.source_urls && entry.source_urls.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {entry.source_urls.map((url, i) => (
                                  <a
                                    key={i}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-2.5 w-2.5" />
                                    {new URL(url).hostname}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
