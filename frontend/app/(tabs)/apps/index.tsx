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
import AppGridItem from "@/components/apps/AppGridItem";
import EmptyState from "@/components/apps/EmptyState";
import SearchBar from "@/components/SearchBar";
import SignInMessage from "@/components/SignInMessage";
import SyncingModal from "@/components/SyncingModal";
import { spacing, type ThemeColors } from "@/constants/brand";
import {
  APP_LIST_CONFIG_KEY,
  APP_UPDATE_CHECK_TIMESTAMP_KEY,
  DOWNLOADED,
  MICRO_APP_STORAGE_DIR,
} from "@/constants/Constants";
import { Directory, Paths } from "expo-file-system";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { MicroApp } from "@/context/slices/appSlice";
import { selectIsSignedIn } from "@/context/slices/authSlice";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { getUserConfigurations } from "@/context/slices/userConfigSlice";
import { AppDispatch, RootState } from "@/context/store";
import { useReconnectCount } from "@/hooks/useReconnectCount";
import { useTrackActiveScreen } from "@/hooks/useTrackActiveScreen";
import {
  downloadMicroApp,
  loadMicroAppDetails,
  removeMicroApp,
} from "@/services/appStoreService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import Constants from "expo-constants";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  SafeAreaView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";

export default function HomeScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const apps = useSelector((state: RootState) => state.apps.apps);
  const downloadProgress = useSelector(
    (state: RootState) => state.apps.downloadProgress
  );
  const isSignedIn = useSelector(selectIsSignedIn);
  const downloading = useSelector((state: RootState) => state.apps.downloading);
  const removing = useSelector((state: RootState) => state.apps.removing);
  const isForceUpdate = useSelector(
    (state: RootState) =>
      state.appConfig.configs.find(
        (config) => config.configKey === "isForceUpdate"
      )?.value ?? false
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredApps, setFilteredApps] = useState(apps);
  const { versions, loading } = useSelector(
    (state: RootState) => state.version
  );
  const userConfigurations = useSelector(
    (state: RootState) => state.userConfig.configurations
  );
  const [syncing, setSyncing] = useState(false);
  const { colors } = useBrandTheme();
  const styles = createStyles(colors);
  const version = Constants.expoConfig?.version;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { columns, columnGap } = spacing.appGrid;
  const cellWidth =
    (windowWidth - spacing.screen * 2 - columnGap * (columns - 1)) / columns;
  const tabBarHeight: number = useBottomTabBarHeight();
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [updatingApps, setUpdatingApps] = useState<string[]>([]);
  const isCheckingUpdates = useRef(false);
  const isSyncingApps = useRef(false);
  useTrackActiveScreen(ScreenPaths.MY_APPS);
  const updateCheckInterval = useSelector(
    (state: RootState) =>
      state.appConfig.configs.find(
        (config) => config.configKey === "microappsUpdateCheckInterval"
      )?.value ?? 0
  );
  // Convert seconds to milliseconds (value from database is in seconds)
  const updateCheckIntervalMs = Number(updateCheckInterval) * 1000;

  // Main App Force Update Screen
  useEffect(() => {
    const checkVersion = () => {
      if (version && Array.isArray(versions) && versions.length > 0) {
        if (versions[0]?.version > version) {
          setTimeout(() => {
            router.replace(ScreenPaths.UPDATE);
          }, 100); // 100ms delay
        }
      }
    };

    checkVersion();
  }, [versions, version]);

  // Handle app updates when screen is focused with time based checking
  useFocusEffect(
    useCallback(() => {
      const checkForUpdates = async () => {
        if (isCheckingUpdates.current || !isSignedIn || !isForceUpdate) {
          return;
        }

        try {
          // Get the last update check timestamp
          const lastCheckTimestamp = await AsyncStorage.getItem(
            APP_UPDATE_CHECK_TIMESTAMP_KEY
          );
          // Get current time
          const now = Date.now();
          // Check if enough time has passed since the last update check
          if (
            lastCheckTimestamp &&
            now - parseInt(lastCheckTimestamp, 10) < updateCheckIntervalMs
          ) {
            return;
          }
          isCheckingUpdates.current = true;
          const checked = await loadMicroAppDetails(
            dispatch,
            (appId: string) => {
              setUpdatingApps((prev) => [...prev, appId]);
            },
            (appId: string) => {
              setUpdatingApps((prev) => prev.filter((id) => id !== appId));
            }
          );
          // Only a fetch that got through counts; a failed one retries on the next focus
          if (!checked) return;
          // Store the current timestamp after successful check
          await AsyncStorage.setItem(
            APP_UPDATE_CHECK_TIMESTAMP_KEY,
            now.toString()
          );
        } catch (error) {
          console.error("Error checking for app updates:", error);
        } finally {
          isCheckingUpdates.current = false;
        }
      };
      checkForUpdates();
      return () => {
        isCheckingUpdates.current = false;
      };
    }, [dispatch, isSignedIn, isForceUpdate, updateCheckIntervalMs])
  );

  // Load micro apps and user configurations if they haven't been initialized yet. Again
  // on reconnect: a session restored offline stays signed in, so isSignedIn never changes
  const reconnectCount = useReconnectCount();
  const handledReconnectCount = useRef(reconnectCount);
  useEffect(() => {
    // A list on screen after an offline start came from disk, so a reconnect fetches anyway
    const isReconnect = reconnectCount !== handledReconnectCount.current;
    handledReconnectCount.current = reconnectCount;

    const initializeApp = async () => {
      if (!isSignedIn) return; // Prevent loading micro apps into UI when logged out

      try {
        if (isReconnect || !apps || apps.length === 0) {
          await loadMicroAppDetails(
            dispatch,
            (appId: string) => {
              setUpdatingApps((prev) => [...prev, appId]);
            },
            (appId: string) => {
              setUpdatingApps((prev) => prev.filter((id) => id !== appId));
            }
          );
        }
        if (!userConfigurations || userConfigurations.length === 0) {
          dispatch(getUserConfigurations());
        }
      } catch (error) {
        console.error("Error during app initialization:", error);
        Alert.alert(
          "Initialization Error",
          "An error occurred while setting up the app. Please restart and try again."
        );
      }
    };

    initializeApp();
  }, [isSignedIn, reconnectCount]);

  // Reconcile what is on disk against the user's app list
  useEffect(() => {
    const syncApps = async (appsToRemove: string[], appsToInstall: string[]) => {
      isSyncingApps.current = true;
      setSyncing(true);
      setCurrentAction(null);
      setProgress({ done: 0, total: appsToRemove.length + appsToInstall.length });

      try {
        for (const appId of appsToRemove) {
          const appData = apps.find((app) => app.appId === appId);
          setCurrentAction(`Removing ${appData?.name || appId}`);
          await removeMicroApp(dispatch, appId);
          setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
        }

        for (const appId of appsToInstall) {
          const appData = apps.find((app) => app.appId === appId);
          if (!appData) continue;
          setCurrentAction(`Downloading ${appData.name}`);
          await downloadMicroApp(
            dispatch,
            appId,
            appData.versions?.[0]?.downloadUrl
          );
          setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
        }
      } catch (error) {
        console.error("App sync failed:", error);
      } finally {
        setCurrentAction(null);
        setSyncing(false);
        isSyncingApps.current = false;
      }
    };

    // This effect re-runs on every `apps` change, including the ones its own
    // installs and removals produce, so it must be inert once disk and config
    // agree — otherwise it fights whatever the user just did in the Store.
    if (isSyncingApps.current) return;
    if (!userConfigurations?.length || !apps?.length) return;

    // An install or removal reaches its final state through several dispatches
    // and a network round trip. Reconciling against a half-applied one is what
    // made Store downloads vanish and Store removals reinstall themselves, so
    // wait for the operation to finish; clearing its flag re-runs this effect.
    if (downloading.length > 0 || removing.length > 0) return;

    const userConfigAppIds = userConfigurations.find(
      (config) => config.configKey === APP_LIST_CONFIG_KEY
    );
    const allowedApps = (userConfigAppIds?.configValue as string[]) || [];

    // Verify if the files actually exist on disk, not just trust the Redux status
    const localAppIds: string[] = [];
    for (const app of apps) {
      if (app?.status === DOWNLOADED) {
        const appDir = new Directory(
          Paths.document,
          MICRO_APP_STORAGE_DIR,
          "micro-apps",
          `${app.appId}-extracted`
        );
        if (appDir.exists) {
          localAppIds.push(app.appId);
        }
      }
    }

    const appsToRemove = localAppIds.filter(
      (appId) => !allowedApps.includes(appId)
    );
    const appsToInstall = allowedApps.filter(
      (appId) => !localAppIds.includes(appId)
    );

    if (appsToRemove.length === 0 && appsToInstall.length === 0) return;

    syncApps(appsToRemove, appsToInstall);
  }, [dispatch, userConfigurations, apps, downloading, removing]);

  // Filter apps based on search query
  useEffect(() => {
    const downloadedApps = apps.filter((app) => app?.status === DOWNLOADED);
    if (searchQuery.trim() === "") {
      setFilteredApps(downloadedApps);
    } else {
      const filtered = downloadedApps.filter((app) =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredApps(filtered);
    }
  }, [searchQuery, apps]);

  if (!isSignedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.signInContainer}>
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <SignInMessage message="To view your apps, please sign in" />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Search Bar */}
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        placeholder="Search apps..."
      />

      <SyncingModal
        syncing={syncing}
        currentAction={currentAction}
        progress={progress}
      />

      <View style={{ marginTop: 16 }}>
        <FlatList
          data={filteredApps}
          keyExtractor={(item) => item.appId}
          numColumns={columns}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <AppGridItem
              width={cellWidth}
              name={item.name}
              webViewUri={item.webViewUri ?? ""}
              clientId={item.clientId ?? ""}
              exchangedToken={item.exchangedToken ?? ""}
              exchangedIdToken={item.exchangedIdToken ?? ""}
              appId={item.appId}
              displayMode={item.displayMode}
              version={item.versions?.[0]?.version}
              isUpdating={updatingApps.includes(item.appId)}
              downloadProgress={downloadProgress[item.appId]}
            />
          )}
          contentContainerStyle={{
            minHeight: windowHeight - 3 * tabBarHeight,
            paddingHorizontal: spacing.screen,
            paddingTop: 6,
            paddingBottom: tabBarHeight,
          }}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={Keyboard.dismiss}
          ListEmptyComponent={
            <EmptyState
              icon="store"
              title={
                searchQuery.trim() === ""
                  ? "No apps yet"
                  : `No apps match “${searchQuery.trim()}”`
              }
              action={{
                label: "Browse the Store",
                onPress: () => router.push(ScreenPaths.STORE),
              }}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: "space-between",
    },
    signInContainer: {
      flex: 1,
      justifyContent: "space-between",
    },
    overlay: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
    },
    modal: {
      backgroundColor: colors.bg,
      padding: 30,
      borderRadius: 16,
      width: "90%",
      alignItems: "center",
    },
    gridRow: {
      gap: spacing.appGrid.columnGap,
      marginBottom: spacing.appGrid.rowGap,
    },
  });
