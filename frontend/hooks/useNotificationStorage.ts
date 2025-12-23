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
import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

const STORAGE_KEY_LAST_OPENED = "notifications_last_opened";

export const useNotificationStorage = (shouldUpdate: boolean = false) => {
  const [lastOpenedAt, setLastOpenedAt] = useState<string | null>(null);

  useEffect(() => {
    const initStorage = async () => {
      try {
        const storedDate = await AsyncStorage.getItem(STORAGE_KEY_LAST_OPENED);
        setLastOpenedAt(storedDate);
        if (shouldUpdate) {
          await AsyncStorage.setItem(
            STORAGE_KEY_LAST_OPENED,
            dayjs().toISOString()
          );
        }
      } catch (error) {
        console.error("Failed to access notification storage", error);
      }
    };

    initStorage();
  }, [shouldUpdate]);

  return { lastOpenedAt };
};
