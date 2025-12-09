import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const SESSION_STORAGE_KEY = '@auth/session_v1';
  const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  const saveSession = async (newSession: Session | null) => {
    try {
      if (newSession) {
        const payload = JSON.stringify({
          savedAt: Date.now(),
          session: newSession,
        });
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, payload);
      } else {
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (e) {
      // best-effort; ignore storage errors
    }
  };

  const loadSessionFromStorage = async (): Promise<Session | null> => {
    try {
      const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { savedAt: number; session: Session };
      if (!parsed?.savedAt || !parsed?.session) return null;
      const isExpired = Date.now() - parsed.savedAt > SESSION_TTL_MS;
      if (isExpired) {
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        try {
          await supabase.auth.signOut();
        } catch {}
        return null;
      }
      return parsed.session;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession();

    // Initial load with TTL
    (async () => {
      const stored = await loadSessionFromStorage();
      if (stored) {
        setSession(stored);
        setUser(stored.user ?? null);
        setLoading(false);
      } else {
        const {
          data: { session: liveSession },
        } = await supabase.auth.getSession();
        setSession(liveSession);
        setUser(liveSession?.user ?? null);
        await saveSession(liveSession);
        setLoading(false);
      }
    })();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      await saveSession(session);
      setLoading(false);
    });

    // Handle OAuth deep links (PKCE)
    const urlListener = Linking.addEventListener('url', async ({ url }) => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          // eslint-disable-next-line no-console
          console.error('exchangeCodeForSession error:', error);
        } else if (data?.session) {
          await saveSession(data.session);
          setSession(data.session);
          setUser(data.session.user ?? null);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Deep link handling error:', e);
      }
    });

    return () => {
      subscription.unsubscribe();
      urlListener.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      // Ensure any previous auth session is completed
      WebBrowser.maybeCompleteAuthSession();

      // Create the redirect URL for your app
      const redirectTo = Linking.createURL('auth/callback');

      console.log('Starting Google OAuth with redirect:', redirectTo);

      // Initiate OAuth flow with Google
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: false,
          // Request additional scopes if needed for Google Calendar
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google OAuth error:', error);
        return { error };
      }

      // Open the OAuth URL in browser
      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo
        );

        if (result.type === 'success') {
          // The deep link handler will process the callback
          return { error: null };
        } else if (result.type === 'cancel') {
          return { error: new Error('User cancelled the sign-in flow') };
        } else {
          return { error: new Error('Authentication failed') };
        }
      }

      return { error: new Error('No OAuth URL returned') };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { error } as { error: any };
    }
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    signInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
