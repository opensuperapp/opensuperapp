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

import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/context/store";
import { MicroApp } from "@/context/slices/appSlice";
import {
  downloadMicroApp,
  loadMicroAppDetails,
  removeMicroApp,
} from "@/services/appStoreService";
import { logout } from "@/services/authService";
import { getUserConfigurations } from "@/context/slices/userConfigSlice";
import { APP_LIST_CONFIG_KEY, DOWNLOADED } from "@/constants/Constants";
import { router } from "expo-router";
import { ScreenPaths } from "@/constants/ScreenPaths";
import Constants from "expo-constants";

/**
 * Hook for managing My Apps screen
 */
export const useMyApps = () => {
  const dispatch = useDispatch<AppDispatch>();
  const apps = useSelector((state: RootState) => state.apps.apps);
  const { email } = useSelector((state: RootState) => state.auth);
  const { versions, loading: versionsLoading } = useSelector(
    (state: RootState) => state.version
  );
  const userConfigurations = useSelector(
    (state: RootState) => state.userConfig.configurations
  );

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredApps, setFilteredApps] = useState(apps);
  const [syncing, setSyncing] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });

  const version = Constants.expoConfig?.version;

  // Check for app updates
  useEffect(() => {
    const checkVersion = () => {
      if (version && Array.isArray(versions) && versions.length > 0) {
        if (versions[0]?.version > version) {
          router.replace(ScreenPaths.UPDATE);
        }
      }
    };

    checkVersion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions, versionsLoading]);

  // Initialize app data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (!apps || apps.length === 0) {
          await loadMicroAppDetails(dispatch, logout);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  // Sync apps with user configuration
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, userConfigurations]);

  // Filter apps based on search
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

  return {
    filteredApps,
    searchQuery,
    setSearchQuery,
    syncing,
    currentAction,
    progress,
  };
};
