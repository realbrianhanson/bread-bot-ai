import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, X, Loader2, Search, Globe, FileText, Brain, Sparkles,
  File, Download, Link2, FileSpreadsheet, FileCode, Cpu,
  Clock, ChevronDown, ChevronUp, RefreshCw, BookOpen, ArrowRight,
} from 'lucide-react';
import { OrchestrationStatus, ToolStep } from '@/hooks/useOrchestrator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface GeneratedFile {
  fileUrl: string;
  filename: string;
  size?: number;
  type?: string;
}

interface OrchestrationProgressProps {
  status: OrchestrationStatus;
  currentStep: string;
  toolChain: ToolStep[];
  finalResult: string;
  error: string;
  generatedFiles?: GeneratedFile[];
  onFollowUp?: (action: string) => void;
}

/* ---- icon maps ---- */
const TOOL_ICONS: Record<string, typeof Search> = {
  search_web: Search,
  scrape_url: FileText,
  crawl_site: Globe,
  browse_web: Globe,
  synthesize: Cpu,
  generate_file: Download,
};

const STATUS_CONFIG: Record<string, { icon: typeof Brain; label: string; color: string }> = {
  planning:      { icon: Brain,    label: 'Analyzing your request…',       color: 'text-primary' },
  executing:     { icon: Loader2,  label: 'Working on it…',               color: 'text-primary' },
  synthesizing:  { icon: Sparkles, label: 'Putting it all together…',     color: 'text-primary' },
  completed:     { icon: Check,    label: 'Done!',                        color: 'text-primary' },
  failed:        { icon: X,        label: 'Something went wrong',         color: 'text-destructive' },
};

/* ---- helpers ---- */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(filename: string) {
  if (filename.match(/\.(csv|xlsx)$/i)) return FileSpreadsheet;
  if (filename.match(/\.(json)$/i)) return FileCode;
  return FileText;
}

/* ---- step status dot ---- */
const StepDot = ({ stepStatus }: { stepStatus: ToolStep['status'] }) => {
  if (stepStatus === 'completed') {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-6 h-6 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center shrink-0"
      >
        <Check className="h-3 w-3 text-primary" />
      </motion.div>
    );
  }
  if (stepStatus === 'running') {
    return (
      <div className="w-6 h-6 rounded-full border-2 border-primary/40 flex items-center justify-center shrink-0 relative">
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/10"
          animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
      </div>
    );
  }
  if (stepStatus === 'failed') {
    return (
      <div className="w-6 h-6 rounded-full bg-destructive/15 border-2 border-destructive/40 flex items-center justify-center shrink-0">
        <X className="h-3 w-3 text-destructive" />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full border-2 border-border/60 flex items-center justify-center shrink-0">
      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
    </div>
  );
};

