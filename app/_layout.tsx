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

export default function RootLayout() {
  useFrameworkReady();
  const queryClient = new QueryClient();

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
              </Stack>
              <StatusBar style="auto" />
            </QueryClientProvider>
          </SubscriptionProvider>
        </AlertProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
