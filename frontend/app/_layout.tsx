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
import OfflineToast from "@/components/OfflineToast";
import SessionExpiredPrompt from "@/components/SessionExpiredPrompt";
import CloseButton from "@/components/headers/CloseButton";
import SplashModal from "@/components/SplashModal";
import { isAndroid, NOTIFICATIONS_QUERY_KEY } from "@/constants/Constants";
import { signInSheetOptions } from "@/constants/signInSheetOptions";
import { AppDispatch, persistor, store } from "@/context/store";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useNotificationNavigation } from "@/hooks/useNotificationNavigation";
import { useOfflineQueueReplay } from "@/hooks/useOfflineQueueReplay";
import { useProactiveTokenRefresh } from "@/hooks/useProactiveTokenRefresh";
import { usePushNotificationHandler } from "@/hooks/usePushNotificationHandler";
import { useSessionListener } from "@/hooks/useSessionListener";
import {
  onRemoteConfigChange,
  initializeRemoteConfig,
} from "@/services/remoteConfig";
import { initializeApp } from "@/utils/initializeApp";
import {
  initializeNotifications,
  setupBackgroundNotificationListeners,
  setupMessagingListener,
} from "@/utils/push-notification";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, useSegments } from "expo-router";
import { lockAsync, OrientationLock } from "expo-screen-orientation";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Provider, useDispatch } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

// Screens that show the offline toast themselves. Tab screens float it above their tab
// bar; a micro-app keeps it inside its own screen, so the toast moves with the screen
// rather than staying on top of everything above the stack.
const ROUTES_WITH_OWN_OFFLINE_TOAST = ["(tabs)", "micro-app"];

// On Android the sign-in sheet is a screen in this stack, so a toast rendered
// after the stack would cover the sheet's buttons.
const ROUTES_WITHOUT_OFFLINE_TOAST = ["sign-in"];

// Every other route has no bar, so the toast sits on the screen's bottom edge.
function StackOfflineToast() {
  const segments = useSegments();
  const insets = useSafeAreaInsets();

  if (
    ROUTES_WITH_OWN_OFFLINE_TOAST.includes(segments[0]) ||
    ROUTES_WITHOUT_OFFLINE_TOAST.includes(segments[0])
  ) {
    return null;
  }

  return <OfflineToast bottom={0} bottomInset={insets.bottom} />;
}

// Component to handle app initialization
function AppInitializer({ onReady }: { onReady: () => void }) {
  const dispatch = useDispatch<AppDispatch>(); // Ensure correct typing for async actions

  // Before the initialization effect below, so the refreshes it starts are heard.
  useSessionListener();

  /**
   * Handles push notification token lifecycle.
   */
  usePushNotificationHandler();

  useNotificationNavigation();

  useOfflineQueueReplay();

  useProactiveTokenRefresh();

  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        queryClient.invalidateQueries({
          queryKey: [NOTIFICATIONS_QUERY_KEY],
        });
      }
    });

    return () => subscription.remove();
  }, [queryClient]);

  useEffect(() => {
    const initialize = async () => {
      await initializeApp(dispatch);
      onReady();
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

  // Initialize Firebase Remote Config
  useEffect(() => {
    initializeRemoteConfig();

    const unsubscribe = onRemoteConfigChange((error, _) => {
      if (error) {
        console.error("Error fetching remote config:", error);
        return;
      }
    });
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
                <Stack.Screen name="sign-in" options={signInSheetOptions} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StackOfflineToast />
              <SessionExpiredPrompt />
            </AppProviders>
          </PersistGate>
        </Provider>
      </QueryClientProvider>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}
