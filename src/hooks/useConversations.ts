import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Conversation {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchConversations = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error loading conversations",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setConversations(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  const createConversation = async (name?: string) => {
    if (!user) return null;

    const conversationName = name || `Chat ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: conversationName,
        user_id: user.id,
        description: 'New conversation',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error creating conversation",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    setConversations(prev => [data, ...prev]);
    toast({
      title: "Conversation created",
      description: conversationName,
    });
    
    return data;
  };

  const deleteConversation = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error deleting conversation",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setConversations(prev => prev.filter(c => c.id !== id));
      toast({
        title: "Conversation deleted",
      });
    }
  };

  const renameConversation = async (id: string, newName: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('projects')
      .update({ name: newName })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error renaming conversation:', error);
      toast({
        title: "Error renaming conversation",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setConversations(prev =>
        prev.map(c => (c.id === id ? { ...c, name: newName } : c))
      );
      toast({
        title: "Conversation renamed",
      });
    }
  };

  return {
    conversations,
    isLoading,
    createConversation,
    deleteConversation,
    renameConversation,
    refreshConversations: fetchConversations,
  };
};