/* ---- main component ---- */
const OrchestrationProgress = ({
  status,
  currentStep,
  toolChain,
  finalResult,
  error,
  generatedFiles = [],
  onFollowUp,
}: OrchestrationProgressProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resultExpanded, setResultExpanded] = useState(true);

  const isActive = status === 'planning' || status === 'executing' || status === 'synthesizing';
  const completedCount = toolChain.filter((s) => s.status === 'completed').length;
  const statusConf = STATUS_CONFIG[status] || STATUS_CONFIG.executing;
  const StatusIcon = statusConf.icon;

  const handleCopyLink = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({ title: 'Copied' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="max-w-3xl mx-auto"
    >
      <Card className="border-primary/20 bg-card/80 backdrop-blur-sm overflow-hidden shadow-lg shadow-primary/5">
        {/* ---- Header ---- */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/30 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="relative">
            {isActive ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                <StatusIcon className={`h-4.5 w-4.5 ${statusConf.color}`} />
              </motion.div>
            ) : (
              <StatusIcon className={`h-4.5 w-4.5 ${statusConf.color}`} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className={`text-sm font-semibold ${statusConf.color}`}>{statusConf.label}</span>
          </div>
          {isActive && toolChain.length > 0 && (
            <Badge variant="secondary" className="text-[10px] font-mono tabular-nums">
              Step {completedCount + (toolChain.some((s) => s.status === 'running') ? 1 : 0)} of {toolChain.length}
            </Badge>
          )}
          {isActive && (
            <span className="text-xs text-muted-foreground hidden sm:block">{currentStep}</span>
          )}
        </div>

        {/* ---- Vertical timeline ---- */}
        {toolChain.length > 0 && (
          <div className="px-5 py-4">
            <div className="relative">
              {/* vertical line */}
              <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border/50" />

              <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                  {toolChain.map((step, i) => {
                    const Icon = TOOL_ICONS[step.tool] || Sparkles;
                    return (
                      <motion.div
                        key={`${step.tool}-${i}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        className="relative flex items-start gap-3 py-1.5"
                      >
                        <StepDot stepStatus={step.status} />
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-3.5 w-3.5 shrink-0 ${
                              step.status === 'completed' ? 'text-primary' :
                              step.status === 'running' ? 'text-primary' :
                              step.status === 'failed' ? 'text-destructive' :
                              'text-muted-foreground/50'
                            }`} />
                            <span className={`text-sm font-medium ${
                              step.status === 'completed' ? 'text-foreground' :
                              step.status === 'running' ? 'text-foreground' :
                              step.status === 'failed' ? 'text-destructive' :
                              'text-muted-foreground/60'
                            }`}>
                              {step.label}
                            </span>

                            {step.status === 'running' && (
                              <motion.span
                                className="text-xs text-primary/70"
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >
                                Running…
                              </motion.span>
                            )}

                            {step.status === 'completed' && step.duration != null && (
                              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                <Clock className="h-2.5 w-2.5" />
                                {(step.duration / 1000).toFixed(1)}s
                              </span>
                            )}
                          </div>

                          {step.status === 'failed' && step.result && (
                            <p className="text-xs text-destructive/80 mt-0.5 ml-5">{step.result}</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* ---- Planning shimmer (no steps yet) ---- */}
        {isActive && toolChain.length === 0 && (
          <div className="px-5 py-5 flex items-center gap-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">{currentStep}</span>
          </div>
        )}

        {/* ---- Error ---- */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 py-3 bg-destructive/5 border-t border-destructive/10">
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}

        {/* ---- Generated files ---- */}
        {generatedFiles.length > 0 && status === 'completed' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="px-5 pt-4 space-y-2 border-t border-border/30">
            <p className="text-xs font-medium text-muted-foreground mb-1">Generated Files</p>
            {generatedFiles.map((file, i) => {
              const Icon = getFileIcon(file.filename);
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 to-accent/5 hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.type?.toUpperCase() || 'FILE'}
                      {file.size ? ` · ${formatFileSize(file.size)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleCopyLink(file.fileUrl, `orch-file-${i}`)} title="Copy link">
                      {copiedId === `orch-file-${i}` ? <Check className="h-3.5 w-3.5 text-primary" /> : <Link2 className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="default" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => window.open(file.fileUrl, '_blank')}>
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* ---- Final result ---- */}
        {finalResult && status === 'completed' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Collapsible open={resultExpanded} onOpenChange={setResultExpanded}>
              <CollapsibleTrigger className="w-full px-5 py-3 border-t border-border/30 flex items-center justify-between hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">Research Result</span>
                </div>
                {resultExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-5 pb-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{finalResult}</ReactMarkdown>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>
        )}

        {/* ---- Follow-up actions ---- */}
        {status === 'completed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="px-5 py-3 border-t border-border/30 bg-muted/10 flex flex-wrap gap-2"
          >
            {[
              { label: 'Refine this', icon: RefreshCw, action: 'refine' },
              { label: 'Save as document', icon: File, action: 'save' },
              { label: 'Research deeper', icon: ArrowRight, action: 'deeper' },
            ].map(({ label, icon: BtnIcon, action }) => (
              <Button
                key={action}
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs bg-card/50 border-border/50 hover:border-primary/30 hover:bg-primary/5"
                onClick={() => onFollowUp?.(action)}
              >
                <BtnIcon className="h-3 w-3" /> {label}
              </Button>
            ))}
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
};

export default OrchestrationProgress;
