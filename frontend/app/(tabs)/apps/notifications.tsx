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
import EmptyState from "@/components/apps/EmptyState";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { NotificationsFooter } from "@/components/notifications/NotificationsFooter";
import { spacing } from "@/constants/brand";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useLeaveWhenSessionEnds } from "@/hooks/useLeaveWhenSessionEnds";
import { useLocalNotifications } from "@/hooks/useLocalNotifications";
import { Notification, useNotifications } from "@/hooks/useNotifications";
import { convertToUtc } from "@/utils/date";
import { useIsFocused } from "expo-router/react-navigation";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";

export default function Notifications() {
  const { colors } = useBrandTheme();

  // Notifications are fetched only with a session; My Apps has the Sign In for it.
  useLeaveWhenSessionEnds(() => router.navigate(ScreenPaths.MY_APPS));

  const {
    notifications: serverNotifications,
    isLoading,
    refresh,
    loadMore,
    hasMore,
    isRefetching,
    isFetchingNextPage,
    lastOpenedAt,
    markAsRead,
  } = useNotifications();

  const { localNotifications } = useLocalNotifications();

  const allNotifications = useMemo(() => {
    const localMapped: Notification[] = localNotifications.map((ln, index) => ({
      id: -(index + 1),
      title: ln.title,
      message: ln.body,
      createdAt: ln.triggeredAt.slice(0, 19).replace("T", " "),
    }));
    return [...serverNotifications, ...localMapped].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [serverNotifications, localNotifications]);

  const [highlightTime, setHighlightTime] = useState<number | null>(null);
  const processedRef = useRef(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused && lastOpenedAt !== null && !processedRef.current) {
      setHighlightTime(lastOpenedAt);
      markAsRead();
      processedRef.current = true;
    }
  }, [isFocused, lastOpenedAt, markAsRead]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        processedRef.current = false;
        setHighlightTime(null);
      };
    }, [])
  );

  const renderItem = ({ item }: { item: Notification }) => {
    const itemTime = convertToUtc(item.createdAt)?.getTime() ?? 0;
    return (
      <NotificationItem
        item={item}
        isNew={highlightTime !== null && itemTime > highlightTime}
      />
    );
  };

  return (
    // The list is the screen root so the native bar insets and blurs over it
    allNotifications.length > 0 ? (
      <FlatList
        data={allNotifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || isLoading}
            onRefresh={refresh}
            tintColor={colors.text2}
            colors={[colors.text2]}
            progressBackgroundColor={colors.card}
          />
        }
        onEndReached={() => hasMore && loadMore()}
        ListFooterComponent={
          <NotificationsFooter
            isFetchingNextPage={isFetchingNextPage}
            hasMore={hasMore}
          />
        }
        ListFooterComponentStyle={{ backgroundColor: colors.bg }}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={{
          paddingHorizontal: spacing.screen,
          paddingTop: spacing.screen,
          gap: 10,
          paddingBottom: spacing.screen,
        }}
      />
    ) : (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.text2} />
        ) : (
          <EmptyState
            icon="bell"
            title="You're all caught up"
            description="New notifications from your apps will appear here."
          />
        )}
      </View>
    )
  );
}
