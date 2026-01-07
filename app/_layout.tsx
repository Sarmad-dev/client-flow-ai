import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { AlertProvider } from '@/contexts/CustomAlertContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Platform } from 'react-native';

export default function RootLayout() {
  useFrameworkReady();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 2,
      },
      mutations: {
        retry: 1,
      },
    },
  });

  useEffect(() => {
    if (Platform.OS === 'android') {
      import('expo-navigation-bar')
        .then((NavigationBar) => {
          NavigationBar.setVisibilityAsync('hidden');
          NavigationBar.setBehaviorAsync('overlay-swipe');
        })
        .catch(() => {
          console.log('NavigationBar not available');
        });
    }
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <AlertProvider>
          <SubscriptionProvider>
            <QueryClientProvider client={queryClient}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
                <Stack.Screen name="auth" />
              </Stack>
              <StatusBar style="auto" />
            </QueryClientProvider>
          </SubscriptionProvider>
        </AlertProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
