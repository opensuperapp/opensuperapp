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
import { BASE_URL } from "@/constants/Constants";
import { apiRequest } from "@/utils/requestHandler";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useNotificationStorage } from "./useNotificationStorage";

export interface Notification {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  isNew?: boolean;
}

interface NotificationResponse {
  notifications: Notification[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
}

export const useNotifications = (onLogout: () => Promise<void>) => {
  const { lastOpenedAt } = useNotificationStorage();

  const fetchNotifications = async (): Promise<NotificationResponse> => {
    const response = await apiRequest(
      {
        url: `${BASE_URL}/user/notifications`,
        method: "GET",
        params: {
          startIndex: 0,
          itemsPerPage: 10,
        },
      },
      onLogout
    );
    return response?.data;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Process notifications to add the `isNew` flag
  const notifications: Notification[] =
    data?.notifications.map((note) => {
      const isNew = lastOpenedAt
        ? dayjs(note.createdAt).isAfter(dayjs(lastOpenedAt))
        : true;

      return {
        ...note,
        isNew,
      };
    }) || [];

  const unreadCount = notifications.filter((n) => n.isNew).length;

  return {
    notifications,
    totalResults: data?.totalResults || 0,
    unreadCount,
    isLoading,
    error,
    refetch,
  };
};
