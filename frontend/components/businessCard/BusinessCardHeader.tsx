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
import { size, textStyle } from "@/constants/brand";
import { isIos } from "@/constants/Constants";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  onClose: () => void;
};

const BusinessCardHeader = ({ onClose }: Props) => {
  const { colors } = useBrandTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        // Only the Android full-screen presentation runs under the status bar.
        !isIos && { paddingTop: insets.top + 8 },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        My Business Card
      </Text>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="close_business_card"
        style={({ pressed }) => [
          styles.close,
          pressed && { backgroundColor: colors.card2 },
        ]}
      >
        <BrandIcon name="close" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
};

export default BusinessCardHeader;

// The prototype's sheet header: 18/600 title, 44pt close control.
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 10,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: {
    ...textStyle({ size: 18, weight: 600, tracking: -0.025 }),
  },
  close: {
    width: size.minHitTarget,
    height: size.minHitTarget,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
