import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="gender" />
      <Stack.Screen name="measurements" />
      <Stack.Screen name="birthdate" />
      <Stack.Screen name="goal" />
      <Stack.Screen name="diet" />
      <Stack.Screen name="allergies" />
      <Stack.Screen name="cooking" />
      <Stack.Screen name="budget" />
      <Stack.Screen name="generate" />
      <Stack.Screen name="account" />
    </Stack>
  );
}
