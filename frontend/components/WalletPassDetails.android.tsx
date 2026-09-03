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
import { BusinessCardData } from "@/types/businessCard.types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  data: BusinessCardData;
  colorScheme: "light" | "dark";
};

// Google Wallet renders `linksModuleData` as an icon per URI scheme: a phone
// glyph for tel:, a mail glyph for mailto:, and a link or map pin for http:.
// The expanded view is deliberately one column — GPASS.md: "We only use one
// column to list info modules".
type DetailRow = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

// Labels are Title Case, not the SHOUTED labels an Apple pass back uses:
// "Write headings, labels, and names in title case".
export const detailRows = (data: BusinessCardData): DetailRow[] => {
  const rows: DetailRow[] = [];

  if (data.workPhone) {
    rows.push({
      key: "phone",
      icon: "call-outline",
      label: "Phone",
      value: data.workPhone,
    });
  }
  if (data.mobile) {
    rows.push({
      key: "mobile",
      icon: "phone-portrait-outline",
      label: "Mobile",
      value: data.mobile,
    });
  }
  rows.push({
    key: "email",
    icon: "mail-outline",
    label: "Email",
    value: data.workEmail,
  });
  rows.push({
    key: "site",
    icon: "link-outline",
    label: "Website",
    value: data.website,
  });
  if (data.address) {
    rows.push({
      key: "addr",
      icon: "location-outline",
      label: "Office",
      value: data.address,
    });
  }

  return rows;
};

const WalletPassDetails = ({ data, colorScheme }: Props) => {
  const styles = createStyles(colorScheme);

  return (
    <View style={styles.sheet}>
      {detailRows(data).map((row) => (
        <View key={row.key} style={styles.row}>
          <Ionicons
            name={row.icon}
            size={20}
            color={Colors[colorScheme].secondaryTextColor}
            style={styles.icon}
          />
          <View style={styles.rowText}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value} selectable>
              {row.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

export default WalletPassDetails;

// Material surface, not the pass orange: Google draws the expanded view on the
// app's own background below the card.
const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    sheet: {
      backgroundColor: Colors[colorScheme].secondaryBackgroundColor,
      // Material 3 large shape.
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 12,
    },
    icon: {
      marginTop: 2,
      marginRight: 16,
    },
    rowText: {
      flex: 1,
    },
    label: {
      fontSize: 12,
      color: Colors[colorScheme].secondaryTextColor,
    },
    value: {
      marginTop: 2,
      fontSize: 16,
      color: Colors[colorScheme].text,
    },
  });
