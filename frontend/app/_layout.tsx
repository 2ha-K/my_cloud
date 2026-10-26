import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MediaRepositoryProvider } from "../services/MediaRepositoryProvider";
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MediaRepositoryProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen
              name="media/[id]"
              options={{
                animation: "fade",
                contentStyle: { backgroundColor: "#000" },
              }}
            />
          </Stack>
        </MediaRepositoryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
