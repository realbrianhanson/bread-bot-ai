import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ArrowRight
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

export interface ProcessStep {
  id: string;
  timestamp: string;
  action: string;
  details?: string;
  status: 'completed' | 'failed' | 'skipped';
  duration?: number;
}

export interface ProcessReport {
  taskId: string;
  taskDescription: string;
  startedAt: string;
  completedAt?: string;
  status: 'completed' | 'failed' | 'stopped';
  totalDuration: number;
  steps: ProcessStep[];
  summary?: string;
  errors?: string[];
}

interface ProcessDocumentationProps {
  report: ProcessReport;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

const formatTimestamp = (timestamp: string): string => {
  try {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  } catch {
    return timestamp;
  }
};

const ProcessDocumentation = ({ report }: ProcessDocumentationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateMarkdownReport = (): string => {
    const lines = [
      `# Task Execution Report`,
      ``,
      `**Task:** ${report.taskDescription}`,
      `**ID:** ${report.taskId}`,
      `**Status:** ${report.status.toUpperCase()}`,
      `**Started:** ${new Date(report.startedAt).toLocaleString()}`,
      report.completedAt ? `**Completed:** ${new Date(report.completedAt).toLocaleString()}` : '',
      `**Duration:** ${formatDuration(report.totalDuration)}`,
      ``,
      `## Summary`,
      report.summary || 'No summary available.',
      ``,
      `## Execution Steps`,
      ``,
    ];

    report.steps.forEach((step, index) => {
      const statusIcon = step.status === 'completed' ? '✓' : step.status === 'failed' ? '✗' : '○';
      lines.push(`${index + 1}. ${statusIcon} **${step.action}** (${formatTimestamp(step.timestamp)})`);
      if (step.details) {
        lines.push(`   - ${step.details}`);
      }
      if (step.duration) {
        lines.push(`   - Duration: ${step.duration}ms`);
      }
      lines.push('');
    });

    if (report.errors && report.errors.length > 0) {
      lines.push(`## Errors`);
      lines.push('');
      report.errors.forEach(error => {
        lines.push(`- ${error}`);
      });
    }

    return lines.filter(Boolean).join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateMarkdownReport());
      setCopied(true);
      toast({
        title: 'Copied',
        description: 'Report copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy report',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = () => {
    const markdown = generateMarkdownReport();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-report-${report.taskId.slice(0, 8)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-500';
      case 'failed':
        return 'bg-red-500/20 text-red-500';
      case 'stopped':
        return 'bg-yellow-500/20 text-yellow-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="bg-muted/20 backdrop-blur-sm border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <h3 className="font-semibold text-sm">Execution Report</h3>
            <Badge className={`text-xs ${getStatusColor(report.status)}`}>
              {report.status}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(report.totalDuration)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
            >
              <Download className="h-3 w-3" />
            </Button>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {/* Summary */}
            {report.summary && (
              <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">Summary</p>
                <p className="text-sm">{report.summary}</p>
              </div>
            )}

            {/* Steps Timeline */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Execution Steps ({report.steps.length})
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {report.steps.map((step, index) => (
                  <div 
                    key={step.id}
                    className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-muted/30"
                  >
                    <div className="shrink-0 mt-0.5">
                      {step.status === 'completed' && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      )}
                      {step.status === 'failed' && (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      )}
                      {step.status === 'skipped' && (
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{step.action}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTimestamp(step.timestamp)}
                        </span>
                      </div>
                      {step.details && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {step.details}
                        </p>
                      )}
                    </div>
                    {step.duration && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {step.duration}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Errors */}
            {report.errors && report.errors.length > 0 && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-xs font-medium text-red-500 mb-1">Errors</p>
                <ul className="space-y-1">
                  {report.errors.map((error, index) => (
                    <li key={index} className="text-xs text-red-400">• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ProcessDocumentation;
