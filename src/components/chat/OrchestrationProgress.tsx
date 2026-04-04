import { motion } from 'framer-motion';
import { Check, Loader2, AlertCircle, Search, Globe, FileText, Brain, Sparkles, File } from 'lucide-react';
import { OrchestrationStatus, ToolStep } from '@/hooks/useOrchestrator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface OrchestrationProgressProps {
  status: OrchestrationStatus;
  currentStep: string;
  toolChain: ToolStep[];
  finalResult: string;
  error: string;
}

const TOOL_ICONS: Record<string, typeof Search> = {
  search_web: Search,
  scrape_url: FileText,
  crawl_site: Globe,
  browse_web: Globe,
  synthesize: Brain,
  generate_file: File,
};

const OrchestrationProgress = ({
  status,
  currentStep,
  toolChain,
  finalResult,
  error,
}: OrchestrationProgressProps) => {
  const isActive = status === 'planning' || status === 'executing' || status === 'synthesizing';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="rounded-xl border border-primary/20 bg-card/80 backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 bg-primary/5">
          <div className="relative">
            {isActive ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : status === 'completed' ? (
              <Sparkles className="h-4 w-4 text-primary" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
          </div>
          <span className="text-sm font-medium text-foreground">
            {isActive ? 'Deep Research' : status === 'completed' ? 'Research Complete' : 'Research Failed'}
          </span>
          {isActive && (
            <span className="text-xs text-muted-foreground ml-auto">{currentStep}</span>
          )}
        </div>

        {/* Tool chain steps */}
        {toolChain.length > 0 && (
          <div className="px-4 py-3 space-y-2 border-b border-border/30">
            {toolChain.map((step, i) => {
              const Icon = TOOL_ICONS[step.tool] || Sparkles;
              return (
                <div key={i} className="flex items-center gap-2.5">
                  {step.status === 'completed' ? (
                    <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                  ) : step.status === 'running' ? (
                    <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <Loader2 className="h-3 w-3 text-primary animate-spin" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                  <span className={`text-sm ${step.status === 'completed' ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Active pulsing indicator when no steps yet */}
        {isActive && toolChain.length === 0 && (
          <div className="px-4 py-4 flex items-center gap-3">
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

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-destructive/5">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Final result */}
        {finalResult && status === 'completed' && (
          <div className="px-4 py-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{finalResult}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default OrchestrationProgress;
