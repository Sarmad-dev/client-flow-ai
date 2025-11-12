import { useEffect, useState, useCallback } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ensure redirect can close properly
WebBrowser.maybeCompleteAuthSession();

// Storage keys
const STORAGE_KEYS = {
  TOKEN: 'google_calendar_token',
  USER: 'google_calendar_user',
  REFRESH_TOKEN: 'google_calendar_refresh_token',
};

// Google Calendar API types
interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus?: 'accepted' | 'declined' | 'tentative';
  }>;
  location?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

interface Task {
  title: string;
  notes?: string;
  due?: string;
  status?: 'needsAction' | 'completed';
}

type GoogleAuthHook = {
  user: any | null;
  isConnected: boolean;
  loading: boolean;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  createCalendarEvent: (event: CalendarEvent) => Promise<string | null>;
  createTask: (task: Task) => Promise<string | null>;
  refreshToken: () => Promise<boolean>;
};

export function useGoogleCalendar(): GoogleAuthHook {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [token, setToken] = useState<AuthSession.TokenResponse | null>(null);

  // Load stored data on mount
  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = useCallback(async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER),
      ]);

      if (storedToken && storedUser) {
        const tokenData = JSON.parse(storedToken);
        const userData = JSON.parse(storedUser);

        // Check if token is still valid (not expired)
        if (tokenData.expiresAt && new Date(tokenData.expiresAt) > new Date()) {
          setToken(tokenData as AuthSession.TokenResponse);
          setUser(userData);
        } else {
          // Token expired, try to refresh
          setToken(tokenData as AuthSession.TokenResponse);
          setUser(userData);
          await refreshToken();
        }
      }
    } catch (err) {
      console.error('Error loading stored data:', err);
    }
  }, []);

  const storeData = async (
    tokenData: AuthSession.TokenResponse,
    userData: any
  ) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.TOKEN, JSON.stringify(tokenData)),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData)),
        AsyncStorage.setItem(
          STORAGE_KEYS.REFRESH_TOKEN,
          tokenData.refreshToken || ''
        ),
      ]);
    } catch (err) {
      console.error('Error storing data:', err);
    }
  };

  const clearStoredData = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
        AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
      ]);
    } catch (err) {
      console.error('Error clearing stored data:', err);
    }
  };

  // Create auth request using Android client ID approach (no client secret)
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
      redirectUri: AuthSession.makeRedirectUri({
        scheme: 'nexasuit',
      }),
      responseType: AuthSession.ResponseType.Code,
      scopes: [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/tasks',
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
          // Use Android client ID approach without client secret
          const tokenResponse = await AuthSession.exchangeCodeAsync(
            {
              code,
              clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
              // No client secret for Android client ID
              redirectUri: AuthSession.makeRedirectUri({
                scheme: 'nexasuit',
              }),
              extraParams: {
                code_verifier: request.codeVerifier || '',
              },
            },
            {
              tokenEndpoint: 'https://oauth2.googleapis.com/token',
            }
          );

          // Add expiration time to token
          const tokenWithExpiration = {
            ...tokenResponse,
            expiresAt: new Date(
              Date.now() + (tokenResponse.expiresIn || 3600) * 1000
            ).toISOString(),
          } as any;

          setToken(tokenWithExpiration);

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
              // Store data in AsyncStorage
              await storeData(tokenWithExpiration, userInfo);
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
      await clearStoredData();
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

      // Check if token is expired and refresh if needed
      const tokenData = token as any;
      if (tokenData.expiresAt && new Date(tokenData.expiresAt) <= new Date()) {
        const refreshed = await refreshToken();
        if (!refreshed) return null;
        return token.accessToken;
      }

      return token.accessToken;
    } catch (err) {
      console.error('Error getting access token:', err);
      return null;
    }
  }, [token]);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshTokenValue = await AsyncStorage.getItem(
        STORAGE_KEYS.REFRESH_TOKEN
      );
      if (!refreshTokenValue) return false;

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshTokenValue,
          client_id: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
        }),
      });

      if (response.ok) {
        const newToken = await response.json();
        const updatedToken = {
          ...token,
          ...newToken,
          expiresAt: new Date(
            Date.now() + newToken.expires_in * 1000
          ).toISOString(),
        } as any;

        setToken(updatedToken);
        await AsyncStorage.setItem(
          STORAGE_KEYS.TOKEN,
          JSON.stringify(updatedToken)
        );
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error refreshing token:', err);
      return false;
    }
  }, [token]);

  const createCalendarEvent = useCallback(
    async (event: CalendarEvent): Promise<string | null> => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error('No valid access token available');
        }

        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        );

        if (response.ok) {
          const createdEvent = await response.json();
          return createdEvent.id;
        } else {
          const errorData = await response.json();
          throw new Error(
            `Failed to create calendar event: ${
              errorData.error?.message || 'Unknown error'
            }`
          );
        }
      } catch (err) {
        console.error('Error creating calendar event:', err);
        setError(err as Error);
        return null;
      }
    },
    [getAccessToken]
  );

  const createTask = useCallback(
    async (task: Task): Promise<string | null> => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error('No valid access token available');
        }

        // First, get the default task list
        const taskListsResponse = await fetch(
          'https://tasks.googleapis.com/tasks/v1/users/@me/lists',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!taskListsResponse.ok) {
          throw new Error('Failed to fetch task lists');
        }

        const taskLists = await taskListsResponse.json();
        const defaultListId =
          taskLists.items?.find((list: any) => list.title === 'Default')?.id ||
          '@default';

        // Create the task
        const response = await fetch(
          `https://tasks.googleapis.com/tasks/v1/lists/${defaultListId}/tasks`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: task.title,
              notes: task.notes,
              due: task.due,
              status: task.status || 'needsAction',
            }),
          }
        );

        if (response.ok) {
          const createdTask = await response.json();
          return createdTask.id;
        } else {
          const errorData = await response.json();
          throw new Error(
            `Failed to create task: ${
              errorData.error?.message || 'Unknown error'
            }`
          );
        }
      } catch (err) {
        console.error('Error creating task:', err);
        setError(err as Error);
        return null;
      }
    },
    [getAccessToken]
  );

  return {
    user,
    isConnected: !!user && !!token,
    loading,
    error,
    connect,
    disconnect,
    getAccessToken,
    createCalendarEvent,
    createTask,
    refreshToken,
  };
}
