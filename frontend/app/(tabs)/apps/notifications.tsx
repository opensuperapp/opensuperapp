import { Colors } from "@/constants/Colors";
import { Styles } from "@/constants/Styles";
import { useNotifications } from "@/hooks/useNotifications";
import { logout } from "@/services/authService";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

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
  } = useNotifications(logout);

  const handleLoadMore = () => {
    if (hasMore) {
      console.log("Loading more notifications");
      loadMore();
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View
      style={[
        {
          flexDirection: "row",
          padding: Styles.Padding.default,
          gap: 12,
          alignItems: "flex-start",
          backgroundColor: item.isNew
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
        <Ionicons name="notifications" size={20} color={Colors.companyOrange} />
      </View>
      <View style={{ flex: 1, flexDirection: "column", gap: 4 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.date}>
          {new Date(item.createdAt.replace(" ", "T") + "Z").toLocaleString()}
        </Text>
      </View>

      {item.data}
    </View>
  );

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
            <View
              style={{
                height: 100,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isFetchingNextPage ? (
                <ActivityIndicator size="small" />
              ) : hasMore ? null : (
                <Text>You're all caught up! 🎉</Text>
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
    card: {
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
      padding: 16,
      borderBottomColor: Colors[colorScheme].borderColor,
      borderBottomWidth: 1,
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
