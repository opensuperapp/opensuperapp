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
import ListItem from "@/components/ListItem";
import SearchBar from "@/components/SearchBar";
import SignInMessage from "@/components/SignInMessage";
import SignInModal from "@/components/SignInModal";
import { Colors } from "@/constants/Colors";
import { NOT_DOWNLOADED } from "@/constants/Constants";
import { AppDispatch, RootState } from "@/context/store";
import {
  downloadMicroApp,
  loadMicroAppDetails,
  removeMicroApp,
} from "@/services/appStoreService";
import { logout } from "@/services/authService";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  SafeAreaView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";

const Store = () => {
  const dispatch = useDispatch();
  const { apps, downloading } = useSelector((state: RootState) => state.apps);
  const downloadProgress = useSelector(
    (state: RootState) => state.apps.downloadProgress
  );
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const { defaultMicroAppIds } = useSelector(
    (state: RootState) => state.appConfig
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
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

  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme ?? "light");

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // load micro apps list
  useEffect(() => {
    const initializeApps = async () => {
      if (!accessToken) return;

      setIsLoading(true);
      try {
        await loadMicroAppDetails(dispatch, logout);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    initializeApps();
  }, [dispatch, accessToken]);

  const handleRemoveMicroApp = async (dispatch: AppDispatch, appId: string) => {
    Alert.alert(
      "Confirm Removal",
      "Are you sure you want to remove this app?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeMicroApp(dispatch, appId, logout);
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

  // Process the installation queue
  useEffect(() => {
    let isProcessing = false;
    const processQueue = async () => {
      if (
        isProcessing ||
        installationQueue.length === 0 ||
        !isMountedRef.current
      )
        return;

      isProcessing = true;
      const currentItem = installationQueue[0];

      try {
        if (!activeDownloadsRef.current.has(currentItem.appId)) {
          activeDownloadsRef.current.add(currentItem.appId);

          dispatch({
            type: "SET_DOWNLOAD_PROGRESS",
            payload: { appId: currentItem.appId, progress: 0 },
          });
          await downloadMicroApp(
            dispatch,
            currentItem.appId,
            currentItem.downloadUrl,
            logout
          );
          if (isMountedRef.current) {
            setInstallationQueue((prev) =>
              prev.filter((item) => item.appId !== currentItem.appId)
            );
          }
        }
      } catch (error) {
        console.error("Installation failed:", error);
        if (isMountedRef.current) {
          Alert.alert("Error", "Installation failed try again later");
          dispatch({
            type: "REMOVE_DOWNLOADING_APP",
            payload: currentItem.appId,
          });
          setInstallationQueue((prev) =>
            prev.filter((item) => item.appId !== currentItem.appId)
          );
        }
      } finally {
        if (isMountedRef.current) {
          activeDownloadsRef.current.delete(currentItem.appId);
          isProcessing = false;
        }
      }
    };

    processQueue();
  }, [installationQueue, dispatch]);

  // Modified download handler to create a serialized task queue
  const handleDownload = (appId: string, downloadUrl: string) => {
    //if not logged in, show signin
    if (!accessToken) {
      setShowModal(true);
      return;
    }

    // Check if already in queue, downloading, or in the downloading state
    const isAlreadyQueued = installationQueue.some(
      (item) => item.appId === appId
    );
    const isCurrentlyDownloading = activeDownloadsRef.current.has(appId);
    const isInDownloadingState = downloading.includes(appId);

    if (!isAlreadyQueued && !isCurrentlyDownloading && !isInDownloadingState) {
      dispatch({
        type: "SET_DOWNLOAD_PROGRESS",
        payload: { appId, progress: 0 },
      });
      setInstallationQueue((prev) => [...prev, { appId, downloadUrl }]);
      dispatch({ type: "ADD_DOWNLOADING_APP", payload: appId });
    }
  };

  // When default apps added need to remove this logic
  if (!accessToken) {
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
    <SafeAreaView
      style={{
        backgroundColor: Colors[colorScheme ?? "light"].primaryBackgroundColor,
        flex: 1,
      }}
    >
      {/* Search Bar */}
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        placeholder="Search apps..."
      />

      <SignInModal visible={showModal} onClose={() => setShowModal(false)} />
      {isLoading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={Colors.companyOrange} size="large" />
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No apps found</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={Keyboard.dismiss}
        />
      )}
    </SafeAreaView>
  );
};

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
    horizontalLine: {
      width: "95%",
      alignSelf: "center",
      height: 1,
      backgroundColor: Colors[colorScheme].secondaryBackgroundColor,
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
    },
    listContent: {
      paddingBottom: 80,
    },
    container: {
      flex: 1,
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
      justifyContent: "space-between",
    },
    signInContainer: {
      flex: 1,
      justifyContent: "space-between",
    },
    overlay: {
      flex: 1,
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
      justifyContent: "center",
      alignItems: "center",
    },
    modal: {
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
      padding: 30,
      borderRadius: 16,
      width: "90%",
      alignItems: "center",
    },
  });

export default Store;
