// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useAppLayout } from "@/hooks/useAppLayout";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, store } from "@/context/store";
import SplashModal from "@/components/SplashModal";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppInitializer from "../components/AppInitializer";
import NotificationManager from "../components/NotificationManager";
import { Colors } from "@/constants/Colors";

// Main Root Layout
export default function RootLayout() {
  // Ensure the native splash is hidden; ignore if already hidden
  SplashScreen.hideAsync?.().catch(() => { });
  const colorScheme = useColorScheme();
  const { showSplash, onAppLoadComplete } = useAppLayout();

  if (showSplash) {
    return <SplashModal loading={showSplash} animationType="fade" />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <>
          <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
              <AppInitializer onReady={onAppLoadComplete} />
              <NotificationManager />
              <Stack>
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="update" options={{ headerShown: false }} />
                <Stack.Screen
                  name="micro-app"
                  options={{ headerBackTitle: "Back" }}
                />
                <Stack.Screen name="+not-found" />
              </Stack>
            </PersistGate>
          </Provider>
          <StatusBar
            style={colorScheme === "dark" ? "light" : "dark"}
            backgroundColor={
              Colors[colorScheme === "dark" ? "dark" : "light"].
                primaryBackgroundColor
            }
            translucent={false}
          />
        </>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
