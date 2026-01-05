import { Stack } from 'expo-router';

export default function TabsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="HomeScreen"
        options={{ title: 'Study Together' }}
      />
      <Stack.Screen
        name="CreateSessionScreen"
        options={{ title: 'New Session' }}
      />
      <Stack.Screen
        name="ActiveSessionScreen"
        options={{
          title: 'Active Session',
          headerLeft: () => null,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="SessionReportScreen"
        options={{ title: 'Session Complete' }}
      />
    </Stack>
  );
}
