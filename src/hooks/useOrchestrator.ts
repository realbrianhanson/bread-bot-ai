import { useState, useCallback, useRef } from 'react';
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
  duration?: number;
  metadata?: any;
}

const TOOL_LABELS: Record<string, string> = {
  search_web: 'Searching the web',
  scrape_url: 'Scraping page content',
  crawl_site: 'Crawling website',
  browse_web: 'Running browser automation',
  synthesize: 'Synthesizing results',
  generate_file: 'Generating file',
  execute_code: 'Running code',
  generate_slides: 'Creating presentation',
  create_google_doc: 'Creating Google Doc',
  create_google_sheet: 'Creating spreadsheet',
  send_email: 'Sending email',
  download_file: 'Downloading file',
  knowledge_search: 'Searching knowledge base',
  knowledge_store: 'Saving to knowledge base',
  recall_user_context: 'Recalling context',
};

export const useOrchestrator = () => {
  const [status, setStatus] = useState<OrchestrationStatus>('idle');
  const [currentStep, setCurrentStep] = useState('');
  const [toolChain, setToolChain] = useState<ToolStep[]>([]);
  const [finalResult, setFinalResult] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [error, setError] = useState('');
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const cleanupChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const orchestrate = useCallback(async (message: string, conversationHistory?: { role: string; content: string }[]) => {
    setStatus('planning');
    setCurrentStep('Analyzing your request…');
    setToolChain([]);
    setFinalResult('');
    setGeneratedFiles([]);
    setError('');
    setIsOrchestrating(true);
    cleanupChannel();

    try {
      setStatus('executing');
      setCurrentStep('Orchestrating tools…');

      const { data, error: fnError } = await supabase.functions.invoke('orchestrate-task', {
        body: { message, conversationHistory },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      // Subscribe to realtime updates on the task record
      const taskId = data?.taskId;
      if (taskId) {
        const channel = supabase
          .channel(`task-progress-${taskId}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'tasks',
            filter: `id=eq.${taskId}`,
          }, (payload) => {
            const outputData = payload.new?.output_data as any;
            if (!outputData) return;

            // Update current step
            if (outputData.current_step) {
              setCurrentStep(outputData.current_step);
              if (outputData.current_step.includes('Synthesizing')) {
                setStatus('synthesizing');
              }
            }

            // Build tool chain from execution log
            const log: any[] = outputData.execution_log || [];
            if (log.length > 0) {
              const steps: ToolStep[] = log.map((entry: any) => ({
                tool: entry.tool,
                status: 'completed' as const,
                label: TOOL_LABELS[entry.tool] || entry.tool,
                result: entry.output_preview,
              }));
              setToolChain(steps);
            }
          })
          .subscribe();

        channelRef.current = channel;
      }

      // The function call has already returned with full results
      // Build final tool chain from execution log
      const log: any[] = data?.executionLog || [];
      const steps: ToolStep[] = log.map((entry: any) => ({
        tool: entry.tool,
        status: 'completed' as const,
        label: TOOL_LABELS[entry.tool] || entry.tool,
        result: entry.output_preview,
      }));
      setToolChain(steps);

      // Extract generated files
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
      cleanupChannel();
    } catch (err: any) {
      console.error('[useOrchestrator] Error:', err);
      const msg = err?.message || 'Orchestration failed';
      setError(msg);
      setStatus('failed');
      setCurrentStep('Failed');
      toast({ title: 'Orchestration Error', description: msg, variant: 'destructive' });
      cleanupChannel();
    } finally {
      setIsOrchestrating(false);
    }
  }, [cleanupChannel]);

  const reset = useCallback(() => {
    cleanupChannel();
    setStatus('idle');
    setCurrentStep('');
    setToolChain([]);
    setFinalResult('');
    setGeneratedFiles([]);
    setError('');
    setIsOrchestrating(false);
  }, [cleanupChannel]);

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
