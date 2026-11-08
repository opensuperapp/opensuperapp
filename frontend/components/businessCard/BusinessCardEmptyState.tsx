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
import BrandIcon from "@/components/brand/BrandIcon";
import { textStyle, type } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const BusinessCardEmptyState = () => {
  const { colors } = useBrandTheme();

  return (
    <View style={styles.container}>
      <BrandIcon name="card" size={48} color={colors.text3} strokeWidth={1.4} />
      <Text style={[styles.title, { color: colors.text }]}>
        Your card isn&apos;t ready yet
      </Text>
      <Text style={[styles.description, { color: colors.text2 }]}>
        We need your name and work email to build your digital business card.
        Please sign in or try again once your profile has synced.
      </Text>
    </View>
  );
};

export default BusinessCardEmptyState;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  title: {
    ...textStyle(type.cardTitle),
    marginTop: 16,
    textAlign: "center",
  },
  description: {
    ...textStyle(type.excerpt),
    marginTop: 8,
    textAlign: "center",
  },
});
