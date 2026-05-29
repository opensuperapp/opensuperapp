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
import {
  CHAT_MENU_BUTTON_SIZE,
  CHAT_MENU_ICON_SIZE,
} from "@/constants/Constants";
import { ChatThemePalette } from "@/constants/ChatTheme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

export interface ChatMenuButtonProps {
  theme: ChatThemePalette;
  onPress: () => void;
  accessibilityLabel: string;
}

/**
 * Shared hamburger menu control for the chat header and session drawer.
 *
 * @param {ChatMenuButtonProps} props - Theme, handler, and a11y label.
 * @returns {JSX.Element} Menu button.
 */
const ChatMenuButton = ({
  theme,
  onPress,
  accessibilityLabel,
}: ChatMenuButtonProps): JSX.Element => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.button}
    accessibilityLabel={accessibilityLabel}
  >
    <Ionicons
      name="reorder-two"
      size={CHAT_MENU_ICON_SIZE}
      color={theme.assistantText}
    />
  </TouchableOpacity>
);

export default ChatMenuButton;

const styles = StyleSheet.create({
  button: {
    width: CHAT_MENU_BUTTON_SIZE,
    height: CHAT_MENU_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
