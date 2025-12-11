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
  View,
  TextInput,
  useColorScheme,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

type SearchProps = {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  placeholder: string;
};

const SearchBar = React.memo(
  ({ searchQuery, setSearchQuery, placeholder }: SearchProps) => {
    const colorScheme = useColorScheme();
    const styles = createStyles(colorScheme ?? "light");

    return (
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={Colors[colorScheme ?? "light"].secondaryTextColor}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={
            Colors[colorScheme ?? "light"].secondaryTextColor
          }
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />

        {Platform.OS === "android" && searchQuery && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
          >
            <Ionicons
              name="close-circle-sharp"
              size={20}
              color={Colors[colorScheme ?? "light"].secondaryTextColor}
              style={styles.searchIcon}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }
);

export default SearchBar;

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors[colorScheme].secondaryBackgroundColor,
      borderRadius: 10,
      marginHorizontal: 16,
      marginTop: 20,
      marginBottom: 12,
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
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
    },
    emptyText: {
      color: Colors[colorScheme].primaryTextColor,
      textAlign: "center",
    },
    columnWrapper: {
      justifyContent: "space-between",
      marginBottom: 16,
    },
  });
