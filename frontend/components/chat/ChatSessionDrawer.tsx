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
import RenameSessionModal from "@/components/chat/RenameSessionModal";
import {
  CHAT_DRAWER_ANIMATION_MS,
  CHAT_DRAWER_WIDTH_RATIO,
  CHAT_EMPTY_SEARCH_LABEL,
  CHAT_EMPTY_SESSIONS_LABEL,
  CHAT_HEADER_BOTTOM_PADDING,
  CHAT_HEADER_TOP_OFFSET,
  CHAT_NEW_SESSION_LABEL,
  CHAT_RECENT_SECTION_LABEL,
  CHAT_SCREEN_HORIZONTAL_PADDING,
  CHAT_SEARCH_PLACEHOLDER,
} from "@/constants/Constants";
import { ChatThemePalette } from "@/constants/ChatTheme";
import { ChatSessionAction } from "@/constants/enums/Chat";
import { isAndroid } from "@/constants/Constants";
import { ChatSession } from "@/types/chat.types";
import { Ionicons } from "@expo/vector-icons";
import { Pin } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = SCREEN_WIDTH * CHAT_DRAWER_WIDTH_RATIO;

export interface ChatSessionDrawerProps {
  visible: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  theme: ChatThemePalette;
  onClose: () => void;
  onSelect: (sessionId: string) => void;
  onCreate: () => void;
  onDelete: (sessionId: string) => void;
  onTogglePin: (sessionId: string) => void;
  onRename: (sessionId: string, title: string) => void;
}

/**
 * Left drawer overlay rendered inside the chat screen so the tab bar stays visible.
 *
 * @param {ChatSessionDrawerProps} props - Drawer visibility and handlers.
 * @returns {JSX.Element | null} Side drawer overlay.
 */
const ChatSessionDrawer = ({
  visible,
  sessions,
  activeSessionId,
  theme,
  onClose,
  onSelect,
  onCreate,
  onDelete,
  onTogglePin,
  onRename,
}: ChatSessionDrawerProps): JSX.Element | null => {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [searchQuery, setSearchQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<ChatSession | null>(null);
  const slideX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: 0,
          duration: CHAT_DRAWER_ANIMATION_MS,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: CHAT_DRAWER_ANIMATION_MS,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!mounted) {
      return;
    }

    Animated.parallel([
      Animated.timing(slideX, {
        toValue: -DRAWER_WIDTH,
        duration: CHAT_DRAWER_ANIMATION_MS,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: CHAT_DRAWER_ANIMATION_MS,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
        setSearchQuery("");
        setRenameTarget(null);
      }
    });
  }, [visible, mounted, slideX, overlayOpacity]);

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sessions;
    }
    return sessions.filter((session) =>
      session.title.toLowerCase().includes(query)
    );
  }, [sessions, searchQuery]);

  const showSessionOptions = (session: ChatSession) => {
    Alert.alert(session.title, undefined, [
      {
        text: ChatSessionAction.Rename,
        onPress: () => setRenameTarget(session),
      },
      {
        text: session.isPinned
          ? ChatSessionAction.Unpin
          : ChatSessionAction.Pin,
        onPress: () => onTogglePin(session.id),
      },
      {
        text: ChatSessionAction.Delete,
        style: "destructive",
        onPress: () => onDelete(session.id),
      },
      { text: ChatSessionAction.Cancel, style: "cancel" },
    ]);
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <View
      style={styles.root}
      pointerEvents={visible ? "auto" : "none"}
    >
      <Animated.View
        style={[styles.overlay, { opacity: overlayOpacity }]}
      >
        <Pressable style={styles.overlayPressable} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          {
            width: DRAWER_WIDTH,
            paddingTop: insets.top + CHAT_HEADER_TOP_OFFSET,
            paddingBottom: CHAT_HEADER_BOTTOM_PADDING,
            backgroundColor: theme.background,
            transform: [{ translateX: slideX }],
          },
        ]}
      >
        <View style={styles.header}>
          <ChatMenuButton
            theme={theme}
            onPress={onClose}
            accessibilityLabel="close_chat_menu"
          />

          <View
            style={[
              styles.searchPill,
              {
                backgroundColor: theme.inputSurface,
                borderColor: theme.inputBorder,
                ...Platform.select({
                  ios: {
                    shadowColor: theme.shadow,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.12,
                    shadowRadius: 4,
                  },
                  android: { elevation: 3 },
                }),
              },
            ]}
          >
            <Ionicons name="search-outline" size={20} color={theme.muted} />

            <TextInput
              style={[styles.searchInput, { color: theme.assistantText }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={CHAT_SEARCH_PLACEHOLDER}
              placeholderTextColor={theme.muted}
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode={isAndroid ? "never" : "while-editing"}
              accessibilityLabel="search_chats"
            />

            {isAndroid && searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                hitSlop={8}
                accessibilityLabel="clear_search"
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={theme.muted}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.newChat,
            { backgroundColor: theme.newChatButton },
          ]}
          onPress={() => {
            onCreate();
            onClose();
          }}
        >
          <Ionicons name="create-outline" size={20} color={theme.assistantText} />
          <Text style={[styles.newChatText, { color: theme.assistantText }]}>
            {CHAT_NEW_SESSION_LABEL}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { color: theme.muted }]}>
          {CHAT_RECENT_SECTION_LABEL}
        </Text>

        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={[styles.emptyList, { color: theme.muted }]}>
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
                  onSelect(item.id);
                  onClose();
                }}
                onLongPress={() => showSessionOptions(item)}
                accessibilityLabel={`open_chat_${item.id}`}
              >
                <Text
                  style={[styles.rowTitle, { color: theme.assistantText }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.title}
                </Text>
                {item.isPinned ? (
                  <Pin
                    size={16}
                    color={theme.accent}
                    strokeWidth={2}
                    fill={theme.accent}
                  />
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      </Animated.View>
    </View>

      <RenameSessionModal
        visible={renameTarget !== null}
        initialTitle={renameTarget?.title ?? ""}
        theme={theme}
        onSave={(title) => {
          if (renameTarget) {
            onRename(renameTarget.id, title);
          }
        }}
        onClose={() => setRenameTarget(null)}
      />
    </>
  );
};

export default ChatSessionDrawer;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  overlayPressable: {
    flex: 1,
  },
  panel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: CHAT_SCREEN_HORIZONTAL_PADDING,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    marginBottom: 20,
    gap: 14,
  },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    minHeight: 50,
    borderRadius: 26,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
  },
  newChat: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 28,
    marginBottom: 20,
  },
  newChatText: {
    fontSize: 16,
    fontWeight: "500",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  list: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  emptyList: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  rowTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
});
