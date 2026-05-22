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

import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/context/store";
import {
  downloadMicroApp,
  loadMicroAppDetails,
  removeMicroApp,
} from "@/services/appStoreService";
import { logout } from "@/services/authService";

/**
 * Hook for managing Store screen - app downloads and removals
 */
export const useStore = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { apps, downloading } = useSelector((state: RootState) => state.apps);
  const { accessToken } = useSelector((state: RootState) => state.auth);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredApps, setFilteredApps] = useState(apps);
  const [installationQueue, setInstallationQueue] = useState<
    { appId: string; downloadUrl: string }[]
  >([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const isMountedRef = useRef(true);
  const activeDownloadsRef = useRef(new Set<string>());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load micro apps list
  useEffect(() => {
    const initializeApps = async () => {
      setIsLoading(true);
      if (accessToken) loadMicroAppDetails(dispatch, logout);
      setIsLoading(false);
    };

    initializeApps();
  }, [dispatch, accessToken]);

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
    const processQueue = async () => {
      if (isProcessingQueue || installationQueue.length === 0) return;

      setIsProcessingQueue(true);
      const currentItem = installationQueue[0];

      try {
        activeDownloadsRef.current.add(currentItem.appId);

        await downloadMicroApp(
          dispatch,
          currentItem.appId,
          currentItem.downloadUrl,
          logout
        );

        if (isMountedRef.current) {
          setInstallationQueue((prev) => prev.slice(1));
        }
      } catch (error) {
        console.error("Installation failed:", error);
        Alert.alert("Error", "Installation failed try again later");
        setInstallationQueue((prev) => prev.slice(1));
        dispatch({
          type: "REMOVE_DOWNLOADING_APP",
          payload: currentItem.appId,
        });
      } finally {
        activeDownloadsRef.current.delete(currentItem.appId);
        if (isMountedRef.current) {
          setIsProcessingQueue(false);
        }
      }
    };

    processQueue();
  }, [installationQueue, isProcessingQueue, dispatch]);

  const handleDownload = (appId: string, downloadUrl: string) => {
    if (!accessToken) {
      setShowModal(true);
      return;
    }

    const isAlreadyQueued = installationQueue.some(
      (item) => item.appId === appId
    );
    const isCurrentlyDownloading = activeDownloadsRef.current.has(appId);

    if (!isAlreadyQueued && !isCurrentlyDownloading) {
      setInstallationQueue((prev) => [...prev, { appId, downloadUrl }]);
      dispatch({ type: "ADD_DOWNLOADING_APP", payload: appId });
    }
  };

  const handleRemoveMicroApp = async (appId: string) => {
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

  return {
    accessToken,
    filteredApps,
    downloading,
    installationQueue,
    isLoading,
    showModal,
    setShowModal,
    searchQuery,
    setSearchQuery,
    handleDownload,
    handleRemoveMicroApp,
  };
};
