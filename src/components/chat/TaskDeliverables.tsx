import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Package
} from 'lucide-react';
import { TaskDeliverable } from '@/hooks/useBrowserTask';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface TaskDeliverablesProps {
  deliverables: TaskDeliverable[];
  taskSummary?: string;
  extractedData?: Record<string, any>;
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

  const handleCopy = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      toast({
        title: 'Copied',
        description: 'Content copied to clipboard',
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy content',
        variant: 'destructive',
      });
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

  if (deliverables.length === 0 && !taskSummary && !extractedData) {
    return null;
  }

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
            {/* Task Summary */}
            {taskSummary && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-green-500 mb-1">Summary</p>
                    <p className="text-sm text-foreground">{taskSummary}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleCopy(taskSummary, 'summary')}
                  >
                    {copiedId === 'summary' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleCopy(JSON.stringify(extractedData, null, 2), 'data')}
                    >
                      {copiedId === 'data' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDownload({
                        type: 'data',
                        name: 'Extracted Data',
                        content: JSON.stringify(extractedData, null, 2),
                        mimeType: 'application/json',
                        timestamp: new Date().toISOString()
                      })}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Deliverables List */}
            {deliverables.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Attachments</p>
                <div className="grid grid-cols-2 gap-2">
                  {deliverables.map((deliverable, index) => {
                    const Icon = getDeliverableIcon(deliverable.type);
                    return (
                      <div
                        key={`${deliverable.name}-${index}`}
                        className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/30 transition-colors"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{deliverable.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {deliverable.type}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {deliverable.url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => window.open(deliverable.url, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDownload(deliverable)}
                          >
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
