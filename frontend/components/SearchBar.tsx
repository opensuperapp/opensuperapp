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
import BrandIcon from "@/components/brand/BrandIcon";
import { radius, size, textStyle } from "@/constants/brand";
import { isAndroid } from "@/constants/Constants";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

type SearchProps = {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  placeholder: string;
};

const SearchBar = React.memo(
  ({ searchQuery, setSearchQuery, placeholder }: SearchProps) => {
    const { colors, isDark } = useBrandTheme();
    const [focused, setFocused] = useState(false);

    return (
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.field,
            borderColor: focused ? colors.cobalt : colors.line,
          },
        ]}
      >
        <BrandIcon name="search" size={20} color={colors.text3} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.text3}
          selectionColor={colors.cobalt}
          keyboardAppearance={isDark ? "dark" : "light"}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          clearButtonMode="while-editing"
        />

        {isAndroid && searchQuery && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
            hitSlop={10}
            style={[styles.clear, { backgroundColor: colors.card2 }]}
          >
            <BrandIcon name="close" size={16} strokeWidth={2} color={colors.text2} />
          </TouchableOpacity>
        )}
      </View>
    );
  }
);

export default SearchBar;

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: size.searchHeight,
    borderRadius: radius.input,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
  },
  searchInput: {
    ...textStyle({ size: 16, weight: 400 }),
    flex: 1,
    height: "100%",
  },
  clear: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
