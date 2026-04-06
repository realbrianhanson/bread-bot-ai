import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Globe, FileText, Search, ExternalLink, ChevronDown, ChevronUp,
  Send, Download, Copy, Check, MousePointer, Save, Code, Image,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from '@/hooks/use-toast';
import { ExportResultsDropdown } from './ExportResultsDropdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/* ---------- types ---------- */
export interface ScrapeResult {
  type: 'scrape';
  url: string;
  title?: string;
  markdown?: string;
  wordCount?: number;
}

export interface CrawlResult {
  type: 'crawl';
  url: string;
  pages: { url: string; title?: string }[];
  status?: string;
  total?: number;
}

export interface SearchResult {
  type: 'search';
  query: string;
  results: { url: string; title?: string; description?: string; markdown?: string }[];
}

export interface BrowseResult {
  type: 'browse';
  url: string;
  title?: string;
  description?: string;
  screenshot?: string;
  extractedData?: Record<string, any>;
}

export type FirecrawlResult = ScrapeResult | CrawlResult | SearchResult | BrowseResult;

/* ---------- helpers ---------- */
function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
}

function truncateUrl(url: string, max = 60): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    const display = u.hostname.replace('www.', '') + path;
    return display.length > max ? display.slice(0, max) + '…' : display;
  } catch {
    return url.length > max ? url.slice(0, max) + '…' : url;
  }
}

/* ---------- unified action bar ---------- */
interface ActionBarProps {
  result: FirecrawlResult;
  onSendToAI?: (content: string) => void;
  onSaveAsFile?: (content: string, title: string) => void;
  onCopy: () => void;
  copied: boolean;
  onSaveToHistory: () => void;
  saving: boolean;
}

