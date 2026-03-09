import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ScheduledTask {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  cron_expression: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  profile_id: string | null;
  created_at: string;
}

export function useScheduledTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("scheduled_tasks" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching scheduled tasks:", error);
    } else {
      setTasks((data as any[]) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (task: {
    name: string;
    description?: string;
    prompt: string;
    cron_expression: string;
    profile_id?: string | null;
  }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("scheduled_tasks" as any)
      .insert({
        user_id: user.id,
        name: task.name,
        description: task.description || null,
        prompt: task.prompt,
        cron_expression: task.cron_expression,
        profile_id: task.profile_id || null,
      } as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to create scheduled task", variant: "destructive" });
      return null;
    }
    toast({ title: "Created", description: `Scheduled task "${task.name}" created` });
    await fetchTasks();
    return data as any as ScheduledTask;
  };

  const toggleTask = async (id: string, is_active: boolean) => {
    const { error } = await supabase
      .from("scheduled_tasks" as any)
      .update({ is_active, updated_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    } else {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, is_active } : t)));
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase
      .from("scheduled_tasks" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Deleted", description: "Scheduled task removed" });
    }
  };

  return { tasks, loading, createTask, toggleTask, deleteTask, refetch: fetchTasks };
}
