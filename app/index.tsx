import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const { session, loading, user } = useAuth();
  const { colors } = useTheme();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    if (session && user) {
      checkOnboardingStatus();
    }
  }, [session, user]);

  const checkOnboardingStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('user_onboarding')
        .select('completed')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking onboarding:', error);
        setOnboardingComplete(true);
        return;
      }

      if (!data) {
        // Create onboarding row if missing
        const { error: insertError } = await supabase
          .from('user_onboarding')
          .insert({ user_id: user?.id, completed: false, current_step: 1 });
        if (insertError) {
          console.error('Error creating onboarding row:', insertError);
        }
        setOnboardingComplete(false);
        return;
      }

      setOnboardingComplete(!!data.completed);
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setOnboardingComplete(true);
    }
  };

  if (loading || (session && onboardingComplete === null)) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (session) {
    if (onboardingComplete) {
      return <Redirect href="/(tabs)" />;
    } else {
      return <Redirect href="/(onboarding)/welcome" />;
    }
  }

  return <Redirect href="/(auth)/sign-in" />;
}
