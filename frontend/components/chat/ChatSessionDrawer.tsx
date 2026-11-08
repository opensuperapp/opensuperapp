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
import PrimaryButton from "@/components/brand/PrimaryButton";
import ChatMenuButton from "@/components/chat/ChatMenuButton";
import RenameSessionModal from "@/components/chat/RenameSessionModal";
import {
  duration,
  easing,
  radius,
  size,
  textStyle,
  type,
} from "@/constants/brand";
import { ChatThemePalette } from "@/constants/ChatTheme";
import {
  CHAT_EMPTY_SEARCH_LABEL,
  CHAT_EMPTY_SESSIONS_LABEL,
  CHAT_HEADER_BOTTOM_PADDING,
  CHAT_HEADER_TOP_OFFSET,
  CHAT_NEW_SESSION_LABEL,
  CHAT_RECENT_SECTION_LABEL,
  CHAT_SEARCH_PLACEHOLDER,
  isAndroid,
} from "@/constants/Constants";
import { ChatSessionAction } from "@/constants/enums/Chat";
import { ChatSession } from "@/types/chat.types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { JSX, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
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
const DRAWER_WIDTH = Math.min(
  SCREEN_WIDTH * size.drawer.widthRatio,
  size.drawer.maxWidth
);
const DRAWER_EASING = Easing.bezier(...easing.standard);

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
    }
  }, [visible]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (visible) {
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: 0,
          duration: duration.drawer,
          easing: DRAWER_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: duration.drawer,
          easing: DRAWER_EASING,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(slideX, {
        toValue: -DRAWER_WIDTH,
        duration: duration.pop,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: duration.pop,
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
      <View style={styles.root} pointerEvents={visible ? "auto" : "none"}>
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayOpacity, backgroundColor: theme.backdrop },
          ]}
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
              backgroundColor: theme.sheet,
              borderRightColor: theme.inputBorder,
              transform: [{ translateX: slideX }],
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
                styles.searchPill,
                {
                  backgroundColor: theme.inputSurface,
                  borderColor: theme.inputBorder,
                },
              ]}
            >
              <BrandIcon name="search" size={20} color={theme.subtle} />

              <TextInput
                style={[styles.searchInput, { color: theme.assistantText }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={CHAT_SEARCH_PLACEHOLDER}
                placeholderTextColor={theme.subtle}
                selectionColor={theme.highlight}
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
            onPress={() => {
              onCreate();
              onClose();
            }}
          />

          <Text style={[styles.sectionLabel, { color: theme.subtle }]}>
            {CHAT_RECENT_SECTION_LABEL}
          </Text>

          <FlatList
            data={filteredSessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
                    onSelect(item.id);
                    onClose();
                  }}
                  onLongPress={() => showSessionOptions(item)}
                  accessibilityLabel={
                    item.isPinned ? `${item.title}, pinned` : item.title
                  }
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
  },
  overlayPressable: {
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
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: size.searchHeight,
    borderRadius: radius.input,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    ...textStyle({ size: 15, weight: 400 }),
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
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
    paddingBottom: 12,
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
