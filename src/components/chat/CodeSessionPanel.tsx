import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, ChevronDown, ChevronUp, Loader2, Trash2, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { CodeExecEntry } from '@/hooks/useCodeExecution';

interface CodeSessionPanelProps {
  entries: CodeExecEntry[];
  isExecuting: boolean;
  sandboxId?: string | null;
  onClear?: () => void;
}

const CodeSessionPanel = ({ entries, isExecuting, sandboxId, onClear }: CodeSessionPanelProps) => {
  const [expanded, setExpanded] = useState(true);

  if (entries.length === 0 && !isExecuting) return null;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/80">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Shell Session</span>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {entries.length} cmd{entries.length !== 1 ? 's' : ''}
          </Badge>
          {sandboxId && (
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
              sandbox: {sandboxId.slice(0, 8)}…
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onClear && entries.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={onClear}>
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border/50 overflow-hidden">
                {/* Command header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(220_13%_11%)] border-b border-border/30">
                  <div className="flex items-center gap-1.5">
                    {entry.status === 'running' ? (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    ) : entry.status === 'error' ? (
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-[hsl(142_71%_45%)]" />
                    )}
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                      {entry.language}
                    </span>
                  </div>
                  {entry.executionTime != null && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono ml-auto">
                      <Clock className="h-3 w-3" />
                      {entry.executionTime < 1000 ? `${entry.executionTime}ms` : `${(entry.executionTime / 1000).toFixed(1)}s`}
                    </span>
                  )}
                </div>

                {/* Code */}
                <SyntaxHighlighter
                  style={oneDark as any}
                  language={entry.language}
                  PreTag="div"
                  customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.75rem', background: 'hsl(220 13% 14%)', maxHeight: '120px' }}
                >
                  {entry.code.length > 500 ? entry.code.slice(0, 500) + '\n...' : entry.code}
                </SyntaxHighlighter>

                {/* Output */}
                {(entry.stdout || entry.result) && (
                  <div className="bg-[hsl(220_13%_8%)] border-t border-border/30 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-mono mb-1">Output</div>
                    <pre className="text-[hsl(142_71%_45%)] text-[11px] font-mono whitespace-pre-wrap break-words max-h-[200px] overflow-auto">
                      {entry.stdout || entry.result}
                    </pre>
                  </div>
                )}

                {/* Stderr */}
                {entry.stderr && (
                  <div className="bg-[hsl(0_50%_8%)] border-t border-[hsl(0_50%_20%)] px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-[hsl(0_72%_51%)] font-mono mb-1">Error</div>
                    <pre className="text-[hsl(0_72%_65%)] text-[11px] font-mono whitespace-pre-wrap break-words max-h-[150px] overflow-auto">
                      {entry.stderr}
                    </pre>
                  </div>
                )}

                {/* Files */}
                {entry.files && entry.files.length > 0 && (
                  <div className="bg-card border-t border-border/30 px-3 py-2 space-y-1.5">
                    {entry.files.filter(f => f.type.startsWith('image/')).map((file, i) => (
                      <img key={i} src={file.url} alt={file.name} className="rounded border border-border/50 max-w-full max-h-48 object-contain" />
                    ))}
                    {entry.files.filter(f => !f.type.startsWith('image/')).map((file, i) => (
                      <a key={i} href={file.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-2 py-1.5 rounded border border-border/50 bg-muted/30 hover:bg-muted/50 text-xs font-mono">
                        {file.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isExecuting && entries[entries.length - 1]?.status !== 'running' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Starting execution...</span>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default CodeSessionPanel;
