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
import ChoreoLabsLogo from "@/components/brand/ChoreoLabsLogo";
import { brand, themes } from "@/constants/brand";
import { PASS } from "@/constants/BusinessCard";
import { BusinessCardData } from "@/types/businessCard.types";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  data: BusinessCardData;
  // Kept for parity with the Android file; the back is Ink in both themes.
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

// The back face of the card: plain Ink, the white logo, and the
// fields pass.go puts on the back, separated by hairlines. Fills the card face
// it is given, so it is the same size as the front it flips from.
const WalletPassDetails = ({ data }: Props) => (
  <View style={styles.face}>
    <View style={styles.logo}>
      <ChoreoLabsLogo width={79} color="#FFFFFF" />
    </View>
    <View style={styles.list}>
      {backFields(data).map((field) => (
        <View key={field.key} style={styles.row}>
          <Text style={styles.label}>{field.label}</Text>
          <Text style={styles.value} selectable>
            {field.value}
          </Text>
        </View>
      ))}
    </View>
  </View>
);

export default WalletPassDetails;

const styles = StyleSheet.create({
  face: {
    flex: 1,
    backgroundColor: brand.ink,
    borderRadius: PASS.cornerRadius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: PASS.contentPaddingH,
    paddingTop: PASS.contentPaddingTop,
    paddingBottom: PASS.contentPaddingBottom,
    overflow: "hidden",
  },
  logo: {
    alignSelf: "flex-start",
  },
  list: {
    marginTop: "auto",
  },
  row: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.14)",
  },
  // System font, as on the front and as Wallet draws a pass back.
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: themes.dark.text2,
  },
  value: {
    marginTop: 2,
    fontWeight: "600",
    fontSize: 15,
    color: "#FFFFFF",
  },
});
