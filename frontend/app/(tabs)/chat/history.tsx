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
import TextPromptDialog from "@/components/TextPromptDialog";
import BrandIcon from "@/components/brand/BrandIcon";
import PrimaryButton from "@/components/brand/PrimaryButton";
import { showChatActionMenu } from "@/components/chat/chatActions";
import { useChatSessionsContext } from "@/components/chat/ChatSessionsContext";
import { size, textStyle, type } from "@/constants/brand";
import { getChatTheme } from "@/constants/ChatTheme";
import {
  CHAT_EMPTY_SEARCH_LABEL,
  CHAT_EMPTY_SESSIONS_LABEL,
  CHAT_NEW_SESSION_LABEL,
  CHAT_RECENT_SECTION_LABEL,
  CHAT_RENAME_MODAL_TITLE,
  CHAT_RENAME_PLACEHOLDER,
  CHAT_SEARCH_PLACEHOLDER,
  CHAT_SESSION_TITLE_MAX_LENGTH,
  isAndroid,
} from "@/constants/Constants";
import { ChatSessionAction } from "@/constants/enums/Chat";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { ChatSession } from "@/types/chat.types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Chat history, presented as a native form sheet over the conversation: search,
 * "New chat", and the sessions (tap to restore, long-press to rename, pin or delete).
 *
 * @returns {JSX.Element} History sheet.
 */
export default function ChatHistorySheet(): JSX.Element {
  const { isDark } = useBrandTheme();
  const theme = getChatTheme(isDark);
  const insets = useSafeAreaInsets();
  const {
    sessions,
    activeSessionId,
    selectSession,
    createNewSession,
    removeSession,
    togglePinSession,
    renameSession,
  } = useChatSessionsContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<ChatSession | null>(null);

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sessions;
    }
    return sessions.filter((session) =>
      session.title.toLowerCase().includes(query)
    );
  }, [sessions, searchQuery]);

  const close = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const showSessionOptions = (session: ChatSession) =>
    showChatActionMenu(
      session.title,
      [
        {
          label: ChatSessionAction.Rename,
          onPress: () => setRenameTarget(session),
        },
        {
          label: session.isPinned
            ? ChatSessionAction.Unpin
            : ChatSessionAction.Pin,
          onPress: () => togglePinSession(session.id),
        },
        {
          label: ChatSessionAction.Delete,
          destructive: true,
          onPress: () => removeSession(session.id),
        },
      ],
      theme.accent
    );

  return (
    <View style={[styles.sheet, { backgroundColor: theme.sheet }]}>
      <View
        style={[
          styles.searchField,
          { backgroundColor: theme.inputSurface },
        ]}
      >
        <BrandIcon name="search" size={18} color={theme.subtle} />
        <TextInput
          style={[styles.searchInput, { color: theme.assistantText }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={CHAT_SEARCH_PLACEHOLDER}
          placeholderTextColor={theme.subtle}
          selectionColor={theme.accent}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode={isAndroid ? "never" : "while-editing"}
          accessibilityLabel="Search chats"
        />
        {isAndroid && searchQuery.length > 0 ? (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            hitSlop={8}
            accessibilityLabel="Clear search"
          >
            <BrandIcon name="close" size={18} color={theme.subtle} />
          </TouchableOpacity>
        ) : null}
      </View>

      <PrimaryButton
        title={CHAT_NEW_SESSION_LABEL}
        style={styles.newChat}
        onPress={() => {
          createNewSession();
          close();
        }}
      />

      <Text style={[styles.sectionLabel, { color: theme.subtle }]}>
        {CHAT_RECENT_SECTION_LABEL}
      </Text>

      <FlatList
        data={filteredSessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 12 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          <Text style={[styles.emptyList, { color: theme.subtle }]}>
            {searchQuery.trim()
              ? CHAT_EMPTY_SEARCH_LABEL
              : CHAT_EMPTY_SESSIONS_LABEL}
          </Text>
        }
        renderItem={({ item }) => {
          const isActive = item.id === activeSessionId;
          return (
            <TouchableOpacity
              style={[
                styles.row,
                isActive && { backgroundColor: theme.drawerActive },
              ]}
              onPress={() => {
                selectSession(item.id);
                close();
              }}
              onLongPress={() => showSessionOptions(item)}
              accessibilityLabel={
                item.isPinned ? `${item.title}, pinned` : item.title
              }
              accessibilityState={{ selected: isActive }}
              accessibilityActions={[
                { name: "longpress", label: "Chat options" },
              ]}
              onAccessibilityAction={() => showSessionOptions(item)}
            >
              <Text
                style={[styles.rowTitle, { color: theme.assistantText }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.title}
              </Text>
              {item.isPinned ? (
                <MaterialIcons name="push-pin" size={16} color={theme.accent} />
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

      {/* Native prompt: Alert.prompt on iOS, the platform dialog on Android. */}
      <TextPromptDialog
        visible={renameTarget !== null}
        title={CHAT_RENAME_MODAL_TITLE}
        defaultValue={renameTarget?.title ?? ""}
        placeholder={CHAT_RENAME_PLACEHOLDER}
        confirmLabel="Save"
        keyboardType="default"
        onConfirm={(value) => {
          const title = value.trim().slice(0, CHAT_SESSION_TITLE_MAX_LENGTH);
          if (renameTarget && title && title !== renameTarget.title) {
            renameSession(renameTarget.id, title);
          }
        }}
        onClose={() => setRenameTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    paddingHorizontal: 16,
    // Clears the native grabber.
    paddingTop: 24,
  },
  // The platform's inset search field: filled, no border, 10pt corners.
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    ...textStyle({ size: 17, weight: 400 }),
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
  },
  newChat: {
    height: 48,
    marginBottom: 16,
  },
  sectionLabel: {
    ...textStyle(type.metaLabel),
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  list: {
    flexGrow: 1,
    gap: 4,
  },
  emptyList: {
    ...textStyle({ size: 13, weight: 400 }),
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: size.minHitTarget,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  rowTitle: {
    flex: 1,
    ...textStyle({ size: 14, weight: 500, lineHeight: 1.45 }),
  },
});
