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
import ChatMenuButton from "@/components/chat/ChatMenuButton";
import { showChatActionMenu } from "@/components/chat/chatActions";
import { useChatSessionsContext } from "@/components/chat/ChatSessionsContext";
import { duration, easing, size, textStyle, type } from "@/constants/brand";
import { ChatThemePalette } from "@/constants/ChatTheme";
import {
  CHAT_EMPTY_SEARCH_LABEL,
  CHAT_EMPTY_SESSIONS_LABEL,
  CHAT_HEADER_BOTTOM_PADDING,
  CHAT_HEADER_TOP_OFFSET,
  CHAT_NEW_SESSION_LABEL,
  CHAT_RECENT_SECTION_LABEL,
  CHAT_RENAME_MODAL_TITLE,
  CHAT_RENAME_PLACEHOLDER,
  CHAT_SEARCH_PLACEHOLDER,
  CHAT_SESSION_TITLE_MAX_LENGTH,
  isAndroid,
} from "@/constants/Constants";
import { ChatSessionAction } from "@/constants/enums/Chat";
import { ChatSession } from "@/types/chat.types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { JSX, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DRAWER_EASING = Easing.bezier(...easing.standard);

export interface ChatSessionDrawerProps {
  visible: boolean;
  theme: ChatThemePalette;
  onClose: () => void;
}

/**
 * Chat history as a left drawer: search, "New chat", and the sessions (tap to restore,
 * long-press to rename, pin or delete). It sits in a transparent modal so it covers the
 * native navigation bar and tab bar as well as the conversation.
 *
 * @param {ChatSessionDrawerProps} props - Drawer visibility and close handler.
 * @returns {JSX.Element | null} Side drawer overlay.
 */
const ChatSessionDrawer = ({
  visible,
  theme,
  onClose,
}: ChatSessionDrawerProps): JSX.Element | null => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const drawerWidth = Math.min(
    windowWidth * size.drawer.widthRatio,
    size.drawer.maxWidth,
  );
  const {
    sessions,
    activeSessionId,
    error,
    selectSession,
    createNewSession,
    removeSession,
    togglePinSession,
    renameSession,
  } = useChatSessionsContext();
  // Stays mounted through the closing slide, then unmounts.
  const [mounted, setMounted] = useState(visible);
  const [searchQuery, setSearchQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<ChatSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  // The ref blocks a second tap that lands before the disabled button re-renders.
  const creatingRef = useRef(false);
  const [createFailed, setCreateFailed] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: visible ? duration.drawer : duration.pop,
      easing: visible ? DRAWER_EASING : undefined,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);
        setSearchQuery("");
        setRenameTarget(null);
        setCreateFailed(false);
      }
    });
  }, [visible, mounted, slide]);

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sessions;
    }
    return sessions.filter((session) =>
      session.title.toLowerCase().includes(query),
    );
  }, [sessions, searchQuery]);

  // Close only once the new session is active: until then the previous conversation is
  // still the one a sent message would land in. On failure stay open and show why.
  const startNewSession = async () => {
    if (creatingRef.current) {
      return;
    }
    creatingRef.current = true;
    setIsCreating(true);
    setCreateFailed(false);
    try {
      const session = await createNewSession();
      if (session) {
        onClose();
      } else {
        setCreateFailed(true);
      }
    } finally {
      creatingRef.current = false;
      setIsCreating(false);
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
      theme.accent,
    );

  if (!mounted) {
    return null;
  }

  const translateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root} pointerEvents={visible ? "auto" : "none"}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: slide, backgroundColor: theme.backdrop },
          ]}
        >
          <Pressable
            style={styles.flex}
            onPress={onClose}
            accessibilityLabel="Close chat history"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            {
              width: drawerWidth,
              paddingTop: insets.top + CHAT_HEADER_TOP_OFFSET,
              paddingBottom: CHAT_HEADER_BOTTOM_PADDING,
              backgroundColor: theme.sheet,
              borderRightColor: theme.inputBorder,
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={styles.header}>
            <ChatMenuButton
              theme={theme}
              onPress={onClose}
              accessibilityLabel="Close chat history"
            />

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
          </View>

          <PrimaryButton
            title={CHAT_NEW_SESSION_LABEL}
            style={styles.newChat}
            loading={isCreating}
            onPress={startNewSession}
          />
          {createFailed && error ? (
            <Text
              style={[styles.createError, { color: theme.muted }]}
              accessibilityRole="alert"
            >
              {error}
            </Text>
          ) : null}

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
                    onClose();
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
                    <MaterialIcons
                      name="push-pin"
                      size={16}
                      color={theme.accent}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
        </Animated.View>
      </View>

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
    </Modal>
  );
};

export default ChatSessionDrawer;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  panel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: 16,
    borderRightWidth: 1,
  },
  header: {
    marginBottom: 16,
    gap: 12,
  },
  // The platform's inset search field: filled, no border, 10pt corners.
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 10,
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
  createError: {
    ...textStyle(type.metaLabel),
    marginTop: -8,
    marginBottom: 16,
    paddingHorizontal: 4,
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
