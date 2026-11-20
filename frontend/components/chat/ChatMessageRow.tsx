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
import { ChatMenuAction, showChatActionMenu } from "@/components/chat/chatActions";
import SuperAppAgentIcon from "@/components/chat/SuperAppAgentIcon";
import { radius, size, textStyle, type } from "@/constants/brand";
import {
  CHAT_ERROR_GENERIC,
  CHAT_ERROR_STOPPED,
  CHAT_THINKING,
} from "@/constants/Constants";
import { ChatThemePalette } from "@/constants/ChatTheme";
import { ChatRole, MessageStatus } from "@/constants/enums/Chat";
import { ChatMessage } from "@/types/chat.types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

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
  const isUser = message.role === ChatRole.User;
  const isStreaming =
    message.role === ChatRole.Assistant &&
    (message.status === MessageStatus.Streaming ||
      message.status === MessageStatus.Pending) &&
    !message.content;

  if (isUser) {
    const menuActions: ChatMenuAction[] = [
      ...(onEdit ? [{ label: "Edit", onPress: onEdit }] : []),
      ...(onCopyMessage
        ? [{ label: "Copy", onPress: () => onCopyMessage(message.content) }]
        : []),
    ];
    const canShowMenu = menuActions.length > 0;

    // Native action menu: ActionSheetIOS on iOS, an Alert with buttons on Android.
    const handleLongPress = () =>
      showChatActionMenu(undefined, menuActions, theme.accent);

    return (
      <View style={styles.userRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={handleLongPress}
          disabled={!canShowMenu}
          delayLongPress={400}
          accessibilityActions={[
            ...(onEdit ? [{ name: "edit", label: "Edit message" }] : []),
            ...(onCopyMessage ? [{ name: "copy", label: "Copy message" }] : []),
          ]}
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName === "edit") onEdit?.();
            if (nativeEvent.actionName === "copy") onCopyMessage?.(message.content);
          }}
        >
          <View
            style={[styles.userBubble, { backgroundColor: theme.userBubble }]}
          >
            <Text style={[styles.userText, { color: theme.userText }]}>
              {message.content}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  const canShowActions =
    !isStreaming &&
    message.content &&
    message.status === MessageStatus.Sent;

  return (
    <View style={styles.assistantRow}>
      {/* The avatar is the waiting indicator: it plays the Wave until text arrives. */}
      <SuperAppAgentIcon size={size.avatar.chatBot} animated={isStreaming} />
      <View style={styles.assistantBody}>
        {isStreaming ? (
          <Animated.Text
            entering={FadeIn}
            exiting={FadeOut}
            style={[styles.thinking, { color: theme.muted }]}
            // The avatar already announces "Assistant is typing".
            importantForAccessibility="no"
            accessibilityElementsHidden
          >
            {CHAT_THINKING}
          </Animated.Text>
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
  // Level with the avatar's centre (30px disc, body padded 4).
  thinking: {
    ...textStyle({ size: 14, weight: 400 }),
    lineHeight: 22,
  },
  errorHint: {
    ...textStyle({ size: 13, weight: 400 }),
    marginTop: 8,
  },
});
