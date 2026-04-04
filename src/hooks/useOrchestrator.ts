import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GeneratedFile } from '@/components/chat/OrchestrationProgress';
import { toast } from '@/hooks/use-toast';

export type OrchestrationStatus =
  | 'idle'
  | 'planning'
  | 'executing'
  | 'synthesizing'
  | 'completed'
  | 'failed';

export interface ToolStep {
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  label: string;
  result?: string;
}

const TOOL_LABELS: Record<string, string> = {
  search_web: 'Searching the web',
  scrape_url: 'Scraping page content',
  crawl_site: 'Crawling website',
  browse_web: 'Running browser automation',
  synthesize: 'Synthesizing results',
  generate_file: 'Generating file',
};

export const useOrchestrator = () => {
  const [status, setStatus] = useState<OrchestrationStatus>('idle');
  const [currentStep, setCurrentStep] = useState('');
  const [toolChain, setToolChain] = useState<ToolStep[]>([]);
  const [finalResult, setFinalResult] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [error, setError] = useState('');
  const [isOrchestrating, setIsOrchestrating] = useState(false);

  const orchestrate = useCallback(async (message: string, conversationHistory?: { role: string; content: string }[]) => {
    setStatus('planning');
    setCurrentStep('Analyzing your request…');
    setToolChain([]);
    setFinalResult('');
    setGeneratedFiles([]);
    setError('');
    setIsOrchestrating(true);

    try {
      setStatus('executing');
      setCurrentStep('Orchestrating tools…');

      const { data, error: fnError } = await supabase.functions.invoke('orchestrate-task', {
        body: { message, conversationHistory },
      });

      if (fnError) throw fnError;

      if (data?.error) {
        throw new Error(data.error);
      }

      // Build tool chain from execution log
      const log: any[] = data?.executionLog || [];
      const steps: ToolStep[] = log.map((entry: any) => ({
        tool: entry.tool,
        status: 'completed' as const,
        label: TOOL_LABELS[entry.tool] || entry.tool,
        result: entry.output_preview,
      }));

      setToolChain(steps);

      // Extract generated files from execution log
      const files: GeneratedFile[] = [];
      for (const entry of log) {
        if (entry.tool === 'generate_file' && entry.output_preview) {
          try {
            const parsed = JSON.parse(entry.output_preview);
            if (parsed.success && parsed.fileUrl) {
              files.push({ fileUrl: parsed.fileUrl, filename: parsed.filename || 'file', size: parsed.size, type: parsed.type });
            }
          } catch { /* ignore parse errors */ }
        }
      }
      setGeneratedFiles(files);

      setFinalResult(data?.result || 'No result returned.');
      setStatus('completed');
      setCurrentStep('Done');
    } catch (err: any) {
      console.error('[useOrchestrator] Error:', err);
      const msg = err?.message || 'Orchestration failed';
      setError(msg);
      setStatus('failed');
      setCurrentStep('Failed');
      toast({ title: 'Orchestration Error', description: msg, variant: 'destructive' });
    } finally {
      setIsOrchestrating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setCurrentStep('');
    setToolChain([]);
    setFinalResult('');
    setGeneratedFiles([]);
    setError('');
    setIsOrchestrating(false);
  }, []);

  return {
    orchestrate,
    reset,
    status,
    currentStep,
    toolChain,
    finalResult,
    generatedFiles,
    error,
    isOrchestrating,
  };
};
