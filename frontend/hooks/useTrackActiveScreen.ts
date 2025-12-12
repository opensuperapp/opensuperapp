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
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { LAST_ACTIVE_PATH_KEY } from "@/constants/Constants";
import { recordScreenView, recordScreenViewDuration } from "@/telemetry/metrics";

export const useTrackActiveScreen = (pathname: ScreenPaths) => {
  const screenStartTimeRef = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!pathname) return;

      const screenStartTime = Date.now();
      screenStartTimeRef.current = screenStartTime;
      recordScreenView(pathname);

      const savePath = async () => {
        // Optional delay — only if needed
        if (pathname === ScreenPaths.FEED) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        await AsyncStorage.setItem(LAST_ACTIVE_PATH_KEY, pathname);
      };

      savePath();

      return () => {
        // Record screen view duration when screen loses focus
        if (screenStartTimeRef.current) {
          const duration = Date.now() - screenStartTimeRef.current;
          recordScreenViewDuration(duration, pathname);
          screenStartTimeRef.current = null;
        }
      };
    }, [pathname])
  );
};
