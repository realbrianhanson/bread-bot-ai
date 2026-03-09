import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  prompt: string;
  status: "pending" | "running" | "done" | "failed";
  order: number;
}

export interface TaskPlan {
  id: string;
  summary: string;
  steps: PlanStep[];
  status: "planning" | "reviewing" | "executing" | "completed" | "failed";
}

export function useTaskPlanner() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<TaskPlan | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);

  const generatePlan = useCallback(
    async (userPrompt: string): Promise<TaskPlan | null> => {
      if (!user) return null;
      setIsPlanning(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No session");

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plan-task`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ prompt: userPrompt }),
          }
        );

        if (!response.ok) {
          const err = await response.text();
          throw new Error(err);
        }

        const data = await response.json();
        const newPlan: TaskPlan = {
          id: crypto.randomUUID(),
          summary: data.summary || userPrompt,
          steps: (data.steps || []).map((s: any, i: number) => ({
            id: crypto.randomUUID(),
            title: s.title,
            description: s.description,
            prompt: s.prompt,
            status: "pending" as const,
            order: i,
          })),
          status: "reviewing",
        };
        setPlan(newPlan);
        return newPlan;
      } catch (err) {
        console.error("Planning error:", err);
        return null;
      } finally {
        setIsPlanning(false);
      }
    },
    [user]
  );

  const updateStep = useCallback((stepId: string, updates: Partial<PlanStep>) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
      };
    });
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, order: i })),
      };
    });
  }, []);

  const addStep = useCallback((afterIndex: number) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const newStep: PlanStep = {
        id: crypto.randomUUID(),
        title: "New step",
        description: "",
        prompt: "",
        status: "pending",
        order: afterIndex + 1,
      };
      const steps = [...prev.steps];
      steps.splice(afterIndex + 1, 0, newStep);
      return { ...prev, steps: steps.map((s, i) => ({ ...s, order: i })) };
    });
  }, []);

  const reorderSteps = useCallback((fromIndex: number, toIndex: number) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const steps = [...prev.steps];
      const [moved] = steps.splice(fromIndex, 1);
      steps.splice(toIndex, 0, moved);
      return { ...prev, steps: steps.map((s, i) => ({ ...s, order: i })) };
    });
  }, []);

  const clearPlan = useCallback(() => setPlan(null), []);

  return {
    plan,
    isPlanning,
    generatePlan,
    updateStep,
    removeStep,
    addStep,
    reorderSteps,
    clearPlan,
    setPlan,
  };
}
