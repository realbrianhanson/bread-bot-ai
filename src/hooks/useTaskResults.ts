import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TaskResult {
  id: string;
  task_type: string;
  status: string;
  input_data: any;
  output_data: any;
  error_message: string | null;
  screenshots: string[] | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface SavedResult {
  id: string;
  user_id: string;
  task_type: string;
  query: string | null;
  results_json: any;
  created_at: string;
}

export function useTaskResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<TaskResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "completed" | "failed" | "running">("all");
  const [search, setSearch] = useState("");

  const fetchResults = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const query = supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    const { data, error } = await query;
    if (error) console.error("Error fetching results:", error);
    else setResults((data as TaskResult[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const filtered = useMemo(() => {
    let items = results;
    if (filter !== "all") items = items.filter((r) => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (r) =>
          r.task_type.toLowerCase().includes(q) ||
          JSON.stringify(r.input_data).toLowerCase().includes(q) ||
          (r.error_message && r.error_message.toLowerCase().includes(q))
      );
    }
    return items;
  }, [results, filter, search]);

  return { results: filtered, allResults: results, loading, filter, setFilter, search, setSearch, refetch: fetchResults };
}

export function useSavedResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<SavedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "scrape" | "search" | "crawl" | "browse">("all");
  const [search, setSearch] = useState("");

  const fetchResults = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("task_results")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) console.error("Error fetching saved results:", error);
    else setResults((data as SavedResult[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const filtered = useMemo(() => {
    let items = results;
    if (filter !== "all") items = items.filter((r) => r.task_type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (r) =>
          (r.query && r.query.toLowerCase().includes(q)) ||
          r.task_type.toLowerCase().includes(q) ||
          JSON.stringify(r.results_json).toLowerCase().includes(q)
      );
    }
    return items;
  }, [results, filter, search]);

  const deleteResult = useCallback(async (id: string) => {
    const { error } = await supabase.from("task_results").delete().eq("id", id);
    if (!error) setResults((prev) => prev.filter((r) => r.id !== id));
    return error;
  }, []);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, SavedResult[]> = {};
    for (const r of filtered) {
      const date = new Date(r.created_at).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(r);
    }
    return groups;
  }, [filtered]);

  return { results: filtered, grouped, loading, filter, setFilter, search, setSearch, refetch: fetchResults, deleteResult };
}

export function exportToCsv(results: TaskResult[], filename = "garlicbread-results.csv") {
  const headers = ["ID", "Type", "Status", "Task", "Error", "Created", "Completed", "Duration (s)"];
  const rows = results.map((r) => {
    const duration =
      r.started_at && r.completed_at
        ? ((new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) / 1000).toFixed(1)
        : "";
    return [
      r.id,
      r.task_type,
      r.status,
      r.input_data?.task || "",
      r.error_message || "",
      r.created_at,
      r.completed_at || "",
      duration,
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSavedResultsToCsv(results: SavedResult[], filename = "garlicbread-saved-results.csv") {
  const headers = ["ID", "Type", "Query", "Created"];
  const rows = results.map((r) => [r.id, r.task_type, r.query || "", r.created_at]);
  const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
