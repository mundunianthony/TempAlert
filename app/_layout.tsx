import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import "react-native-reanimated";

// Custom components
import { useColorScheme } from "@/src/hooks/useColorScheme";
import { AuthProvider } from "@/src/context/AuthContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appReady, setAppReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    async function prepare() {
      try {
        // Add any async initialization here (auth checks, API calls, etc.)
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulated loading
      } catch (error) {
        console.error(error);
      } finally {
        setAppReady(true);
        await SplashScreen.hideAsync();
      }
    }

    if (fontsLoaded && !fontError) {
      prepare();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded || !appReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        {fontError && <Text>Error loading fonts</Text>}
      </View>
    );
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        {/* Robust navigation setup */}
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
          }}
          initialRouteName="index" // Explicit initial route
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>

        {/* Platform-safe status bar */}
        <StatusBar
          animated={true}
          backgroundColor="transparent"
          translucent
          style={colorScheme === "dark" ? "light" : "dark"}
        />
      </ThemeProvider>
    </AuthProvider>
  );
}