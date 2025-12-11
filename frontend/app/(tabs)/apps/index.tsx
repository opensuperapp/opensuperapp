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
  Text,
  View,
  FlatList,
  useColorScheme,
  StyleSheet,
  useWindowDimensions,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Widget from "@/components/Widget";
import { router } from "expo-router";
import SyncingModal from "@/components/SyncingModal";
import { Colors } from "@/constants/Colors";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import SearchBar from "@/components/SearchBar";
import { useTrackActiveScreen } from "@/hooks/useTrackActiveScreen";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { useMyApps } from "@/hooks/useMyApps";

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme ?? "light");
  const { height: windowHeight } = useWindowDimensions();
  const tabBarHeight: number = useBottomTabBarHeight();

  useTrackActiveScreen(ScreenPaths.MY_APPS);

  const {
    filteredApps,
    searchQuery,
    setSearchQuery,
    syncing,
    currentAction,
    progress,
  } = useMyApps();

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={{
        flex: 1,
        backgroundColor: Colors[colorScheme ?? "light"].primaryBackgroundColor,
      }}
    >
      {/* Search Bar */}
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        placeholder="Search apps..."
      />

      <SyncingModal
        syncing={syncing}
        currentAction={currentAction}
        progress={progress}
      />

      <View style={{ marginTop: 16 }}>
        <FlatList
          data={filteredApps}
          keyExtractor={(item) => item.appId}
          numColumns={4}
          renderItem={({ item }) => (
            <Widget
              iconUrl={item.iconUrl}
              name={item.name}
              webViewUri={item.webViewUri ?? ""}
              appName={item.name}
              clientId={item.clientId ?? ""}
              exchangedToken={item.exchangedToken ?? ""}
              appId={item.appId}
              displayMode={item.displayMode}
            />
          )}
          contentContainerStyle={{
            minHeight: windowHeight - 3 * tabBarHeight,
          }}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={Keyboard.dismiss}
          ListEmptyComponent={
            <>
              {searchQuery.trim() === "" ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No apps found{"\n"}Visit the{" "}
                    <Text
                      onPress={() => router.push(ScreenPaths.STORE)}
                      style={{ color: Colors.companyOrange }}
                    >
                      Store
                    </Text>{" "}
                    to download apps
                  </Text>
                </View>
              ) : (
                <View style={styles.emptyAppsContainer}>
                  <Text style={styles.emptyText}>No matching apps found</Text>
                </View>
              )}
            </>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors[colorScheme].secondaryBackgroundColor,
      borderRadius: 10,
      marginHorizontal: 16,
      marginVertical: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      color: Colors[colorScheme].text,
      fontSize: 16,
    },
    emptyAppsContainer: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 40,
      marginTop: 24,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    emptyText: {
      color: Colors[colorScheme].secondaryTextColor,
      fontSize: 16,
      textAlign: "center",
    },
    columnWrapper: {
      justifyContent: "space-between",
      marginBottom: 16,
    },
    floatingButton: {
      height: 55,
      width: 55,
      backgroundColor: Colors.companyOrange,
      position: "absolute",
      bottom: 16,
      right: 16,
      borderRadius: "50%",
      alignItems: "center",
      justifyContent: "center",
      elevation: 3,
    },
  });
