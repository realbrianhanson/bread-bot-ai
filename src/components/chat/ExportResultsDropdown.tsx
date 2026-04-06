import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Copy, FileText, Table, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { FirecrawlResult, ScrapeResult, CrawlResult, SearchResult, BrowseResult } from './FirecrawlResults';

interface ExportResultsDropdownProps {
  result: FirecrawlResult;
}

function formatResultText(result: FirecrawlResult): { title: string; body: string } {
  const ts = new Date().toLocaleString();

  if (result.type === 'scrape') {
    const r = result as ScrapeResult;
    return {
      title: r.title || `Scraped: ${r.url}`,
      body: `Source: ${r.url}\nDate: ${ts}\nWords: ${r.wordCount ?? 0}\n\n${r.markdown || '(no content)'}`,
    };
  }

  if (result.type === 'crawl') {
    const r = result as CrawlResult;
    const pages = r.pages.map((p, i) => `${i + 1}. ${p.title || p.url}\n   ${p.url}`).join('\n');
    return {
      title: `Crawl: ${r.url}`,
      body: `Source: ${r.url}\nDate: ${ts}\nPages found: ${r.pages.length}\n\n${pages}`,
    };
  }

  if (result.type === 'search') {
    const r = result as SearchResult;
    const items = r.results.map((s, i) => `${i + 1}. ${s.title || s.url}\n   ${s.url}\n   ${s.description || ''}`).join('\n\n');
    return {
      title: `Search: ${r.query}`,
      body: `Query: "${r.query}"\nDate: ${ts}\nResults: ${r.results.length}\n\n${items}`,
    };
  }

  return { title: 'Export', body: '' };
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function resultToCsv(result: FirecrawlResult): string {
  if (result.type === 'scrape') {
    return `"URL","Title","Word Count","Content"\n"${(result as ScrapeResult).url}","${((result as ScrapeResult).title || '').replace(/"/g, '""')}","${(result as ScrapeResult).wordCount ?? 0}","${((result as ScrapeResult).markdown || '').replace(/"/g, '""')}"`;
  }
  if (result.type === 'crawl') {
    const header = '"#","URL","Title"';
    const rows = (result as CrawlResult).pages.map((p, i) => `"${i + 1}","${p.url}","${(p.title || '').replace(/"/g, '""')}"`);
    return [header, ...rows].join('\n');
  }
  if (result.type === 'search') {
    const header = '"#","URL","Title","Description"';
    const rows = (result as SearchResult).results.map((r, i) => `"${i + 1}","${r.url}","${(r.title || '').replace(/"/g, '""')}","${(r.description || '').replace(/"/g, '""')}"`);
    return [header, ...rows].join('\n');
  }
  return '';
}

export function ExportResultsDropdown({ result }: ExportResultsDropdownProps) {
  const [generating, setGenerating] = useState(false);

  const { title, body } = formatResultText(result);
  const fullText = `${title}\n${'='.repeat(title.length)}\n\n${body}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullText);
    toast.success('Results copied to clipboard');
  };

  const handleTxt = () => {
    downloadBlob(fullText, `${title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)}.txt`, 'text/plain');
    toast.success('TXT file downloaded');
  };

  const handleCsv = () => {
    const csv = resultToCsv(result);
    downloadBlob(csv, `${title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)}.csv`, 'text/csv');
    toast.success('CSV file downloaded');
  };

  const handleDocx = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-file', {
        body: {
          type: 'docx',
          content: fullText,
          title,
          filename: title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().slice(0, 40),
        },
      });
      if (error) throw error;
      if (data?.fileUrl) {
        window.open(data.fileUrl, '_blank');
        toast.success('DOCX file generated');
      } else {
        // Fallback: download as txt with .docx hint
        downloadBlob(fullText, `${title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)}.txt`, 'text/plain');
        toast.success('File downloaded (plain text)');
      }
    } catch (err: any) {
      console.error('DOCX generation failed:', err);
      // Fallback to TXT
      downloadBlob(fullText, `${title.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40)}.txt`, 'text/plain');
      toast.success('Downloaded as TXT (DOCX generation unavailable)');
    } finally {
      setGenerating(false);
    }
  };

  const handleGoogleDocs = async () => {
    // Generate DOCX first, then offer to open in Google Docs
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-file', {
        body: {
          type: 'docx',
          content: fullText,
          title,
          filename: title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().slice(0, 40),
        },
      });
      if (error) throw error;

      if (data?.fileUrl) {
        // Open Google Docs with the file URL for import
        const googleDocsUrl = `https://docs.google.com/document/create`;
        window.open(googleDocsUrl, '_blank');
        // Also download the docx so user can upload it
        window.open(data.fileUrl, '_blank');
        toast.success('Google Docs opened & DOCX downloaded. Upload the file to Google Docs.');
      } else {
        // Fallback: open blank Google Doc and copy content
        await navigator.clipboard.writeText(fullText);
        window.open('https://docs.google.com/document/create', '_blank');
        toast.success('Google Docs opened. Content copied — paste it in the new document.');
      }
    } catch {
      // Fallback: copy and open Google Docs
      await navigator.clipboard.writeText(fullText);
      window.open('https://docs.google.com/document/create', '_blank');
      toast.success('Google Docs opened. Content copied — paste it in the new document.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" disabled={generating}>
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          Export Results
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={handleCopy} className="gap-2 text-xs">
          <Copy className="h-3.5 w-3.5" /> Copy All
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTxt} className="gap-2 text-xs">
          <FileText className="h-3.5 w-3.5" /> Download as TXT
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCsv} className="gap-2 text-xs">
          <Table className="h-3.5 w-3.5" /> Download as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDocx} className="gap-2 text-xs">
          <FileDown className="h-3.5 w-3.5" /> Download as DOCX
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleGoogleDocs} className="gap-2 text-xs">
          <FileText className="h-3.5 w-3.5 text-blue-500" /> Open in Google Docs
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
