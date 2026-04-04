import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  const refreshSubscription = async () => {
    if (!user) return;
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) {
        console.log('No valid session, skipping subscription check');
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) {
        console.error('Error checking subscription, falling back to free tier defaults:', error);
        // Gracefully degrade to free tier defaults instead of breaking
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
      }
    } catch (error) {
      console.error('Error refreshing subscription, using free tier defaults:', error);
      // Silently fall back — the UI will show free tier defaults
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Only refresh subscription after sign-in is complete and we have a valid session
        if (session?.user && session?.access_token && event === 'SIGNED_IN') {
          // Add a small delay to ensure token is fully propagated
          setTimeout(() => refreshSubscription(), 100);
        } else if (session?.user && session?.access_token) {
          await refreshSubscription();
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user && session?.access_token) {
        await refreshSubscription();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Periodic refresh every 60 seconds
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      refreshSubscription();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [user]);

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
