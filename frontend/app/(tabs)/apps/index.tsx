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
import SearchBar from "@/components/SearchBar";
import SyncingModal from "@/components/SyncingModal";
import Widget from "@/components/Widget";
import { Colors } from "@/constants/Colors";
import {
  APP_LIST_CONFIG_KEY,
  APP_UPDATE_CHECK_TIMESTAMP_KEY,
  DOWNLOADED,
} from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { MicroApp } from "@/context/slices/appSlice";
import { getUserConfigurations } from "@/context/slices/userConfigSlice";
import { AppDispatch, RootState } from "@/context/store";
import { useTrackActiveScreen } from "@/hooks/useTrackActiveScreen";
import {
  downloadMicroApp,
  loadMicroAppDetails,
  removeMicroApp,
} from "@/services/appStoreService";
import { logout } from "@/services/authService";
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
  Text,
  useColorScheme,
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
  const { email } = useSelector((state: RootState) => state.auth);
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
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme ?? "light");
  const version = Constants.expoConfig?.version;
  const { height: windowHeight } = useWindowDimensions();
  const tabBarHeight: number = useBottomTabBarHeight();
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [updatingApps, setUpdatingApps] = useState<string[]>([]);
  const isCheckingUpdates = useRef(false);
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
        if (isCheckingUpdates.current || !email || !isForceUpdate) {
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
          await loadMicroAppDetails(
            dispatch,
            logout,
            (appId: string) => {
              setUpdatingApps((prev) => [...prev, appId]);
            },
            (appId: string) => {
              setUpdatingApps((prev) => prev.filter((id) => id !== appId));
            }
          );
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
    }, [dispatch, email, isForceUpdate, updateCheckIntervalMs])
  );

  // Load micro apps and user configurations if they haven't been initialized yet
  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (!apps || apps.length === 0) {
          await loadMicroAppDetails(
            dispatch,
            logout,
            (appId: string) => {
              setUpdatingApps((prev) => [...prev, appId]);
            },
            (appId: string) => {
              setUpdatingApps((prev) => prev.filter((id) => id !== appId));
            }
          );
        }
        if (!userConfigurations || userConfigurations.length === 0) {
          dispatch(getUserConfigurations(logout));
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
  }, [email]);

  // Load saved app order from AsyncStorage on mount
  useEffect(() => {
    const syncApps = async () => {
      setSyncing(true);
      setProgress({ done: 0, total: 0 });
      setCurrentAction(null);

      try {
        const userConfigAppIds = userConfigurations.find(
          (config) => config.configKey === APP_LIST_CONFIG_KEY
        );

        const allowedApps = (userConfigAppIds?.configValue as string[]) || [];

        const localApps: MicroApp[] = apps.filter(
          (app) => app?.status === DOWNLOADED
        );

        const localAppIds = localApps.map((app) => app.appId);
        const appsToRemove = localAppIds.filter(
          (appId) => !allowedApps.includes(appId)
        );
        const appsToInstall = allowedApps.filter(
          (appId) => !localAppIds.includes(appId)
        );

        const totalSteps = appsToRemove.length + appsToInstall.length;
        setProgress({ done: 0, total: totalSteps });

        // Remove apps
        for (const appId of appsToRemove) {
          const appData = apps.find((app) => app.appId === appId);
          setCurrentAction(`Removing ${appData?.name || appId}`);
          await removeMicroApp(dispatch, appId, logout);
          setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
        }

        let updatedApps = localApps.filter(
          (app) => !appsToRemove.includes(app.appId)
        );

        // Install apps
        for (const appId of appsToInstall) {
          const appData = apps.find((app) => app.appId === appId);
          if (appData) {
            setCurrentAction(`Downloading ${appData.name}`);
            await downloadMicroApp(
              dispatch,
              appId,
              appData.versions?.[0]?.downloadUrl,
              logout
            );
            updatedApps.push({
              ...appData,
              status: DOWNLOADED,
            });
            setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
          }
        }
      } catch (error) {
        console.error("App sync failed:", error);
      } finally {
        setCurrentAction(null);
        setSyncing(false);
      }
    };

    if (userConfigurations && userConfigurations.length > 0) syncApps();
  }, [dispatch, userConfigurations]);

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

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: Colors[colorScheme ?? "light"].primaryBackgroundColor,
      }}
    >
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
          numColumns={4}
          renderItem={({ item }) => (
            <Widget
              iconUrl={item.iconUrl}
              name={item.name}
              webViewUri={item.webViewUri ?? ""}
              appName={item.name}
              clientId={item.clientId ?? ""}
              exchangedToken={item.exchangedToken ?? ""}
              appId={item.appId}
              displayMode={item.displayMode}
              version={item.versions?.[0]?.version}
              isUpdating={updatingApps.includes(item.appId)}
              downloadProgress={downloadProgress[item.appId]}
            />
          )}
          contentContainerStyle={{
            minHeight: windowHeight - 3 * tabBarHeight,
          }}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={Keyboard.dismiss}
          ListEmptyComponent={
            <>
              {searchQuery.trim() === "" ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No apps found{"\n"}Visit the{" "}
                    <Text
                      onPress={() => router.push(ScreenPaths.STORE)}
                      style={{ color: Colors.companyOrange }}
                    >
                      Store
                    </Text>{" "}
                    to download apps
                  </Text>
                </View>
              ) : (
                <View style={styles.emptyAppsContainer}>
                  <Text style={styles.emptyText}>No matching apps found</Text>
                </View>
              )}
            </>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors[colorScheme].secondaryBackgroundColor,
      borderRadius: 10,
      marginHorizontal: 16,
      marginVertical: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      color: Colors[colorScheme].text,
      fontSize: 16,
    },
    emptyAppsContainer: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 40,
      marginTop: 24,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    emptyText: {
      color: Colors[colorScheme].secondaryTextColor,
      fontSize: 16,
      textAlign: "center",
    },
    columnWrapper: {
      justifyContent: "space-between",
      marginBottom: 16,
    },
    floatingButton: {
      height: 55,
      width: 55,
      backgroundColor: Colors.companyOrange,
      position: "absolute",
      bottom: 16,
      right: 16,
      borderRadius: "50%",
      alignItems: "center",
      justifyContent: "center",
      elevation: 3,
    },
  });
