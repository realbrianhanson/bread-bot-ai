import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret: string | null;
  last_triggered_at: string | null;
  failure_count: number;
  created_at: string;
}

export function useWebhooks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWebhooks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("webhook_endpoints" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching webhooks:", error);
    else setWebhooks((data as any[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const createWebhook = async (webhook: {
    name: string;
    url: string;
    events: string[];
    secret?: string;
  }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("webhook_endpoints" as any)
      .insert({
        user_id: user.id,
        name: webhook.name,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret || null,
      } as any)
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to create webhook", variant: "destructive" });
      return null;
    }
    toast({ title: "Created", description: `Webhook "${webhook.name}" added` });
    await fetchWebhooks();
    return data as any as WebhookEndpoint;
  };

  const deleteWebhook = async (id: string) => {
    const { error } = await supabase
      .from("webhook_endpoints" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete webhook", variant: "destructive" });
    } else {
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      toast({ title: "Deleted", description: "Webhook removed" });
    }
  };

  const toggleWebhook = async (id: string, is_active: boolean) => {
    const { error } = await supabase
      .from("webhook_endpoints" as any)
      .update({ is_active, updated_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update webhook", variant: "destructive" });
    } else {
      setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, is_active } : w)));
    }
  };

  const testWebhook = async (id: string) => {
    const webhook = webhooks.find((w) => w.id === id);
    if (!webhook) return;

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "test",
          timestamp: new Date().toISOString(),
          data: {
            message: "Test webhook from GarlicBread.ai",
            webhook_name: webhook.name,
          },
        }),
      });

      if (response.ok) {
        toast({ title: "Success", description: "Test webhook sent successfully" });
      } else {
        toast({ title: "Failed", description: `Webhook returned ${response.status}`, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Failed", description: "Could not reach webhook URL", variant: "destructive" });
    }
  };

  return { webhooks, loading, createWebhook, deleteWebhook, toggleWebhook, testWebhook, refetch: fetchWebhooks };
}
