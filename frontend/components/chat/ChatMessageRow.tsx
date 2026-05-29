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
import AssistantMessageContent from "@/components/chat/AssistantMessageContent";
import ChatTypingIndicator from "@/components/chat/ChatTypingIndicator";
import {
  CHAT_ERROR_GENERIC,
  CHAT_ERROR_STOPPED,
} from "@/constants/Constants";
import { ChatThemePalette } from "@/constants/ChatTheme";
import { ChatRole, MessageStatus } from "@/constants/enums/Chat";
import { ChatMessage } from "@/types/chat.types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface ChatMessageRowProps {
  message: ChatMessage;
  theme: ChatThemePalette;
  showRegenerate?: boolean;
  onRegenerate?: () => void;
  onCopyMessage?: (content: string) => void;
  onCopy: (value: string, label: string) => void;
}

/**
 * Single chat message row for user and assistant roles.
 *
 * @param {ChatMessageRowProps} props - Message data and handlers.
 * @returns {JSX.Element} Message row UI.
 */
const ChatMessageRow = ({
  message,
  theme,
  showRegenerate = false,
  onRegenerate,
  onCopyMessage,
  onCopy,
}: ChatMessageRowProps): JSX.Element => {
  const isUser = message.role === ChatRole.User;
  const isStreaming =
    message.role === ChatRole.Assistant &&
    (message.status === MessageStatus.Streaming ||
      message.status === MessageStatus.Pending) &&
    !message.content;

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={[styles.userBubble, { backgroundColor: theme.userBubble }]}>
          <Text style={[styles.userText, { color: theme.userText }]}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  const canShowActions =
    !isStreaming &&
    message.content &&
    message.status === MessageStatus.Sent;

  return (
    <View style={styles.assistantRow}>
      {isStreaming ? (
        <ChatTypingIndicator theme={theme} />
      ) : (
        <AssistantMessageContent
          content={message.content}
          theme={theme}
          onCopy={onCopy}
        />
      )}

      {(message.status === MessageStatus.Error ||
        message.status === MessageStatus.Stopped) && (
        <Text style={[styles.errorHint, { color: theme.muted }]}>
          {message.status === MessageStatus.Stopped
            ? CHAT_ERROR_STOPPED
            : CHAT_ERROR_GENERIC}
        </Text>
      )}

      {canShowActions && (
        <View style={styles.actionRow}>
          {showRegenerate && onRegenerate && (
            <TouchableOpacity
              onPress={onRegenerate}
              hitSlop={8}
              accessibilityLabel="regenerate_message"
              accessibilityRole="button"
            >
              <Ionicons name="refresh" size={20} color={theme.muted} />
            </TouchableOpacity>
          )}
          {onCopyMessage && (
            <TouchableOpacity
              onPress={() => onCopyMessage(message.content)}
              hitSlop={8}
              accessibilityLabel="copy_message"
              accessibilityRole="button"
            >
              <Ionicons name="copy-outline" size={20} color={theme.muted} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

export default ChatMessageRow;

const styles = StyleSheet.create({
  userRow: {
    alignItems: "flex-end",
    marginBottom: 28,
    paddingLeft: 56,
  },
  userBubble: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  userText: {
    fontSize: 16,
    lineHeight: 24,
  },
  assistantRow: {
    marginBottom: 28,
    paddingRight: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 12,
  },
  errorHint: {
    fontSize: 13,
    marginTop: 8,
  },
});
