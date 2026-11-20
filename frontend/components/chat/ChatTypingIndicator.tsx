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
import WaveMark from "@/components/brand/WaveMark";
import { size } from "@/constants/brand";
import { ChatThemePalette } from "@/constants/ChatTheme";
import React from "react";
import { StyleSheet, View } from "react-native";

export interface ChatTypingIndicatorProps {
  theme: ChatThemePalette;
}

/**
 * Assistant "thinking" state: the 22px Wave mark in place of typing dots.
 *
 * @param {ChatTypingIndicatorProps} props - Theme palette.
 * @returns {JSX.Element} Wave thinking indicator.
 */
const ChatTypingIndicator = ({
  theme,
}: ChatTypingIndicatorProps): JSX.Element => (
  <View
    style={styles.row}
    accessibilityLabel="Assistant is typing"
    accessibilityRole="progressbar"
  >
    <WaveMark size={size.chatTypingMark} color={theme.muted} />
  </View>
);

export default ChatTypingIndicator;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
});
