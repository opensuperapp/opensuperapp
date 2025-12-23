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
import { useEffect, useState } from "react";
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

export const NOTIFICATIONS_PER_PAGE = 10;

export const useNotifications = (onLogout: () => Promise<void>) => {
  const { lastOpenedAt } = useNotificationStorage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [startIndex, setStartIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = async (): Promise<NotificationResponse> => {
    if (startIndex > 0 && !hasMore) {
      return {
        notifications: [],
        totalResults: 0,
        startIndex,
        itemsPerPage: NOTIFICATIONS_PER_PAGE,
      };
    }

    const response = await apiRequest(
      {
        url: `${BASE_URL}/user/notifications`,
        method: "GET",
        params: {
          startIndex,
          itemsPerPage: NOTIFICATIONS_PER_PAGE,
        },
      },
      onLogout
    );
    return response?.data;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["notifications", startIndex],
    queryFn: fetchNotifications,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  useEffect(() => {
    if (data?.notifications) {
      const newNotifications: Notification[] = data.notifications.map(
        (note) => {
          const createdAtUtc = new Date(note.createdAt.replace(" ", "T") + "Z");
          const isNew = lastOpenedAt
            ? createdAtUtc > new Date(lastOpenedAt)
            : true;

          return {
            ...note,
            isNew,
          };
        }
      );

      if (startIndex === 0) {
        setNotifications(newNotifications);
      } else {
        setNotifications((prev) => [...prev, ...newNotifications]);
      }

      console.log("tot notifications", notifications.length);

      if (data?.totalResults !== undefined) {
        const currentCount = startIndex + newNotifications.length;
        setHasMore(currentCount < data.totalResults);
      }
    }
  }, [data, lastOpenedAt, startIndex]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setStartIndex((prev) => prev + NOTIFICATIONS_PER_PAGE);
    }
  };

  const refresh = async () => {
    if (startIndex !== 0) {
      setStartIndex(0);
    } else {
      await refetch();
    }
  };

  const unreadCount = notifications.filter((n) => n.isNew).length;

  return {
    notifications,
    totalResults: data?.totalResults || 0,
    unreadCount,
    isLoading,
    error,
    refresh,
    loadMore,
    hasMore,
  };
};
