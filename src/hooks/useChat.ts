import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  created_at: string;
}

export const useChat = (projectId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const { user } = useAuth();
  const { canSendMessage, refreshSubscription } = useSubscription();
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);

  // Load messages from database
  useEffect(() => {
    if (!user || !projectId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        toast({
          title: 'Error',
          description: 'Failed to load chat history',
          variant: 'destructive',
        });
        return;
      }

      const loaded = (data || []) as Message[];
      setMessages(loaded);
      messagesRef.current = loaded;
    };

    loadMessages();

    const channel = supabase
      .channel(`messages-changes-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${user.id}&project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as Message]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Message;
            setMessages((prev) => prev.map((msg) => msg.id === updated.id ? updated : msg));
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, projectId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !content.trim()) return;

      // Check if user can send message
      if (!canSendMessage()) {
        return;
      }

      setIsLoading(true);
      setIsStreaming(true);

      try {
        // Save user message
        const { data: userMessage, error: userMessageError } = await supabase
          .from('messages')
          .insert({
            user_id: user.id,
            project_id: projectId,
            role: 'user',
            content: content.trim(),
          })
          .select()
          .single();

        if (userMessageError) {
          console.error('Error saving user message:', userMessageError);
          throw new Error('Failed to save message');
        }

        // Get current session for authorization
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No active session');
        }

        // Call edge function for streaming response
        abortControllerRef.current = new AbortController();
        
        const messagesForAPI = messages
          .concat([userMessage as Message])
          .map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ messages: messagesForAPI }),
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get response');
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        const tempId = crypto.randomUUID();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  
                  if (parsed.type === 'content_block_delta') {
                    const delta = parsed.delta?.text || '';
                    assistantContent += delta;

                    // Update local state only for smooth streaming UI
                    setMessages((prev) => {
                      const existing = prev.find((m) => m.id === tempId);
                      if (existing) {
                        return prev.map((m) => m.id === tempId ? { ...m, content: assistantContent } : m);
                      }
                      return [...prev, { id: tempId, role: 'assistant' as const, content: assistantContent, created_at: new Date().toISOString() }];
                    });
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
          }

          // Write to database ONCE after stream completes
          if (assistantContent) {
            const { data: savedMessage } = await supabase
              .from('messages')
              .insert({
                user_id: user.id,
                project_id: projectId,
                role: 'assistant',
                content: assistantContent,
              })
              .select()
              .single();

            // Replace temp message with real DB message
            if (savedMessage) {
              setMessages((prev) =>
                prev.map((m) => m.id === tempId ? { ...savedMessage as Message } : m)
              );
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Request aborted');
        } else {
          console.error('Error sending message:', error);
          toast({
            title: 'Error',
            description: error.message || 'Failed to send message',
            variant: 'destructive',
          });
        }
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        abortControllerRef.current = null;
        // Refresh subscription to update usage
        refreshSubscription();
      }
    },
    [user, projectId, messages, canSendMessage, refreshSubscription]
  );

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, []);

  return {
    messages,
    isLoading,
    isStreaming,
    sendMessage,
    stopStreaming,
  };
};