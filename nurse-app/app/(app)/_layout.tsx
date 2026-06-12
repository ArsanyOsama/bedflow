import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="wards" />
      <Stack.Screen name="beds" />
      <Stack.Screen name="update-bed" />
    </Stack>
  );
}