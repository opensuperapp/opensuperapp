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
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  data: BusinessCardData;
  colorScheme: "light" | "dark";
};

type BackField = {
  key: string;
  label: string;
  value: string;
};

// Order and labels mirror pass.go's backFields.
export const backFields = (data: BusinessCardData): BackField[] => {
  const fields: BackField[] = [
    { key: "site", label: "WEBSITE", value: data.website },
  ];

  if (data.address) {
    fields.push({ key: "addr", label: "OFFICE", value: data.address });
  }
  if (data.workPhone) {
    fields.push({ key: "phone", label: "PHONE", value: data.workPhone });
  }
  if (data.mobile) {
    fields.push({ key: "mobile", label: "MOBILE", value: data.mobile });
  }

  return fields;
};

// App surface colours, not the pass orange: iOS renders the back as a system
// list.
const WalletPassDetails = ({ data, colorScheme }: Props) => {
  const styles = createStyles(colorScheme);

  return (
    <View style={styles.sheet}>
      {backFields(data).map((field, index) => (
        <View
          key={field.key}
          style={[styles.row, index > 0 && styles.rowDivider]}
        >
          <Text style={styles.label}>{field.label}</Text>
          <Text style={styles.value} selectable>
            {field.value}
          </Text>
        </View>
      ))}
    </View>
  );
};

export default WalletPassDetails;

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    sheet: {
      backgroundColor: Colors[colorScheme].secondaryBackgroundColor,
      borderRadius: 12,
      paddingHorizontal: 16,
    },
    row: {
      paddingVertical: 12,
    },
    rowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: Colors[colorScheme].borderColor,
    },
    label: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.6,
      color: Colors[colorScheme].secondaryTextColor,
    },
    value: {
      marginTop: 3,
      fontSize: 15,
      color: Colors[colorScheme].text,
    },
  });
