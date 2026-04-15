import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface CodeExecEntry {
  id: string;
  code: string;
  language: string;
  status: 'running' | 'completed' | 'error';
  stdout?: string;
  stderr?: string;
  result?: string;
  executionTime?: number;
  files?: { name: string; url: string; type: string }[];
  timestamp: string;
}

export const useCodeExecution = (conversationId?: string) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CodeExecEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const sandboxIdRef = useRef<string | null>(null);

  const executeCode = useCallback(async (code: string, language: 'python' | 'javascript' = 'python'): Promise<CodeExecEntry | null> => {
    if (!user) return null;

    const entryId = crypto.randomUUID();
    const entry: CodeExecEntry = {
      id: entryId,
      code,
      language,
      status: 'running',
      timestamp: new Date().toISOString(),
    };

    setEntries(prev => [...prev, entry]);
    setIsExecuting(true);

    try {
      const { data, error } = await supabase.functions.invoke('execute-code', {
        body: {
          code,
          language,
          conversationId,
          sandboxId: sandboxIdRef.current,
        },
      });

      if (error) throw error;

      // Persist sandbox ID for session reuse
      if (data?.sandboxId) {
        sandboxIdRef.current = data.sandboxId;
      }

      const output = data?.output || {};
      const completed: CodeExecEntry = {
        ...entry,
        status: output.stderr && !output.stdout ? 'error' : 'completed',
        stdout: output.stdout || '',
        stderr: output.stderr || '',
        result: output.result || '',
        executionTime: output.executionTime,
        files: output.files || [],
      };

      setEntries(prev => prev.map(e => e.id === entryId ? completed : e));
      return completed;
    } catch (err: any) {
      const failed: CodeExecEntry = {
        ...entry,
        status: 'error',
        stderr: err.message || 'Execution failed',
      };
      setEntries(prev => prev.map(e => e.id === entryId ? failed : e));
      toast({ title: 'Code execution failed', description: err.message, variant: 'destructive' });
      return failed;
    } finally {
      setIsExecuting(false);
    }
  }, [user, conversationId]);

  const clearEntries = useCallback(() => setEntries([]), []);

  return {
    entries,
    isExecuting,
    executeCode,
    clearEntries,
    sandboxId: sandboxIdRef.current,
  };
};
