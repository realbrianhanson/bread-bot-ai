import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BuildHistoryItem {
  id: string;
  conversationId: string;
  conversationName: string;
  createdAt: string;
  snippet: string; // first ~200 chars of HTML for preview context
}

export function useBuildHistory() {
  const { user } = useAuth();
  const [builds, setBuilds] = useState<BuildHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBuilds = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get all assistant messages that contain HTML code blocks
      const { data: htmlMessages, error } = await supabase
        .from("messages")
        .select("id, project_id, content, created_at")
        .eq("user_id", user.id)
        .eq("role", "assistant")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      // Filter messages that contain HTML websites
      const htmlPattern = /```html?\s*\n[\s\S]*?<!DOCTYPE|```html?\s*\n[\s\S]*?<html|```html?\s*\n[\s\S]*?<body/i;
      const rawHtmlPattern = /<!DOCTYPE html>/i;

      const websiteMessages = (htmlMessages || []).filter(
        (m) => htmlPattern.test(m.content) || rawHtmlPattern.test(m.content)
      );

      // Group by conversation (project_id), keep latest per conversation
      const byConversation = new Map<string, typeof websiteMessages[0]>();
      for (const msg of websiteMessages) {
        if (msg.project_id && !byConversation.has(msg.project_id)) {
          byConversation.set(msg.project_id, msg);
        }
      }

      // Get conversation names
      const convIds = Array.from(byConversation.keys());
      if (convIds.length === 0) {
        setBuilds([]);
        setLoading(false);
        return;
      }

      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", convIds);

      const projectMap = new Map((projects || []).map((p) => [p.id, p.name]));

      const items: BuildHistoryItem[] = convIds.map((convId) => {
        const msg = byConversation.get(convId)!;
        // Extract a snippet of the page title or first heading
        const titleMatch = msg.content.match(/<title>([^<]+)<\/title>/i);
        const h1Match = msg.content.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const snippet = titleMatch?.[1] || h1Match?.[1] || "Website";

        return {
          id: msg.id,
          conversationId: convId,
          conversationName: projectMap.get(convId) || "Untitled Build",
          createdAt: msg.created_at,
          snippet,
        };
      });

      setBuilds(items);
    } catch (err) {
      console.error("Error fetching build history:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBuilds();
  }, [fetchBuilds]);

  return { builds, loading, refetch: fetchBuilds };
}
