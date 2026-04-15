import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  tier: string;
  subscribed: boolean;
  subscriptionEnd: string | null;
  canUseOwnKeys: boolean;
  chatMessagesUsed: number;
  browserTasksUsed: number;
  chatMessagesLimit: number;
  browserTasksLimit: number;
  codeExecutionsUsed: number;
  codeExecutionsLimit: number;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState('free');
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [canUseOwnKeys, setCanUseOwnKeys] = useState(false);
  const [chatMessagesUsed, setChatMessagesUsed] = useState(0);
  const [browserTasksUsed, setBrowserTasksUsed] = useState(0);
  const [chatMessagesLimit, setChatMessagesLimit] = useState(100);
  const [browserTasksLimit, setBrowserTasksLimit] = useState(10);
  const [codeExecutionsUsed, setCodeExecutionsUsed] = useState(0);
  const [codeExecutionsLimit, setCodeExecutionsLimit] = useState(5);
  const navigate = useNavigate();
  const userId = user?.id ?? null;

  const refreshSubscription = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentSession = sessionData?.session;
      if (!currentSession?.access_token) {
        console.log('No valid session, skipping subscription check');
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) {
        console.error('Error checking subscription, falling back to free tier defaults:', error);
        return;
      }

      if (data) {
        setTier(data.tier || 'free');
        setSubscribed(data.subscribed || false);
        setSubscriptionEnd(data.subscription_end || null);
        setCanUseOwnKeys(data.can_use_own_keys || false);
        setChatMessagesUsed(data.chat_messages_used || 0);
        setBrowserTasksUsed(data.browser_tasks_used || 0);
        setChatMessagesLimit(data.chat_messages_limit || 100);
        setBrowserTasksLimit(data.browser_tasks_limit || 10);
        setCodeExecutionsUsed(data.code_executions_used || 0);
        setCodeExecutionsLimit(data.code_executions_limit || 5);
      }
    } catch (error) {
      console.error('Error refreshing subscription, using free tier defaults:', error);
    }
  }, [userId]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user && session?.access_token && event === 'SIGNED_IN') {
          setTimeout(() => {
            void refreshSubscription();
          }, 100);
        } else if (session?.user && session?.access_token) {
          await refreshSubscription();
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user && session?.access_token) {
        await refreshSubscription();
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshSubscription]);

  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      void refreshSubscription();
    }, 60000);

    return () => clearInterval(interval);
  }, [userId, refreshSubscription]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      navigate('/dashboard');
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        }
      }
    });
    
    if (!error) {
      // Fire GHL webhook with contact info (non-blocking)
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      
      supabase.functions.invoke("ghl-contact-webhook", {
        body: { email, firstName, lastName },
      }).catch((err) => {
        console.error("GHL webhook failed (non-blocking):", err);
      });

      navigate('/dashboard');
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      signIn, 
      signUp, 
      signOut, 
      loading,
      tier,
      subscribed,
      subscriptionEnd,
      canUseOwnKeys,
      chatMessagesUsed,
      browserTasksUsed,
      chatMessagesLimit,
      browserTasksLimit,
      codeExecutionsUsed,
      codeExecutionsLimit,
      refreshSubscription
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
