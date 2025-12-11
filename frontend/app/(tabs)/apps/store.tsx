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

import ListItem from "@/components/ListItem";
import SearchBar from "@/components/SearchBar";
import SignInMessage from "@/components/SignInMessage";
import SignInModal from "@/components/SignInModal";
import { Colors } from "@/constants/Colors";
import { NOT_DOWNLOADED } from "@/constants/Constants";
import { useStore } from "@/hooks/useStore";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Store = () => {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme ?? "light");

  const {
    accessToken,
    filteredApps,
    downloading,
    installationQueue,
    isLoading,
    showModal,
    setShowModal,
    searchQuery,
    setSearchQuery,
    handleDownload,
    handleRemoveMicroApp,
  } = useStore();

  // When default apps added need to remove this logic
  if (!accessToken) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <View style={styles.signInContainer}>
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <SignInMessage message="To view available apps in the Store, please sign in" />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={{
        backgroundColor: Colors[colorScheme ?? "light"].primaryBackgroundColor,
        flex: 1,
      }}
    >
      {/* Search Bar */}
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        placeholder="Search apps..."
      />

      <SignInModal visible={showModal} onClose={() => setShowModal(false)} />
      {isLoading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={Colors.companyOrange} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredApps}
          keyExtractor={(item) => item.appId}
          renderItem={({ item, index }) => (
            <>
              <ListItem
                key={item.appId}
                appId={item.appId}
                name={item.name}
                webViewUri={item.webViewUri}
                clientId={item.clientId}
                exchangedToken={item.exchangedToken}
                versions={item.versions}
                description={item.description}
                iconUrl={item.iconUrl}
                status={item.status || NOT_DOWNLOADED}
                displayMode={item.displayMode}
                downloading={
                  downloading.includes(item.appId) ||
                  installationQueue.some((i) => i.appId === item.appId)
                }
                onDownload={() =>
                  handleDownload(item.appId, item.versions[0].downloadUrl)
                }
                onRemove={() => handleRemoveMicroApp(item.appId)}
              />
              {/* Horizontal Line */}
              {index !== filteredApps.length - 1 && (
                <View style={styles.horizontalLine}></View>
              )}
            </>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No apps found</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={Keyboard.dismiss}
        />
      )}
    </SafeAreaView>
  );
};

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
    horizontalLine: {
      width: "95%",
      alignSelf: "center",
      height: 1,
      backgroundColor: Colors[colorScheme].secondaryBackgroundColor,
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
    },
    listContent: {
      paddingBottom: 80,
    },
    container: {
      flex: 1,
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
      justifyContent: "space-between",
    },
    signInContainer: {
      flex: 1,
      justifyContent: "space-between",
    },
    overlay: {
      flex: 1,
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
      justifyContent: "center",
      alignItems: "center",
    },
    modal: {
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
      padding: 30,
      borderRadius: 16,
      width: "90%",
      alignItems: "center",
    },
  });

export default Store;