const ActionBar = ({ result, onSendToAI, onSaveAsFile, onCopy, copied, onSaveToHistory, saving }: ActionBarProps) => {
  const sendContent = () => {
    if (!onSendToAI) return;
    if (result.type === 'scrape') {
      onSendToAI(`Here is content scraped from ${result.url}. Please analyze:\n\n${(result as ScrapeResult).markdown || ''}`);
    } else if (result.type === 'search') {
      const sr = result as SearchResult;
      const summary = sr.results.map((r, i) => `${i + 1}. ${r.title} - ${r.url}\n   ${r.description || ''}`).join('\n');
      onSendToAI(`Here are search results for "${sr.query}":\n\n${summary}`);
    } else if (result.type === 'crawl') {
      const cr = result as CrawlResult;
      const pages = cr.pages.map((p, i) => `${i + 1}. ${p.title || p.url} - ${p.url}`).join('\n');
      onSendToAI(`Here are ${cr.pages.length} pages found on ${cr.url}:\n\n${pages}`);
    } else if (result.type === 'browse') {
      const br = result as BrowseResult;
      onSendToAI(`Browsed ${br.url}:\nTitle: ${br.title || 'Unknown'}\n${br.description || ''}\n${br.extractedData ? JSON.stringify(br.extractedData, null, 2) : ''}`);
    }
  };

  return (
    <div className="px-4 py-3 border-t border-border/30 flex flex-wrap gap-2">
      {onSendToAI && (
        <Button size="sm" variant="default" className="gap-1.5 text-xs h-8" onClick={sendContent}>
          <Send className="h-3 w-3" /> Send to AI
        </Button>
      )}
      <ExportResultsDropdown result={result} />
      <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-8" onClick={onCopy}>
        {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
      <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-8" onClick={onSaveToHistory} disabled={saving}>
        <Save className="h-3 w-3" />
        {saving ? 'Saving…' : 'Save to History'}
      </Button>
    </div>
  );
};

/* ---------- props ---------- */
interface FirecrawlResultsProps {
  result: FirecrawlResult;
  onSendToAI?: (content: string) => void;
  onScrapeUrl?: (url: string) => void;
  onSaveAsFile?: (content: string, title: string) => void;
}

/* ---------- component ---------- */
const FirecrawlResults = ({ result, onSendToAI, onScrapeUrl, onSaveAsFile }: FirecrawlResultsProps) => {
  const [expanded, setExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: 'Copied' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveToHistory = async () => {
    if (!user) {
      toast({ title: 'Sign in to save results', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const query = result.type === 'search' ? (result as SearchResult).query
        : result.type === 'scrape' ? (result as ScrapeResult).url
        : result.type === 'crawl' ? (result as CrawlResult).url
        : (result as BrowseResult).url;

      const { error } = await supabase.from('task_results').insert({
        user_id: user.id,
        task_type: result.type,
        query,
        results_json: result as any,
      });
      if (error) throw error;
      toast({ title: 'Saved to history' });
    } catch (err: any) {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const copyAll = () => {
    let text = '';
    if (result.type === 'scrape') {
      const r = result as ScrapeResult;
      text = `${r.title || r.url}\n${r.url}\n\n${r.markdown || ''}`;
    } else if (result.type === 'search') {
      const r = result as SearchResult;
      text = r.results.map((s, i) => `${i + 1}. ${s.title || s.url}\n   ${s.url}\n   ${s.description || ''}`).join('\n\n');
    } else if (result.type === 'crawl') {
      const r = result as CrawlResult;
      text = r.pages.map((p, i) => `${i + 1}. ${p.title || p.url}\n   ${p.url}`).join('\n');
    } else if (result.type === 'browse') {
      const r = result as BrowseResult;
      text = `${r.title || r.url}\n${r.url}\n${r.description || ''}\n${r.extractedData ? JSON.stringify(r.extractedData, null, 2) : ''}`;
    }
    handleCopy(text, 'all');
  };

  const actionBarProps = {
    result,
    onSendToAI,
    onSaveAsFile,
    onCopy: copyAll,
    copied: copiedId === 'all',
    onSaveToHistory: handleSaveToHistory,
    saving,
  };

  /* ---- scrape ---- */
  if (result.type === 'scrape') {
    const r = result as ScrapeResult;
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
        <Card className="border-primary/15 bg-card/80 backdrop-blur-sm overflow-hidden">
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <img src={getFaviconUrl(r.url)} alt="" className="h-4 w-4 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium truncate">{r.title || 'Scraped Content'}</span>
                <Badge variant="secondary" className="text-[10px]">{r.wordCount ?? 0} words</Badge>
              </div>
              {expanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
            </CollapsibleTrigger>

            <CollapsibleContent>
              {/* URL bar */}
              <div className="px-4 py-2 border-t border-border/30 flex items-center gap-2 text-xs text-muted-foreground">
                <Globe className="h-3 w-3 shrink-0" />
                <span className="truncate">{truncateUrl(r.url)}</span>
                <Badge variant="outline" className="text-[9px] ml-auto shrink-0">{getDomain(r.url)}</Badge>
              </div>

              {/* Preview data section */}
              {r.markdown && (
                <Collapsible>
                  <CollapsibleTrigger className="w-full px-4 py-2 border-t border-border/20 flex items-center gap-2 hover:bg-muted/20 transition-colors text-xs text-muted-foreground">
                    <Code className="h-3 w-3" />
                    <span>Preview Data</span>
                    <ChevronDown className="h-3 w-3 ml-auto" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 py-3 border-t border-border/20 max-h-64 overflow-y-auto bg-muted/10">
                      <pre className="text-[11px] text-muted-foreground font-mono whitespace-pre-wrap break-all">
                        {r.markdown.slice(0, 3000)}{r.markdown.length > 3000 ? '\n…(truncated)' : ''}
                      </pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Rendered markdown */}
              {r.markdown && (
                <div className="px-4 py-3 border-t border-border/20 max-h-80 overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{r.markdown}</ReactMarkdown>
                  </div>
                </div>
              )}

              <ActionBar {...actionBarProps} />
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </motion.div>
    );
  }

  /* ---- crawl ---- */
  if (result.type === 'crawl') {
    const r = result as CrawlResult;
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
        <Card className="border-primary/15 bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-border/30">
            <img src={getFaviconUrl(r.url)} alt="" className="h-4 w-4 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Crawl Results</span>
            <Badge variant="secondary" className="text-[10px]">{r.pages.length} pages</Badge>
            <Badge variant="outline" className="text-[9px] ml-auto">{getDomain(r.url)}</Badge>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {r.pages.map((page, i) => (
              <div
                key={i}
                className={`px-4 py-2.5 flex items-center gap-3 hover:bg-muted/20 transition-colors group ${i % 2 === 0 ? 'bg-muted/5' : ''}`}
              >
                <img src={getFaviconUrl(page.url)} alt="" className="h-3.5 w-3.5 rounded-sm shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{page.title || page.url}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{truncateUrl(page.url)}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onScrapeUrl && (
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]" onClick={() => onScrapeUrl(page.url)}>
                      <MousePointer className="h-3 w-3" /> Scrape
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.open(page.url, '_blank')}>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <ActionBar {...actionBarProps} />
        </Card>
      </motion.div>
    );
  }

  /* ---- search ---- */
  if (result.type === 'search') {
    const r = result as SearchResult;
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
        <Card className="border-primary/15 bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-border/30">
            <Search className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Search: "{r.query}"</span>
            <Badge variant="secondary" className="text-[10px]">{r.results.length} results</Badge>
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            {r.results.map((sr, i) => (
              <div key={i} className={`px-4 py-3 hover:bg-muted/20 transition-colors group ${i % 2 === 0 ? 'bg-muted/5' : ''}`}>
                <div className="flex items-start gap-3">
                  <img
                    src={getFaviconUrl(sr.url)}
                    alt=""
                    className="h-4 w-4 rounded-sm mt-0.5 shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <a
                      href={sr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline truncate block"
                    >
                      {sr.title || sr.url}
                    </a>
                    <p className="text-[11px] text-muted-foreground truncate mb-1 flex items-center gap-1.5">
                      <span>{truncateUrl(sr.url, 50)}</span>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">{getDomain(sr.url)}</Badge>
                    </p>
                    {sr.description && (
                      <p className="text-xs text-muted-foreground/80 line-clamp-2">{sr.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onScrapeUrl && (
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => onScrapeUrl(sr.url)}>
                        <FileText className="h-3 w-3" /> Scrape
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.open(sr.url, '_blank')}>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <ActionBar {...actionBarProps} />
        </Card>
      </motion.div>
    );
  }

  /* ---- browse ---- */
  if (result.type === 'browse') {
    const r = result as BrowseResult;
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
        <Card className="border-primary/15 bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-border/30">
            <img src={getFaviconUrl(r.url)} alt="" className="h-4 w-4 rounded-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium truncate">{r.title || 'Browse Result'}</span>
            <Badge variant="outline" className="text-[9px] ml-auto">{getDomain(r.url)}</Badge>
          </div>

          {/* Screenshot thumbnail */}
          {r.screenshot && (
            <div className="px-4 py-3 border-b border-border/20">
              <img
                src={r.screenshot}
                alt={r.title || 'Screenshot'}
                className="w-full max-h-48 object-cover object-top rounded-lg border border-border/30"
              />
            </div>
          )}

          {/* Summary */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-3 w-3 shrink-0" />
              <span className="truncate">{truncateUrl(r.url)}</span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-auto shrink-0" onClick={() => window.open(r.url, '_blank')}>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            {r.description && (
              <p className="text-xs text-muted-foreground/80">{r.description}</p>
            )}
            {r.extractedData && Object.keys(r.extractedData).length > 0 && (
              <div className="mt-2 rounded-lg border border-border/30 overflow-hidden">
                <div className="px-3 py-1.5 bg-muted/20 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Extracted Data
                </div>
                <div className="divide-y divide-border/20">
                  {Object.entries(r.extractedData).map(([key, value], idx) => (
                    <div key={key} className={`px-3 py-2 flex gap-3 text-xs ${idx % 2 === 0 ? 'bg-muted/5' : ''}`}>
                      <span className="text-muted-foreground font-medium min-w-[100px]">{key}</span>
                      <span className="text-foreground break-all">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <ActionBar {...actionBarProps} />
        </Card>
      </motion.div>
    );
  }

  return null;
};

export default FirecrawlResults;
