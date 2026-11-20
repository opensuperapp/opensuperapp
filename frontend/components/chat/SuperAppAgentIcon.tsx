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
import ChoreoMark from "@/components/brand/ChoreoMark";
import WaveMark from "@/components/brand/WaveMark";
import { brand } from "@/constants/brand";
import React, { JSX } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

export interface SuperAppAgentIconProps {
  size?: number;
  style?: ViewStyle;
  /** Play the Wave (AI) animation instead of the static mark. */
  animated?: boolean;
}

/**
 * Assistant avatar: a Signal disc holding the Ink Choreo mark.
 * The empty state plays the Wave; message rows use the static mark.
 *
 * @param {SuperAppAgentIconProps} props - Disc size, animation and optional style.
 * @returns {JSX.Element} Assistant avatar.
 */
const SuperAppAgentIcon = ({
  size = 30,
  style,
  animated = false,
}: SuperAppAgentIconProps): JSX.Element => {
  // Prototype: the mark is 46% of the 80px disc and 50% of the 30px avatar.
  const markWidth = Math.round(size * (animated ? 0.46 : 0.5));

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
      accessibilityLabel="Choreo Labs AI assistant"
    >
      {animated ? (
        <WaveMark size={markWidth} color={brand.ink} />
      ) : (
        <ChoreoMark width={markWidth} color={brand.ink} />
      )}
    </View>
  );
};

export default SuperAppAgentIcon;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brand.signal,
  },
});
