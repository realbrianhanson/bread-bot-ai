import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Image, 
  FileJson, 
  FileText, 
  File, 
  Copy, 
  Check,
  ExternalLink,
  Package,
  FileSpreadsheet,
  FileCode,
  ChevronDown,
  Link2,
} from 'lucide-react';
import { TaskDeliverable } from '@/hooks/useBrowserTask';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface TaskDeliverablesProps {
  deliverables: TaskDeliverable[];
  taskSummary?: string;
  extractedData?: Record<string, any>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(deliverable: TaskDeliverable) {
  const ft = deliverable.fileType || deliverable.mimeType || '';
  if (ft.includes('spreadsheet') || ft === 'xlsx' || ft === 'csv') return FileSpreadsheet;
  if (ft.includes('json') || ft === 'json') return FileCode;
  if (ft.includes('html') || ft === 'docx' || ft === 'markdown' || ft === 'md') return FileText;
  return File;
}

const getDeliverableIcon = (type: TaskDeliverable['type']) => {
  switch (type) {
    case 'screenshot':
      return Image;
    case 'data':
      return FileJson;
    case 'text':
      return FileText;
    case 'file':
      return File;
    default:
      return File;
  }
};

const TaskDeliverables = ({ deliverables, taskSummary, extractedData }: TaskDeliverablesProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileDeliverables = deliverables.filter(d => d.type === 'file');
  const otherDeliverables = deliverables.filter(d => d.type !== 'file');

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      toast({ title: 'Copied', description: 'Content copied to clipboard' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: 'Error', description: 'Failed to copy content', variant: 'destructive' });
    }
  };

  const handleDownload = (deliverable: TaskDeliverable) => {
    if (deliverable.url) {
      window.open(deliverable.url, '_blank');
    } else if (deliverable.content) {
      const blob = new Blob([deliverable.content], { type: deliverable.mimeType || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deliverable.name.toLowerCase().replace(/\s+/g, '-')}.${
        deliverable.mimeType?.includes('json') ? 'json' : 'txt'
      }`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadAll = () => {
    for (const d of fileDeliverables) {
      if (d.url) window.open(d.url, '_blank');
    }
  };

  if (deliverables.length === 0 && !taskSummary && !extractedData) return null;

  return (
    <Card className="bg-muted/20 backdrop-blur-sm border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-green-500" />
            <h3 className="font-semibold text-sm">Task Results</h3>
            <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-500">
              {deliverables.length} {deliverables.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {/* File Deliverables — shown first and prominently */}
            {fileDeliverables.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Generated Files</p>
                  {fileDeliverables.length > 1 && (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleDownloadAll}>
                      <Download className="h-3 w-3" />
                      Download All
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {fileDeliverables.map((deliverable, index) => {
                    const Icon = getFileIcon(deliverable);
                    return (
                      <div
                        key={`file-${index}`}
                        className="flex items-center gap-3 p-3 rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 to-accent/5 hover:shadow-md transition-all group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{deliverable.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {deliverable.fileType?.toUpperCase() || 'FILE'}
                            {deliverable.size ? ` · ${formatFileSize(deliverable.size)}` : ''}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {deliverable.url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleCopy(deliverable.url!, `file-link-${index}`)}
                              title="Copy link"
                            >
                              {copiedId === `file-link-${index}` ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <Link2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => handleDownload(deliverable)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Task Summary */}
            {taskSummary && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-green-500 mb-1">Summary</p>
                    <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-li:my-1 prose-ol:my-1.5 prose-ul:my-1.5 prose-headings:mt-3 prose-headings:mb-1" style={{ whiteSpace: 'pre-wrap' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{taskSummary}</ReactMarkdown>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleCopy(taskSummary, 'summary')}>
                    {copiedId === 'summary' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Extracted Data */}
            {extractedData && Object.keys(extractedData).length > 0 && (
              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-cyan-500 mb-1">Extracted Data</p>
                    <pre className="text-xs text-foreground/80 overflow-x-auto whitespace-pre-wrap font-mono bg-background/50 p-2 rounded">
                      {JSON.stringify(extractedData, null, 2)}
                    </pre>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleCopy(JSON.stringify(extractedData, null, 2), 'data')}>
                      {copiedId === 'data' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDownload({ type: 'data', name: 'Extracted Data', content: JSON.stringify(extractedData, null, 2), mimeType: 'application/json', timestamp: new Date().toISOString() })}>
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Other Deliverables (screenshots, data, text) */}
            {otherDeliverables.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Attachments</p>
                <div className="grid grid-cols-2 gap-2">
                  {otherDeliverables.map((deliverable, index) => {
                    const Icon = getDeliverableIcon(deliverable.type);
                    return (
                      <div
                        key={`${deliverable.name}-${index}`}
                        className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/30 transition-colors"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{deliverable.name}</p>
                          <p className="text-[10px] text-muted-foreground">{deliverable.type}</p>
                        </div>
                        <div className="flex gap-1">
                          {deliverable.url && (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => window.open(deliverable.url, '_blank')}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDownload(deliverable)}>
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default TaskDeliverables;
