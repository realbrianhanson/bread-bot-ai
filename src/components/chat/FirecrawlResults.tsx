import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Globe, FileText, Search, ExternalLink, ChevronDown, ChevronUp,
  Send, Download, Copy, Check, MousePointer,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from '@/hooks/use-toast';
import { ExportResultsDropdown } from './ExportResultsDropdown';

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
  results: { url: string; title?: string; description?: string }[];
}

export type FirecrawlResult = ScrapeResult | CrawlResult | SearchResult;

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

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: 'Copied' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  /* ---- scrape ---- */
  if (result.type === 'scrape') {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
        <Card className="border-primary/15 bg-card/80 backdrop-blur-sm overflow-hidden">
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Scraped Content</span>
                <Badge variant="secondary" className="text-[10px]">{result.wordCount ?? 0} words</Badge>
              </div>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>

            <CollapsibleContent>
              {/* meta */}
              <div className="px-4 py-2 border-t border-border/30 flex items-center gap-2 text-xs text-muted-foreground">
                <Globe className="h-3 w-3" />
                <span className="truncate">{result.url}</span>
                {result.title && <span className="hidden sm:inline">— {result.title}</span>}
              </div>

              {/* markdown body */}
              {result.markdown && (
                <div className="px-4 py-3 border-t border-border/20 max-h-80 overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.markdown}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* actions */}
              <div className="px-4 py-3 border-t border-border/30 flex flex-wrap gap-2">
                {onSendToAI && result.markdown && (
                  <Button size="sm" variant="default" className="gap-1.5 text-xs h-8" onClick={() => onSendToAI(`Here is the content scraped from ${result.url}. Please analyze and summarize this content:\n\n${result.markdown}`)}>
                    <Send className="h-3 w-3" /> Send to AI
                  </Button>
                )}
                {onSaveAsFile && result.markdown && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => onSaveAsFile(result.markdown!, result.title || 'scraped-content')}>
                    <Download className="h-3 w-3" /> Save as File
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-8" onClick={() => handleCopy(result.markdown || result.url, 'scrape-copy')}>
                  {copiedId === 'scrape-copy' ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />} Copy
                </Button>
                <ExportResultsDropdown result={result} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </motion.div>
    );
  }

  /* ---- crawl ---- */
  if (result.type === 'crawl') {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
        <Card className="border-primary/15 bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-border/30">
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Crawl Results</span>
            <Badge variant="secondary" className="text-[10px]">{result.pages.length} pages</Badge>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-border/20">
            {result.pages.map((page, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/20 transition-colors group">
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{page.title || page.url}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{page.url}</p>
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
          <div className="px-4 py-3 border-t border-border/30">
            <ExportResultsDropdown result={result} />
          </div>
        </Card>
      </motion.div>
    );
  }

  /* ---- search ---- */
  if (result.type === 'search') {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
        <Card className="border-primary/15 bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-border/30">
            <Search className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Search: "{result.query}"</span>
            <Badge variant="secondary" className="text-[10px]">{result.results.length} results</Badge>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-border/20">
            {result.results.map((r, i) => (
              <div key={i} className="px-4 py-3 hover:bg-muted/20 transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-primary">{r.title || r.url}</p>
                    <p className="text-[11px] text-muted-foreground truncate mb-1">{r.url}</p>
                    {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onScrapeUrl && (
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => onScrapeUrl(r.url)}>
                        <FileText className="h-3 w-3" /> Scrape
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.open(r.url, '_blank')}>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-border/30">
            <ExportResultsDropdown result={result} />
          </div>
        </Card>
      </motion.div>
    );
  }

  return null;
};

export default FirecrawlResults;
