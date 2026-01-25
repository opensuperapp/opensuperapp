// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
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
import { LAST_NOTIFICATION_OPENED_AT } from "@/constants/Constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface NotificationsContextType {
  lastOpenedAt: number | null;
  markAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | null>(
  null
);

export const useNotificationsContext = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotificationsContext must be used within NotificationsProvider"
    );
  }
  return context;
};

export const NotificationsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [lastOpenedAt, setLastOpenedAt] = useState<number | null>(null);

  useEffect(() => {
    loadLastOpenedAt();
  }, []);

  const loadLastOpenedAt = async () => {
    try {
      const value = await AsyncStorage.getItem(LAST_NOTIFICATION_OPENED_AT);
      if (value !== null) {
        setLastOpenedAt(parseInt(value));
      } else {
        setLastOpenedAt(0);
      }
    } catch (e) {
      console.error("Failed to load last notification opened time", e);
      setLastOpenedAt(0);
    }
  };

  const markAsRead = async () => {
    const now = Date.now();
    setLastOpenedAt(now);
    try {
      await AsyncStorage.setItem(LAST_NOTIFICATION_OPENED_AT, now.toString());
    } catch (e) {
      console.error("Failed to save last notification opened time", e);
    }
  };

  return (
    <NotificationsContext.Provider value={{ lastOpenedAt, markAsRead }}>
      {children}
    </NotificationsContext.Provider>
  );
};
