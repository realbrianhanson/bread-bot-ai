import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TaskHistoryItem {
  id: string;
  task_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  input_data: any;
  output_data: any;
  screenshots: string[] | null;
  error_message: string | null;
}

export const useTaskHistory = () => {
  const [tasks, setTasks] = useState<TaskHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchTasks = async (limit = 20) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('task_type', 'browser_automation')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      setTasks(data || []);
    } catch (err: any) {
      console.error('Error fetching task history:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  return {
    tasks,
    isLoading,
    error,
    refreshTasks: fetchTasks,
  };
};
