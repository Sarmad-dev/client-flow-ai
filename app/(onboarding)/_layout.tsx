import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="features" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
