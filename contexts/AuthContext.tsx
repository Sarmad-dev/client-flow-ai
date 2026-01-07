import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import {
  GoogleSignin,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Linking } from 'react-native';
import { Profile } from '@/hooks/useProfile';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    });

    console.log('CLIENT ID: ', process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID);
    WebBrowser.maybeCompleteAuthSession();

    const loadSessionAndUser = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.log('Session Error: ', error);
        throw error;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session?.user.id)
        .single();

      setUser(session?.user as User);
      setProfile(profile);
      setSession(session);
      setLoading(false);
    };

    loadSessionAndUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // // Handle OAuth deep links (PKCE)
    const urlListener = Linking.addEventListener('url', async ({ url }) => {
      console.log('Deep link received:', url);
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          console.error('exchangeCodeForSession error:', error);
        } else if (data?.session) {
          console.log('Successfully exchanged code for session');
          setSession(data.session);
          setUser(data.session.user ?? null);
        }
      } catch (e) {
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
    await supabase.auth.signOut({
      scope: 'global',
    });

    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      // Ensure any previous auth session is completed
      WebBrowser.maybeCompleteAuthSession();

      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      console.log('ID Token: ', response.data?.idToken);
      if (isSuccessResponse(response)) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.data.idToken!,
        });

        if (error) {
          console.error('Google sign-in error:', error);
          return { error };
        }

        if (data?.session) {
          console.log('Successfully signed in with Google');
          // The auth state change listener will handle the redirect
          return { error: null };
        }
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // play services not available or outdated
      } else {
        // some other error happened
      }
      return { error } as { error: any };
    }

    return { error: new Error('Sign-in failed') };
  };

  const value: AuthContextType = {
    session,
    user,
    profile,
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
