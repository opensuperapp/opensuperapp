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
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LAST_ACTIVE_PATH_KEY } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";

const validPaths = Object.values(ScreenPaths);

const isValidPath = (path: string): path is ScreenPaths => {
  return validPaths.includes(path as ScreenPaths);
};

export const useRestoreLastTab = () => {
  const router = useRouter();
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    const restoreTab = async () => {
      try {
        const lastRoute = await AsyncStorage.getItem(LAST_ACTIVE_PATH_KEY);

        if (lastRoute && isValidPath(lastRoute)) {
          setTimeout(() => {
            router.replace(lastRoute as ScreenPaths);
            setIsRestored(true);
          }, 100);
        } else {
          // If no last tab is found, go to Discovery
          router.replace(ScreenPaths.FEED);
          setIsRestored(true);
        }
      } catch (error) {
        console.error("Failed to restore last tab:", error);
      }
    };

    restoreTab();
  }, []);

  // Prevent Discovery from showing on initial load if it's already being processed
  if (!isRestored) return null; // Prevent rendering until restored
  return null;
};
