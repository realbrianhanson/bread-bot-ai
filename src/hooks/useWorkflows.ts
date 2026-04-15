import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface WorkflowStep {
  id: string;
  name: string;
  prompt: string;
  order: number;
}

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useWorkflows() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkflows = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to load workflows:', error);
    } else {
      setWorkflows((data || []).map((w: any) => ({
        ...w,
        steps: Array.isArray(w.steps) ? w.steps : JSON.parse(w.steps || '[]'),
      })));
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const createWorkflow = useCallback(async (name: string, description = '') => {
    if (!user) return null;
    const defaultSteps: WorkflowStep[] = [
      { id: crypto.randomUUID(), name: 'Step 1', prompt: '', order: 0 },
    ];
    const { data, error } = await supabase
      .from('workflows')
      .insert({
        user_id: user.id,
        name,
        description,
        steps: defaultSteps as any,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create workflow', variant: 'destructive' });
      return null;
    }
    const wf = { ...data, steps: defaultSteps } as Workflow;
    setWorkflows(prev => [wf, ...prev]);
    return wf;
  }, [user]);

  const updateWorkflow = useCallback(async (id: string, updates: Partial<Pick<Workflow, 'name' | 'description' | 'steps' | 'is_active' | 'last_run_at'>>) => {
    const { error } = await supabase
      .from('workflows')
      .update(updates as any)
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update workflow', variant: 'destructive' });
      return;
    }
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, ...updates } as Workflow : w));
  }, []);

  const deleteWorkflow = useCallback(async (id: string) => {
    const { error } = await supabase.from('workflows').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete workflow', variant: 'destructive' });
      return;
    }
    setWorkflows(prev => prev.filter(w => w.id !== id));
  }, []);

  // Migrate from localStorage on first load
  useEffect(() => {
    if (!user || workflows.length > 0) return;
    try {
      const local = JSON.parse(localStorage.getItem('garlicbread-workflows') || '[]');
      if (local.length > 0) {
        const migrateAll = async () => {
          for (const wf of local) {
            await supabase.from('workflows').insert({
              user_id: user.id,
              name: wf.name,
              description: wf.description || '',
              steps: wf.steps as any,
            });
          }
          localStorage.removeItem('garlicbread-workflows');
          fetchWorkflows();
        };
        migrateAll();
      }
    } catch {}
  }, [user, workflows.length, fetchWorkflows]);

  return { workflows, isLoading, createWorkflow, updateWorkflow, deleteWorkflow, refetch: fetchWorkflows };
}
