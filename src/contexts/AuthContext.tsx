import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const DEFAULT_LIMITS = {
  chatMessagesLimit: 100,
  browserTasksLimit: 10,
  codeExecutionsLimit: 5,
  appBuildsLimit: 3,
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any; needsEmailConfirmation?: boolean }>;
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
  appBuildsUsed: number;
  appBuildsLimit: number;
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
  const [chatMessagesLimit, setChatMessagesLimit] = useState(DEFAULT_LIMITS.chatMessagesLimit);
  const [browserTasksLimit, setBrowserTasksLimit] = useState(DEFAULT_LIMITS.browserTasksLimit);
  const [codeExecutionsUsed, setCodeExecutionsUsed] = useState(0);
  const [codeExecutionsLimit, setCodeExecutionsLimit] = useState(DEFAULT_LIMITS.codeExecutionsLimit);
  const [appBuildsUsed, setAppBuildsUsed] = useState(0);
  const [appBuildsLimit, setAppBuildsLimit] = useState(DEFAULT_LIMITS.appBuildsLimit);
  const navigate = useNavigate();
  const userId = user?.id ?? null;

  // refreshSubscription is stable — it reads the current session inside so it
  // never depends on component state. This lets the auth listener subscribe
  // exactly once (empty deps) instead of tearing down on every user change.
  const refreshSubscription = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentSession = sessionData?.session;
      if (!currentSession?.access_token) return;

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
        setChatMessagesLimit(data.chat_messages_limit || DEFAULT_LIMITS.chatMessagesLimit);
        setBrowserTasksLimit(data.browser_tasks_limit || DEFAULT_LIMITS.browserTasksLimit);
        setCodeExecutionsUsed(data.code_executions_used || 0);
        setCodeExecutionsLimit(data.code_executions_limit || DEFAULT_LIMITS.codeExecutionsLimit);
        setAppBuildsUsed(data.app_builds_used || 0);
        setAppBuildsLimit(data.app_builds_limit || DEFAULT_LIMITS.appBuildsLimit);
      }
    } catch (error) {
      console.error('Error refreshing subscription, using free tier defaults:', error);
    }
  }, []);

  // Subscribe to auth changes exactly ONCE. Never await Supabase calls inside
  // the onAuthStateChange callback (documented deadlock risk) — always defer.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);

        if (nextSession?.user && nextSession?.access_token) {
          // Defer so we don't run Supabase-heavy work synchronously inside the
          // auth callback. queueMicrotask is fast and avoids the setTimeout
          // fire-and-drop closures the previous version relied on.
          queueMicrotask(() => {
            void refreshSubscription();
          });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
      if (initialSession?.user && initialSession?.access_token) {
        void refreshSubscription();
      }
    });

    return () => subscription.unsubscribe();
    // refreshSubscription is stable — subscribe ONCE for the lifetime of the
    // provider so the auth listener isn't torn down and re-created on every
    // user change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const { data, error } = await supabase.auth.signUp({
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

      // If email confirmation is required, Supabase returns a user with no
      // session. Don't navigate — let the caller show a "check your email" screen.
      const needsEmailConfirmation = !!data?.user && !data?.session;
      if (!needsEmailConfirmation) {
        navigate('/dashboard');
      }
      return { error: null, needsEmailConfirmation };
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Reset plan/usage state so a stale subscription snapshot never leaks
    // into the next user's session on the same browser tab.
    setTier('free');
    setSubscribed(false);
    setSubscriptionEnd(null);
    setCanUseOwnKeys(false);
    setChatMessagesUsed(0);
    setBrowserTasksUsed(0);
    setCodeExecutionsUsed(0);
    setAppBuildsUsed(0);
    setChatMessagesLimit(DEFAULT_LIMITS.chatMessagesLimit);
    setBrowserTasksLimit(DEFAULT_LIMITS.browserTasksLimit);
    setCodeExecutionsLimit(DEFAULT_LIMITS.codeExecutionsLimit);
    setAppBuildsLimit(DEFAULT_LIMITS.appBuildsLimit);
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
      appBuildsUsed,
      appBuildsLimit,
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
