import { Colors } from "@/constants/Colors";
import { Styles } from "@/constants/Styles";
import { Notification, useNotifications } from "@/hooks/useNotifications";
import { logout } from "@/services/authService";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useIsFocused } from "@react-navigation/native";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

/**
 * Format the notification date to a human readable string.
 * @param dateString - The date string to format.
 * @returns The formatted date string.
 */
const formatNotificationDate = (dateString: string) => {
  const date = new Date(dateString.replace(" ", "T") + "Z");
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (isToday) {
    return `Today at ${time}`;
  } else if (isYesterday) {
    return `Yesterday at ${time}`;
  } else {
    const day = String(date.getDate()).padStart(2, "0");
    const month = date
      .toLocaleString("en-US", { month: "short" })
      .toUpperCase();
    const year = date.getFullYear();
    return `${day} ${month} ${year} at ${time}`;
  }
};

const Notifications = () => {
  const colorScheme = useColorScheme() ?? "light";
  const tabbarHeight = useBottomTabBarHeight();

  const styles = createStyles(colorScheme);

  const {
    notifications,
    isLoading,
    error,
    refresh,
    loadMore,
    hasMore,
    isRefetching,
    isFetchingNextPage,
    lastOpenedAt,
    markAsRead,
  } = useNotifications(logout);

  const [highlightTime, setHighlightTime] = useState<number | null>(null);
  const processedRef = useRef(false);
  const isFocused = useIsFocused();

  // Logic Effect: Runs when focused and data is ready
  useEffect(() => {
    if (isFocused && lastOpenedAt !== null && !processedRef.current) {
      setHighlightTime(lastOpenedAt);
      markAsRead();
      processedRef.current = true;
    }
  }, [isFocused, lastOpenedAt, markAsRead]);

  // Cleanup Effect: Resets ref on blur
  useFocusEffect(
    useCallback(() => {
      return () => {
        processedRef.current = false;
        setHighlightTime(null);
      };
    }, [])
  );

  const handleLoadMore = () => {
    if (hasMore) {
      console.log("Loading more notifications");
      loadMore();
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const itemTime = new Date(item.createdAt.replace(" ", "T") + "Z").getTime();
    const isNew = highlightTime !== null && itemTime > highlightTime;

    return (
      <View
        style={[
          {
            flexDirection: "row",
            padding: Styles.Padding.default,
            gap: 12,
            alignItems: "flex-start",
            borderBottomWidth: 1,
            borderBottomColor: Colors[colorScheme].borderColor,
            backgroundColor: isNew
              ? Colors.companyOrange15
              : Colors[colorScheme].primaryBackgroundColor,
          },
        ]}
      >
        <View
          style={{
            backgroundColor: Colors.companyOrange20,
            width: 36,
            height: 36,
            borderRadius: Styles.BorderRadius.medium,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="notifications"
            size={20}
            color={Colors.companyOrange}
          />
        </View>
        <View style={{ flex: 1, flexDirection: "column", gap: 4 }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={[styles.date, isNew && styles.newDate]}>
            {formatNotificationDate(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {error ? (
        <Text>Failed to load notifications</Text>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || isLoading}
              onRefresh={refresh}
            />
          }
          onEndReached={handleLoadMore}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text>No notifications yet.</Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.footerContainer}>
              {isFetchingNextPage ? (
                <ActivityIndicator size="small" />
              ) : hasMore ? null : (
                <Text style={styles.footerText}>You're all caught up! 🎉</Text>
              )}
            </View>
          }
          contentContainerStyle={{
            paddingBottom: tabbarHeight - Styles.Padding.default * 2,
          }}
          scrollIndicatorInsets={{
            bottom: tabbarHeight - Styles.Padding.default * 2,
          }}
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
    },
    footerContainer: {
      height: 50,
      alignItems: "center",
      justifyContent: "center",
    },
    footerText: {
      fontSize: 12,
      color: Colors[colorScheme].text,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    title: {
      fontSize: 16,
      fontWeight: "600",
      color: Colors[colorScheme].text,
      flex: 1,
    },
    newText: {
      color: "#007AFF",
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#007AFF",
      marginLeft: 8,
    },
    message: {
      fontSize: 14,
      color: Colors[colorScheme].primaryTextColor,
      lineHeight: 20,
    },
    date: {
      fontSize: 10,
      color: Colors[colorScheme].text,
    },
    newDate: {
      fontSize: 12,
      fontWeight: "600",
    },
    emptyContainer: {
      alignItems: "center",
      marginTop: 40,
    },
    errorText: {
      color: "red",
      textAlign: "center",
      marginTop: 20,
    },
  });

export default Notifications;
