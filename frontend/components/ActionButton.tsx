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
import { radius, soraFamily } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  textColor?: string;
  backgroundColor?: string;
  downloading?: boolean;
  fixedSize?: boolean;
}

// iOS "tinted" button: the label colour at low opacity. Labels are #RRGGBB tokens.
const TINT_ALPHA = "26"; // ~15%

/** Store pill, tinted, radius 999; shows a spinner while downloading. */
const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onPress,
  textColor,
  backgroundColor,
  downloading = false,
  fixedSize = false,
}) => {
  const { colors } = useBrandTheme();
  const tint = textColor ?? colors.cobalt;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        fixedSize && styles.fixedSize,
        { backgroundColor: backgroundColor ?? `${tint}${TINT_ALPHA}` },
      ]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {downloading ? (
        <ActivityIndicator size="small" color={tint} />
      ) : (
        <Text
          style={[styles.buttonText, { color: tint }]}
          allowFontScaling={false}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default ActionButton;

const styles = StyleSheet.create({
  button: {
    minWidth: 84,
    height: 36,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.pill,
    flexDirection: "row",
  },
  buttonText: {
    fontFamily: soraFamily[600],
    fontSize: 14,
  },
  // A Get pill keeps its width while the spinner replaces the label.
  fixedSize: {
    minWidth: 84,
  },
});
