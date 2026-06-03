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
import ContentEmptyView from "@/components/ContentEmptyView";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { NotificationsFooter } from "@/components/notifications/NotificationsFooter";
import { Colors } from "@/constants/Colors";
import { Styles } from "@/constants/Styles";
import { useLocalNotifications } from "@/hooks/useLocalNotifications";
import { Notification, useNotifications } from "@/hooks/useNotifications";
import { logout } from "@/services/authService";
import { convertToUtc } from "@/utils/date";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useIsFocused } from "@react-navigation/native";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  useColorScheme,
  View,
} from "react-native";

export default function Notifications() {
  const colorScheme = useColorScheme() ?? "light";
  const tabbarHeight = useBottomTabBarHeight();

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
  } = useNotifications(logout);

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
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: Colors[colorScheme].primaryBackgroundColor,
      }}
    >
      {allNotifications.length > 0 ? (
        <FlatList
          data={allNotifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || isLoading}
              onRefresh={refresh}
            />
          }
          onEndReached={() => hasMore && loadMore()}
          ListFooterComponent={
            <NotificationsFooter
              isFetchingNextPage={isFetchingNextPage}
              hasMore={hasMore}
            />
          }
          ListFooterComponentStyle={{
            backgroundColor: Colors[colorScheme].primaryBackgroundColor,
          }}
          contentContainerStyle={{
            paddingBottom: tabbarHeight - Styles.Padding.default * 2,
          }}
          scrollIndicatorInsets={{
            bottom: tabbarHeight - Styles.Padding.default * 2,
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
            <ActivityIndicator size="large" />
          ) : (
            <ContentEmptyView
              header={
                <Ionicons
                  name="notifications"
                  size={30}
                  color={Colors.companyOrange}
                />
              }
              title="No notifications yet."
              description="You'll see your notifications here."
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
