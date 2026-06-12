import { Stack } from 'expo-router';
import { COLORS } from '../constants/colors';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        // This sets the default colors for ANY header that is shown
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      {/* Auth group: No header, so the color won't be seen here */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      
      {/* App group: Headers will now show up with the Navy Blue color */}
      <Stack.Screen name="(app)" options={{ headerShown: true }} />
    </Stack>
  );
}