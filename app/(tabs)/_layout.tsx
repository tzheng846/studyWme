import { Stack } from "expo-router";

export default function TabsLayout() {
  return (
    <Stack>
      <Stack.Screen name="HomeScreen" options={{ headerShown: false }} />
      <Stack.Screen
        name="AccountHistoryScreen"
        options={{ title: "Account History" }}
      />
      <Stack.Screen
        name="CreateSessionScreen"
        options={{ title: "New Session" }}
      />
      <Stack.Screen
        name="JoinSessionScreen"
        options={{ title: "Join Session" }}
      />
      <Stack.Screen
        name="LobbyScreen"
        options={{
          title: "Lobby",
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="ActiveSessionScreen"
        options={{
          title: "Active Session",
          headerLeft: () => null,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="SessionReportScreen"
        options={{ title: "Session Complete" }}
      />
    </Stack>
  );
}
