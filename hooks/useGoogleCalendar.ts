import { useEffect, useState, useCallback } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

// Ensure redirect can close properly
WebBrowser.maybeCompleteAuthSession();

type GoogleAuthHook = {
  user: any | null;
  isConnected: boolean;
  loading: boolean;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

export function useGoogleCalendar(): GoogleAuthHook {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [token, setToken] = useState<AuthSession.TokenResponse | null>(null);

  // Create auth request
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
      redirectUri: AuthSession.makeRedirectUri({
        scheme: 'clientflowai',
        path: 'auth',
      }),
      responseType: AuthSession.ResponseType.Code,
      scopes: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      extraParams: {
        prompt: 'consent',
        access_type: 'offline',
      },
    },
    {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    }
  );

  // Handle auth response
  useEffect(() => {
    const exchangeCode = async () => {
      if (response?.type === 'success' && request) {
        try {
          setLoading(true);
          setError(null);

          const { code } = response.params;
          const tokenResponse = await AuthSession.exchangeCodeAsync(
            {
              code,
              clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
              clientSecret: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET!,
              redirectUri: AuthSession.makeRedirectUri({
                scheme: 'clientflowai',
                path: 'auth',
              }),
              extraParams: {
                code_verifier: request.codeVerifier || '',
              },
            },
            {
              tokenEndpoint: 'https://oauth2.googleapis.com/token',
            }
          );

          setToken(tokenResponse);

          // Get user info
          if (tokenResponse.accessToken) {
            const userInfoResponse = await fetch(
              'https://www.googleapis.com/oauth2/v2/userinfo',
              {
                headers: {
                  Authorization: `Bearer ${tokenResponse.accessToken}`,
                },
              }
            );

            if (userInfoResponse.ok) {
              const userInfo = await userInfoResponse.json();
              setUser(userInfo);
            }
          }
        } catch (err) {
          console.error('Token exchange failed:', err);
          setError(err as Error);
        } finally {
          setLoading(false);
        }
      } else if (response?.type === 'error') {
        setError(new Error(response.error?.message || 'Authentication failed'));
        setLoading(false);
      }
    };

    exchangeCode();
  }, [response, request]);

  const connect = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await promptAsync();
    } catch (err) {
      console.error('Google Sign-In error:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [promptAsync]);

  const disconnect = useCallback(async () => {
    try {
      setLoading(true);
      if (token?.accessToken) {
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `token=${token.accessToken}`,
        });
      }
      setToken(null);
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Sign-out error:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      if (!token?.accessToken) return null;
      return token.accessToken;
    } catch (err) {
      console.error('Error getting access token:', err);
      return null;
    }
  }, [token]);

  return {
    user,
    isConnected: !!user && !!token,
    loading,
    error,
    connect,
    disconnect,
    getAccessToken,
  };
}
