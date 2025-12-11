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

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/context/store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setApps } from "@/context/slices/appSlice";
import { APPS, USER_INFO } from "@/constants/Constants";
import { getUserConfigurations } from "@/context/slices/userConfigSlice";
import { restoreAuth } from "@/context/slices/authSlice";
import { getVersions } from "@/context/slices/versionSlice";
import { setUserInfo } from "@/context/slices/userInfoSlice";
import { performLogout } from "@/utils/performLogout";
import { initializeTelemetry } from "@/telemetry/telemetryService";
import { recordAppStartTime } from "@/telemetry/metrics";

/**
 * Component to handle app initialization
 * Loads persisted data and initializes app state
 */
function AppInitializer({ onReady }: { onReady: () => void }) {
  const dispatch = useDispatch<AppDispatch>();
  
  const handleLogout = async () => {
    await dispatch(performLogout()).unwrap();
  };

  useEffect(() => {
    const initialize = async () => {
      const startTime = Date.now();
      
      try {
        // Initialize telemetry first
        await initializeTelemetry();

        const [savedApps, savedUserInfo] = await Promise.all([
          AsyncStorage.getItem(APPS),
          AsyncStorage.getItem(USER_INFO),
        ]);

        if (savedApps) dispatch(setApps(JSON.parse(savedApps)));
        if (savedUserInfo) dispatch(setUserInfo(JSON.parse(savedUserInfo)));

        dispatch(getVersions(handleLogout));
        dispatch(getUserConfigurations(handleLogout));
        await dispatch(restoreAuth()).unwrap();
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        const initDuration = Date.now() - startTime;
        recordAppStartTime(initDuration);
        onReady();
      }
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  return null;
}

export default AppInitializer;
