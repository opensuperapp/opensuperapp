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
import EmptyState from "@/components/apps/EmptyState";
import WheelLoader from "@/components/brand/WheelLoader";
import ListItem from "@/components/ListItem";
import SearchBar from "@/components/SearchBar";
import SignInMessage from "@/components/SignInMessage";
import { spacing, type ThemeColors } from "@/constants/brand";
import { NOT_DOWNLOADED } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { selectIsSignedIn } from "@/context/slices/authSlice";
import {
  removeDownloading,
  updateDownloadProgress,
} from "@/context/slices/appSlice";
import { AppDispatch, RootState } from "@/context/store";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useReconnectCount } from "@/hooks/useReconnectCount";
import {
  downloadMicroApp,
  loadMicroAppDetails,
  removeMicroApp,
} from "@/services/appStoreService";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";

const Store = () => {
  const dispatch = useDispatch();
  const { apps, downloading } = useSelector((state: RootState) => state.apps);
  const downloadProgress = useSelector(
    (state: RootState) => state.apps.downloadProgress
  );
  const isSignedIn = useSelector(selectIsSignedIn);
  const reconnectCount = useReconnectCount();
  const { defaultMicroAppIds } = useSelector(
    (state: RootState) => state.appConfig
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredApps, setFilteredApps] = useState(apps);
  const [installationQueue, setInstallationQueue] = useState<
    {
      appId: string;
      downloadUrl: string;
    }[]
  >([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const isMountedRef = useRef(true);
  const activeDownloadsRef = useRef(new Set<string>());

  const { colors } = useBrandTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const styles = createStyles(colors, tabBarHeight);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // load micro apps list, and again on reconnect: a session restored offline stays
  // signed in throughout, so isSignedIn alone never retries a load that did not get through
  useEffect(() => {
    const initializeApps = async () => {
      // Not on accessToken: a session restored offline has none in Redux, and
      // apiRequest takes the token from SecureStore, refreshing it if it has to.
      if (!isSignedIn) return;

      setIsLoading(true);
      try {
        await loadMicroAppDetails(dispatch);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    initializeApps();
  }, [dispatch, isSignedIn, reconnectCount]);

  const handleRemoveMicroApp = async (dispatch: AppDispatch, appId: string) => {
    // A background version update can be writing the same files; removing
    // underneath it leaves the app half-installed and re-marked as downloaded.
    if (downloading.includes(appId) || activeDownloadsRef.current.has(appId)) {
      Alert.alert(
        "Please wait",
        "This app is still installing. Try again once it finishes."
      );
      return;
    }

    Alert.alert(
      "Confirm Removal",
      "Are you sure you want to remove this app?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeMicroApp(dispatch, appId);
          },
        },
      ]
    );
  };

  // Filter apps based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredApps(apps);
    } else {
      const filtered = apps.filter(
        (app) =>
          app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredApps(filtered);
    }
  }, [searchQuery, apps]);

  // Process the installation queue, one app at a time
  useEffect(() => {
    if (installationQueue.length === 0) return;

    const currentItem = installationQueue[0];
    // Another run of this effect already owns this download; leave it alone,
    // and in particular do not clear its entry from activeDownloadsRef.
    if (activeDownloadsRef.current.has(currentItem.appId)) return;
    activeDownloadsRef.current.add(currentItem.appId);

    const processQueue = async () => {
      try {
        dispatch(
          updateDownloadProgress({ appId: currentItem.appId, progress: 0 })
        );
        await downloadMicroApp(
          dispatch,
          currentItem.appId,
          currentItem.downloadUrl
        );
      } catch (error) {
        console.error("Installation failed:", error);
        dispatch(removeDownloading(currentItem.appId));
        if (isMountedRef.current) {
          Alert.alert("Error", "Installation failed try again later");
        }
      } finally {
        activeDownloadsRef.current.delete(currentItem.appId);
        if (isMountedRef.current) {
          setInstallationQueue((prev) =>
            prev.filter((item) => item.appId !== currentItem.appId)
          );
        }
      }
    };

    processQueue();
  }, [installationQueue, dispatch]);

  // Modified download handler to create a serialized task queue
  const handleDownload = (appId: string, downloadUrl: string) => {
    //if not logged in, show signin
    if (!isSignedIn) {
      router.push(ScreenPaths.SIGN_IN);
      return;
    }

    // Check if already in queue, downloading, or in the downloading state
    const isAlreadyQueued = installationQueue.some(
      (item) => item.appId === appId
    );
    const isCurrentlyDownloading = activeDownloadsRef.current.has(appId);
    const isInDownloadingState = downloading.includes(appId);

    if (!isAlreadyQueued && !isCurrentlyDownloading && !isInDownloadingState) {
      dispatch(updateDownloadProgress({ appId, progress: 0 }));
      setInstallationQueue((prev) => [...prev, { appId, downloadUrl }]);
    }
  };

  // When default apps added need to remove this logic
  if (!isSignedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.signInContainer}>
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <SignInMessage message="To view available apps in the Store, please sign in" />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg, flex: 1 }}>
      {/* Search Bar */}
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        placeholder="Search apps..."
      />

      {isLoading && apps.length === 0 ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <WheelLoader size={44} color={colors.text2} />
        </View>
      ) : (
        <FlatList
          data={filteredApps}
          keyExtractor={(item) => item.appId}
          renderItem={({ item, index }) => (
            <>
              <ListItem
                key={item.appId}
                appId={item.appId}
                name={item.name}
                webViewUri={item.webViewUri}
                clientId={item.clientId}
                exchangedToken={item.exchangedToken}
                exchangedIdToken={item.exchangedIdToken}
                versions={item.versions}
                description={item.description}
                iconUrl={item.iconUrl}
                status={item.status || NOT_DOWNLOADED}
                displayMode={item.displayMode}
                downloading={
                  downloading.includes(item.appId) ||
                  installationQueue.some((i) => i.appId === item.appId)
                }
                downloadProgress={downloadProgress[item.appId]}
                onDownload={() =>
                  handleDownload(item.appId, item.versions[0].downloadUrl)
                }
                onRemove={() => handleRemoveMicroApp(dispatch, item.appId)}
                isDefaultApp={defaultMicroAppIds?.includes(item.appId)}
              />
              {/* Horizontal Line */}
              {index !== filteredApps.length - 1 && (
                <View style={styles.horizontalLine}></View>
              )}
            </>
          )}
          ListEmptyComponent={<EmptyState icon="store" title="No apps found" />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={Keyboard.dismiss}
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors, tabBarHeight: number) =>
  StyleSheet.create({
    horizontalLine: {
      height: 1,
      backgroundColor: colors.line,
    },
    listContent: {
      paddingHorizontal: spacing.screen,
      paddingTop: 8,
      paddingBottom: tabBarHeight,
    },
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
  });

export default Store;
