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
import { Bot } from "lucide-react-native";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

export interface SuperAppAgentIconProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * Super App AI agent icon using the Lucide Bot glyph.
 *
 * @param {SuperAppAgentIconProps} props - Icon size and optional style.
 * @returns {JSX.Element} Bot icon badge.
 */
const SuperAppAgentIcon = ({
  size = 52,
  style,
}: SuperAppAgentIconProps): JSX.Element => {
  const iconSize = size * 0.5;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: Colors.companyOrange,
        },
        style,
      ]}
      accessibilityLabel="Super App AI bot"
    >
      <Bot size={iconSize} color="#ffffff" strokeWidth={2} />
    </View>
  );
};

export default SuperAppAgentIcon;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
});
