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
import {
  BASE_URL,
  LAST_NOTIFICATION_OPENED_AT,
  NOTIFICATIONS_QUERY_KEY,
} from "@/constants/Constants";
import { apiRequest } from "@/utils/requestHandler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface Notification {
  id: number;
  title: string;
  message: string;
  createdAt: string;
}

interface NotificationResponse {
  notifications: Notification[];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
}

export const NOTIFICATIONS_PER_PAGE = 10;

export const useNotifications = (onLogout: () => Promise<void>) => {
  const [lastOpenedAt, setLastOpenedAt] = useState<number | null>(null);

  useEffect(() => {
    loadLastOpenedAt();
  }, []);

  const loadLastOpenedAt = async () => {
    try {
      const value = await AsyncStorage.getItem(LAST_NOTIFICATION_OPENED_AT);
      if (value !== null) {
        setLastOpenedAt(parseInt(value, 10));
      } else {
        setLastOpenedAt(0); // Default to 0 if last opened value doesn't exist
      }
    } catch (e) {
      console.error("Failed to load last notification opened time", e);
      setLastOpenedAt(0);
    }
  };

  const markAsRead = useCallback(async () => {
    const now = Date.now();
    setLastOpenedAt(now);
    try {
      await AsyncStorage.setItem(LAST_NOTIFICATION_OPENED_AT, now.toString());
    } catch (e) {
      console.error("Failed to save last notification opened time", e);
    }
  }, []);

  const fetchNotifications = useCallback(
    async ({
      pageParam,
    }: {
      pageParam: number;
    }): Promise<NotificationResponse> => {
      const response = await apiRequest(
        {
          url: `${BASE_URL}/user/notifications`,
          method: "GET",
          params: {
            startIndex: pageParam,
            itemsPerPage: NOTIFICATIONS_PER_PAGE,
          },
        },
        onLogout
      );
      return response?.data;
    },
    [onLogout]
  );

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: [NOTIFICATIONS_QUERY_KEY],
    queryFn: fetchNotifications,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      const nextIndex = lastPage.startIndex + lastPage.itemsPerPage;
      return nextIndex < lastPage.totalResults ? nextIndex : undefined;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });

  const notifications = useMemo(() => {
    if (!data?.pages) return [];

    return data.pages
      .flatMap((page) => page.notifications)
      .map((note) => {
        return {
          ...note,
        };
      });
  }, [data?.pages]);

  const hasUnread = useMemo(() => {
    if (!notifications.length || lastOpenedAt === null) return false;

    const latestNotification = notifications[0];
    if (!latestNotification) return false;

    const latestTime = new Date(
      latestNotification.createdAt.replace(" ", "T") + "Z"
    ).getTime();
    return latestTime > lastOpenedAt;
  }, [notifications, lastOpenedAt]);

  const refresh = async () => {
    await refetch();
  };

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return {
    notifications,
    totalResults: data?.pages[0]?.totalResults || 0,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    error,
    refresh,
    loadMore,
    hasMore: hasNextPage,
    markAsRead,
    hasUnread,
    lastOpenedAt,
  };
};
