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
import { size } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { router } from "expo-router";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";

type CloseButtonProps = {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const CloseButton = ({ onPress, style }: CloseButtonProps) => {
  const { colors } = useBrandTheme();

  return (
    <Pressable
      onPress={() => {
        onPress ? onPress() : router.back();
      }}
      style={[styles.button, style]}
      accessibilityRole="button"
      accessibilityLabel="Close"
    >
      <BrandIcon name="close" size={24} color={colors.accent} />
    </Pressable>
  );
};

export default CloseButton;

// A plain native-bar icon button with the 44pt minimum target.
const styles = StyleSheet.create({
  button: {
    minWidth: size.minHitTarget,
    minHeight: size.minHitTarget,
    alignItems: "center",
    justifyContent: "center",
  },
});
