import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Monitor, Clock, Download, X, Maximize2, Minimize2, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SandboxFile {
  name: string;
  url: string;
  type: string;
}

interface SandboxComputerViewProps {
  code: string;
  status: 'preparing' | 'running' | 'completed' | 'failed';
  output: { stdout: string; stderr: string; result: string };
  files?: SandboxFile[];
  executionTime?: number;
  language: 'python' | 'javascript';
}

const StatusDot = ({ status }: { status: SandboxComputerViewProps['status'] }) => {
  if (status === 'running' || status === 'preparing') {
    return (
      <motion.div
        className="w-2.5 h-2.5 rounded-full bg-[hsl(142_71%_45%)]"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
    );
  }
  if (status === 'completed') return <div className="w-2.5 h-2.5 rounded-full bg-[hsl(142_71%_45%)]" />;
  if (status === 'failed') return <div className="w-2.5 h-2.5 rounded-full bg-destructive" />;
  return <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />;
};

const statusLabels: Record<string, string> = {
  preparing: 'Preparing sandbox…',
  running: 'Executing code…',
  completed: 'Execution complete',
  failed: 'Execution failed',
};

const SandboxComputerView = ({
  code,
  status,
  output,
  files = [],
  executionTime,
  language,
}: SandboxComputerViewProps) => {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const imageFiles = files.filter((f) => f.type.startsWith('image/'));
  const otherFiles = files.filter((f) => !f.type.startsWith('image/'));
  const hasOutput = output.stdout || output.stderr || output.result;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="rounded-xl overflow-hidden border border-border/60 shadow-lg my-2"
      >
        {/* ---- Title bar ---- */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(220_13%_11%)] border-b border-border/30">
          <div className="flex items-center gap-3">
            {/* macOS dots */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[hsl(0_72%_51%)]" />
              <div className="w-3 h-3 rounded-full bg-[hsl(45_93%_47%)]" />
              <div className="w-3 h-3 rounded-full bg-[hsl(142_71%_45%)]" />
            </div>
            <div className="flex items-center gap-2">
              <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground/90 font-mono">Agent's Computer</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="text-[10px] font-mono bg-[hsl(220_13%_18%)] border-border/30 text-muted-foreground"
            >
              {language === 'python' ? 'Python' : 'JavaScript'}
            </Badge>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[hsl(220_13%_16%)]">
              <StatusDot status={status} />
              <span className="text-[10px] font-mono text-muted-foreground">
                {statusLabels[status]}
              </span>
            </div>
            {status === 'completed' && executionTime != null && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                <Clock className="h-3 w-3" />
                {executionTime < 1000 ? `${executionTime}ms` : `${(executionTime / 1000).toFixed(1)}s`}
              </span>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded hover:bg-[hsl(220_13%_20%)] text-muted-foreground hover:text-foreground transition-colors"
            >
              {collapsed ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* ---- Split panels ---- */}
              <div className="flex flex-col md:flex-row">
                {/* Code panel */}
                <div className="flex-1 min-w-0 border-r border-border/20 md:max-w-[55%]">
                  <div className="px-3 py-1.5 bg-[hsl(220_13%_13%)] border-b border-border/20 flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-wider">Source</span>
                  </div>
                  <div className="max-h-[320px] overflow-auto">
                    <SyntaxHighlighter
                      style={oneDark as any}
                      language={language}
                      showLineNumbers
                      lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: 'hsl(220 13% 30%)', fontSize: '0.7rem' }}
                      customStyle={{
                        margin: 0,
                        borderRadius: 0,
                        fontSize: '0.78rem',
                        background: 'hsl(220 13% 9%)',
                        padding: '12px 8px',
                      }}
                    >
                      {code}
                    </SyntaxHighlighter>
                  </div>
                </div>

                {/* Output panel */}
                <div className="flex-1 min-w-0">
                  <div className="px-3 py-1.5 bg-[hsl(220_10%_8%)] border-b border-border/20 flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-wider">Output</span>
                  </div>
                  <div className="max-h-[320px] overflow-auto bg-[hsl(220_10%_6%)] p-3 min-h-[100px]">
                    {status === 'preparing' && (
                      <motion.div
                        className="flex items-center gap-2 text-muted-foreground text-xs font-mono"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <span>Initializing sandbox</span>
                        <span className="inline-block w-1.5 h-4 bg-muted-foreground/60 animate-pulse" />
                      </motion.div>
                    )}

                    {status === 'running' && !hasOutput && (
                      <div className="flex items-center gap-1 text-muted-foreground text-xs font-mono">
                        <motion.span
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          Running…
                        </motion.span>
                        <motion.span
                          className="inline-block w-1.5 h-4 bg-[hsl(142_71%_45%)]"
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        />
                      </div>
                    )}

                    {output.stdout && (
                      <pre className="text-[hsl(142_71%_45%)] text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
                        {output.stdout}
                      </pre>
                    )}

                    {output.result && !output.stdout && (
                      <pre className="text-foreground/80 text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
                        {output.result}
                      </pre>
                    )}

                    {output.stderr && (
                      <pre className="text-destructive text-xs font-mono whitespace-pre-wrap break-words leading-relaxed mt-2 pt-2 border-t border-destructive/20">
                        {output.stderr}
                      </pre>
                    )}

                    {status === 'completed' && !hasOutput && (
                      <span className="text-xs font-mono text-muted-foreground/50">No output</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ---- Files section ---- */}
              {files.length > 0 && (
                <div className="border-t border-border/30 bg-card/80 px-4 py-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 mb-2">
                    Generated Files ({files.length})
                  </div>

                  {/* Image previews */}
                  {imageFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {imageFiles.map((file, i) => (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => setExpandedImage(file.url)}
                          className="relative rounded-lg overflow-hidden border border-border/50 hover:border-primary/40 transition-colors group"
                        >
                          <img
                            src={file.url}
                            alt={file.name}
                            className="h-28 w-auto object-contain bg-[hsl(220_13%_95%)] dark:bg-[hsl(220_13%_14%)]"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <Maximize2 className="h-4 w-4 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-[10px] font-mono text-white truncate">
                            {file.name}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {/* Other files */}
                  {otherFiles.length > 0 && (
                    <div className="space-y-1.5">
                      {otherFiles.map((file, i) => (
                        <a
                          key={i}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors group"
                        >
                          <Download className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                          <span className="text-sm font-mono text-foreground truncate flex-1">{file.name}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{file.type.split('/')[1]}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ---- Expanded image modal ---- */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setExpandedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="relative max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={expandedImage}
                alt="Expanded view"
                className="max-w-full max-h-[85vh] rounded-xl border border-border/50 shadow-2xl object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SandboxComputerView;
