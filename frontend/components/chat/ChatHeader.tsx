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
import ChatMenuButton from "@/components/chat/ChatMenuButton";
import {
  CHAT_HEADER_BOTTOM_PADDING,
  CHAT_HEADER_TOP_OFFSET,
  CHAT_SCREEN_HORIZONTAL_PADDING,
} from "@/constants/Constants";
import { ChatThemePalette } from "@/constants/ChatTheme";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface ChatHeaderProps {
  theme: ChatThemePalette;
  onOpenHistory: () => void;
}

/**
 * Chat top bar with history menu on the left.
 *
 * @param {ChatHeaderProps} props - Theme and handlers.
 * @returns {JSX.Element} Chat header bar.
 */
const ChatHeader = ({
  theme,
  onOpenHistory,
}: ChatHeaderProps): JSX.Element => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + CHAT_HEADER_TOP_OFFSET,
          backgroundColor: theme.background,
        },
      ]}
    >
      <ChatMenuButton
        theme={theme}
        onPress={onOpenHistory}
        accessibilityLabel="open_chat_history"
      />
    </View>
  );
};

export default ChatHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: CHAT_SCREEN_HORIZONTAL_PADDING,
    paddingBottom: CHAT_HEADER_BOTTOM_PADDING,
  },
});
