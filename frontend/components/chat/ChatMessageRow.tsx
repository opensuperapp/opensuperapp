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
import AssistantMessageContent from "@/components/chat/AssistantMessageContent";
import ChatTypingIndicator from "@/components/chat/ChatTypingIndicator";
import UserMessageContextMenu, {
  MessageContextMenuAnchor,
} from "@/components/chat/UserMessageContextMenu";
import SuperAppAgentIcon from "@/components/chat/SuperAppAgentIcon";
import { radius, size, textStyle, type } from "@/constants/brand";
import {
  CHAT_ERROR_GENERIC,
  CHAT_ERROR_STOPPED,
} from "@/constants/Constants";
import { ChatThemePalette } from "@/constants/ChatTheme";
import { ChatRole, MessageStatus } from "@/constants/enums/Chat";
import { ChatMessage } from "@/types/chat.types";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface ChatMessageRowProps {
  message: ChatMessage;
  theme: ChatThemePalette;
  showRegenerate?: boolean;
  onRegenerate?: () => void;
  onEdit?: () => void;
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
  onEdit,
  onCopyMessage,
  onCopy,
}: ChatMessageRowProps): JSX.Element => {
  const bubbleRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<MessageContextMenuAnchor | null>(
    null
  );

  const isUser = message.role === ChatRole.User;
  const isStreaming =
    message.role === ChatRole.Assistant &&
    (message.status === MessageStatus.Streaming ||
      message.status === MessageStatus.Pending) &&
    !message.content;

  if (isUser) {
    const canShowMenu = Boolean(onEdit || onCopyMessage);

    const handleLongPress = () => {
      if (!canShowMenu) {
        return;
      }
      bubbleRef.current?.measureInWindow((x, y, width, height) => {
        setMenuAnchor({ x, y, width, height });
        setMenuVisible(true);
      });
    };

    const dismissMenu = () => {
      setMenuVisible(false);
      setMenuAnchor(null);
    };

    return (
      <View style={styles.userRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={handleLongPress}
          disabled={!canShowMenu}
          delayLongPress={400}
        >
          <View
            ref={bubbleRef}
            collapsable={false}
            style={[styles.userBubble, { backgroundColor: theme.userBubble }]}
          >
            <Text style={[styles.userText, { color: theme.userText }]}>
              {message.content}
            </Text>
          </View>
        </TouchableOpacity>

        <UserMessageContextMenu
          visible={menuVisible}
          anchor={menuAnchor}
          theme={theme}
          onEdit={onEdit}
          onCopy={
            onCopyMessage ? () => onCopyMessage(message.content) : undefined
          }
          onDismiss={dismissMenu}
        />
      </View>
    );
  }

  const canShowActions =
    !isStreaming &&
    message.content &&
    message.status === MessageStatus.Sent;

  return (
    <View style={styles.assistantRow}>
      <SuperAppAgentIcon size={size.avatar.chatBot} />
      <View style={styles.assistantBody}>
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
                accessibilityLabel="Regenerate response"
                accessibilityRole="button"
              >
                <Ionicons name="refresh" size={20} color={theme.muted} />
              </TouchableOpacity>
            )}
            {onCopyMessage && (
              <TouchableOpacity
                onPress={() => onCopyMessage(message.content)}
                hitSlop={8}
                accessibilityLabel="Copy message"
                accessibilityRole="button"
              >
                <BrandIcon name="copy" size={20} color={theme.muted} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

export default ChatMessageRow;

const styles = StyleSheet.create({
  userRow: {
    alignItems: "flex-end",
    marginBottom: 16,
    paddingLeft: "20%",
  },
  userBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopLeftRadius: radius.chatBubbleUser.topLeft,
    borderTopRightRadius: radius.chatBubbleUser.topRight,
    borderBottomRightRadius: radius.chatBubbleUser.bottomRight,
    borderBottomLeftRadius: radius.chatBubbleUser.bottomLeft,
  },
  userText: {
    ...textStyle({ ...type.body, lineHeight: 1.5 }),
  },
  assistantRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
  },
  assistantBody: {
    flex: 1,
    minWidth: 0,
    paddingTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 12,
  },
  errorHint: {
    ...textStyle({ size: 13, weight: 400 }),
    marginTop: 8,
  },
});
