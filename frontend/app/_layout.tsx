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
import AppProviders from "@/components/contexts/AppProviders";
import CloseButton from "@/components/headers/CloseButton";
import SplashModal from "@/components/SplashModal";
import { APPS, isAndroid, USER_INFO } from "@/constants/Constants";
import { setApps } from "@/context/slices/appSlice";
import { restoreAuth } from "@/context/slices/authSlice";
import { getUserConfigurations } from "@/context/slices/userConfigSlice";
import { setUserInfo } from "@/context/slices/userInfoSlice";
import { getVersions } from "@/context/slices/versionSlice";
import { AppDispatch, persistor, store } from "@/context/store";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useNotificationNavigation } from "@/hooks/useNotificationNavigation";
import { useNotifications } from "@/hooks/useNotifications";
import { usePushNotificationHandler } from "@/hooks/usePushNotificationHandler";
import { runMigrations } from "@/migrations/migrator";
import { buildAppsWithTokens } from "@/utils/exchangedTokenRehydrator";
import { handleFreshInstall } from "@/utils/freshInstall";
import { performLogout } from "@/utils/performLogout";
import {
  initializeNotifications,
  setupBackgroundNotificationListeners,
  setupMessagingListener,
} from "@/utils/push-notification";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { lockAsync, OrientationLock } from "expo-screen-orientation";
import { getItemAsync } from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { Provider, useDispatch } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

// Component to handle app initialization
function AppInitializer({ onReady }: { onReady: () => void }) {
  const dispatch = useDispatch<AppDispatch>(); // Ensure correct typing for async actions
  const handleLogout = useCallback(async () => {
    await dispatch(performLogout()).unwrap(); // Ensure the logout action is dispatched properly
  }, [dispatch]);

  /**
   * Handles push notification token lifecycle.
   */
  usePushNotificationHandler({ onLogout: handleLogout });

  /**
   * Prefetch notifications on app mount
   */
  useNotifications(handleLogout);

  /**
   * Handle notification tap navigation
   */
  useNotificationNavigation();

  useEffect(() => {
    const initialize = async () => {
      try {
        await handleFreshInstall();
        await runMigrations(); // Runs any migrations.
        const [savedApps, savedUserInfo] = await Promise.all([
          AsyncStorage.getItem(APPS),
          getItemAsync(USER_INFO),
        ]);

        if (savedApps) {
          dispatch(setApps(await buildAppsWithTokens(JSON.parse(savedApps))));
        }

        if (savedUserInfo) {
          dispatch(setUserInfo(JSON.parse(savedUserInfo)));
        }

        dispatch(getVersions(handleLogout));
        dispatch(getUserConfigurations(handleLogout));
        await dispatch(restoreAuth()).unwrap();
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        onReady();
      }
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  return null;
}

const queryClient = new QueryClient();

// Main Root Layout
export default function RootLayout() {
  SplashScreen.hide();
  const colorScheme = useColorScheme();
  const [isAppReady, setIsAppReady] = useState(false);
  const [isMinTimeElapsed, setIsMinTimeElapsed] = useState(false);
  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Called when all app initialization is done
  const onAppLoadComplete = useCallback(() => {
    if (fontsLoaded) {
      setIsAppReady(true);
    }
  }, [fontsLoaded]);

  // Start timer on first render
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMinTimeElapsed(true);
    }, 2000); // 2 seconds

    return () => clearTimeout(timer);
  }, []);

  // Setup FCM foreground messaging listener
  useEffect(() => {
    initializeNotifications();
    const unsubscribe = setupMessagingListener();

    setupBackgroundNotificationListeners();
    return () => unsubscribe();
  }, []);

  // Trigger initialization when fonts are ready
  useEffect(() => {
    if (fontsLoaded) {
      onAppLoadComplete();
    }
  }, [fontsLoaded, onAppLoadComplete]);

  const showSplash = !isAppReady || !isMinTimeElapsed;

  // Lock screen orientation to portrait mode
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        await lockAsync(OrientationLock.PORTRAIT_UP);
      } catch (error) {
        console.error("Error locking orientation:", error);
      }
    };

    lockOrientation();
  }, []);

  if (showSplash) {
    return <SplashModal loading={showSplash} animationType="fade" />;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <AppProviders>
              <AppInitializer onReady={onAppLoadComplete} />
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="update" options={{ headerShown: false }} />
                <Stack.Screen
                  name="qr-scanner"
                  options={{
                    presentation: "modal",
                    title: "QR Scanner",
                    headerShown: isAndroid ? false : true,
                    headerRight: () => <CloseButton />,
                  }}
                />
                <Stack.Screen
                  name="micro-app"
                  options={{ headerBackTitle: "Back" }}
                />
                <Stack.Screen name="+not-found" />
              </Stack>
            </AppProviders>
          </PersistGate>
        </Provider>
      </QueryClientProvider>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
