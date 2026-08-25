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
import { Colors } from "@/constants/Colors";
import { isIos } from "@/constants/Constants";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  onClose: () => void;
};

const BusinessCardHeader = ({ onClose }: Props) => {
  const colorScheme = useColorScheme() ?? "light";
  const styles = createStyles(colorScheme);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        // Only the Android full-screen presentation runs under the status bar.
        !isIos && { paddingTop: insets.top + 12 },
      ]}
    >
      <Text style={styles.title}>My Business Card</Text>
      <Pressable
        onPress={onClose}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="close_business_card"
      >
        <Ionicons
          name="close"
          size={24}
          color={Colors[colorScheme].secondaryTextColor}
        />
      </Pressable>
    </View>
  );
};

export default BusinessCardHeader;

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
    },
    title: {
      fontSize: 17,
      fontWeight: "600",
      color: Colors[colorScheme].text,
    },
  });
