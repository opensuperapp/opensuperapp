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
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  saving: boolean;
  onSavePass: () => void;
  onShareVCard: () => void;
  onSaveAsImage: () => void;
};

const BusinessCardActions = ({
  saving,
  onSavePass,
  onShareVCard,
  onSaveAsImage,
}: Props) => {
  const colorScheme = useColorScheme() ?? "light";
  const styles = createStyles(colorScheme);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
      <TouchableOpacity
        activeOpacity={0.5}
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={onSavePass}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="save_business_card"
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons
              name="wallet-outline"
              size={20}
              color="#FFFFFF"
              style={styles.saveIcon}
            />
            <Text style={styles.saveText}>Save Business Card</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.secondaryActions}>
        <Pressable onPress={onShareVCard} hitSlop={8}>
          <Text style={styles.secondaryActionText}>Share contact file</Text>
        </Pressable>
        <Text style={styles.secondaryActionSeparator}>·</Text>
        <Pressable onPress={onSaveAsImage} hitSlop={8}>
          <Text style={styles.secondaryActionText}>Save as image</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default BusinessCardActions;

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: Colors[colorScheme].borderColor,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 50,
      paddingVertical: 13,
      backgroundColor: Colors.companyOrange,
      borderRadius: 12,
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
    saveIcon: {
      marginRight: 8,
    },
    saveText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    secondaryActions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
    },
    secondaryActionText: {
      fontSize: 14,
      color: Colors.actionButtonTextColor,
    },
    secondaryActionSeparator: {
      marginHorizontal: 10,
      fontSize: 14,
      color: Colors[colorScheme].secondaryTextColor,
    },
  });
