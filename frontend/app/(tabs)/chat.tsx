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
import ChatSessionDrawer from "@/components/chat/ChatSessionDrawer";
import EditMessageModal from "@/components/chat/EditMessageModal";
import ChatComposer from "@/components/chat/ChatComposer";
import ChatEmptyState from "@/components/chat/ChatEmptyState";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatMessageRow from "@/components/chat/ChatMessageRow";
import { getChatTheme } from "@/constants/ChatTheme";
import { ChatRole, MessageStatus } from "@/constants/enums/Chat";
import { isIos } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { RootState } from "@/context/store";
import { useChat } from "@/hooks/useChat";
import { useChatSessions } from "@/hooks/useChatSessions";
import { useTrackActiveScreen } from "@/hooks/useTrackActiveScreen";
import { resolveChatUserId } from "@/utils/resolveChatUserId";
import { ChatMessage } from "@/types/chat.types";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSelector } from "react-redux";

/**
 * AI Agent chat screen with Super App branding and SQLite-backed sessions.
 *
 * @returns {JSX.Element} Chat screen.
 */
export default function ChatScreen(): JSX.Element {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = getChatTheme(isDark);
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const { userInfo } = useSelector((state: RootState) => state.userInfo);
  const { userId: authUserId, accessToken } = useSelector(
    (state: RootState) => state.auth
  );
  const chatUserId = resolveChatUserId({
    userId: authUserId,
    accessToken,
  });

  const {
    sessions,
    activeSessionId,
    isLoading: sessionsLoading,
    error: sessionsError,
    selectSession,
    createNewSession,
    removeSession,
    togglePinSession,
    renameSession,
  } = useChatSessions(chatUserId);

  const {
    messages,
    isGenerating,
    error: chatError,
    sendMessage,
    stopGeneration,
    retryMessage,
    editMessage,
  } = useChat(activeSessionId);

  const [inputText, setInputText] = useState("");
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarText, setSnackbarText] = useState("");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    id: string;
    content: string;
  } | null>(null);

  const snackbarOpacity = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  useTrackActiveScreen(ScreenPaths.CHAT);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const showSnackbar = useCallback(
    (text: string) => {
      setSnackbarText(text);
      setSnackbarVisible(true);
      snackbarOpacity.setValue(1);
      Animated.sequence([
        Animated.delay(1600),
        Animated.timing(snackbarOpacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start(() => setSnackbarVisible(false));
    },
    [snackbarOpacity]
  );

  const handleCopy = useCallback(
    async (value: string, label: string) => {
      try {
        await Clipboard.setStringAsync(value);
        showSnackbar(`${label} copied`);
      } catch {
        showSnackbar("Copy failed");
      }
    },
    [showSnackbar]
  );

  const handleCopyMessage = useCallback(
    async (content: string) => {
      try {
        await Clipboard.setStringAsync(content);
        showSnackbar("Copied to clipboard");
      } catch {
        showSnackbar("Copy failed");
      }
    },
    [showSnackbar]
  );

  useEffect(() => {
    const show = Keyboard.addListener(
      isIos ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hide = Keyboard.addListener(
      isIos ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 80);
    }
  }, [messages, activeSessionId]);

  useEffect(() => {
    const message = sessionsError ?? chatError;
    if (message) {
      showSnackbar(message);
    }
  }, [sessionsError, chatError, showSnackbar]);

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isGenerating) {
      return;
    }
    setInputText("");
    await sendMessage(trimmed);
  }, [inputText, isGenerating, sendMessage]);

  const handleSuggestionPress = useCallback(
    async (prompt: string) => {
      if (isGenerating) {
        return;
      }
      setInputText("");
      await sendMessage(prompt);
    },
    [isGenerating, sendMessage]
  );

  const bottomInset = isKeyboardVisible ? (isIos ? 12 : 16) : tabBarHeight + 8;
  const hasMessages = messages.length > 0;

  const renderMessage = ({
    item,
    index,
  }: {
    item: ChatMessage;
    index: number;
  }) => {
    const prev = messages[index - 1];
    const showRegenerate =
      item.role === ChatRole.Assistant &&
      item.status === MessageStatus.Sent &&
      prev?.role === ChatRole.User;

    return (
      <ChatMessageRow
        message={item}
        theme={theme}
        showRegenerate={showRegenerate}
        onRegenerate={
          showRegenerate && prev ? () => retryMessage(prev.id) : undefined
        }
        onCopyMessage={
          item.role === ChatRole.Assistant ? handleCopyMessage : undefined
        }
        onCopy={handleCopy}
      />
    );
  };

  if (sessionsLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accentMuted} />
      </View>
    );
  }

  return (
    <>
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        {!isDark && (
          <LinearGradient
            colors={["rgba(255,255,255,0)", theme.gradientBottom]}
            style={styles.bottomGradient}
            pointerEvents="none"
          />
        )}

        <ChatHeader
          theme={theme}
          onOpenHistory={() => setDrawerVisible(true)}
        />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={isIos ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.list,
              !hasMessages && styles.listEmpty,
            ]}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            ListEmptyComponent={
              <ChatEmptyState
                theme={theme}
                firstName={userInfo?.firstName}
                onSuggestionPress={handleSuggestionPress}
                suggestionsDisabled={isGenerating}
              />
            }
            showsVerticalScrollIndicator={false}
          />

          <ChatComposer
            theme={theme}
            value={inputText}
            onChangeText={setInputText}
            onSend={handleSend}
            onStop={stopGeneration}
            isGenerating={isGenerating}
            bottomInset={bottomInset}
          />
        </KeyboardAvoidingView>

        {snackbarVisible && (
          <Animated.View
            style={[
              styles.snackbar,
              {
                opacity: snackbarOpacity,
                backgroundColor: isDark ? "#e3e3e3" : "#303030",
              },
            ]}
          >
            <Text
              style={[
                styles.snackbarText,
                { color: isDark ? "#131314" : "#fff" },
              ]}
            >
              {snackbarText}
            </Text>
          </Animated.View>
        )}

        <ChatSessionDrawer
          visible={drawerVisible}
          sessions={sessions}
          activeSessionId={activeSessionId}
          theme={theme}
          onClose={() => setDrawerVisible(false)}
          onSelect={selectSession}
          onCreate={createNewSession}
          onDelete={removeSession}
          onTogglePin={togglePinSession}
          onRename={renameSession}
        />
      </View>

      <EditMessageModal
        visible={editTarget !== null}
        initialContent={editTarget?.content ?? ""}
        theme={theme}
        onSave={(content) => {
          if (editTarget) {
            editMessage(editTarget.id, content);
          }
        }}
        onClose={() => setEditTarget(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  listEmpty: {
    flexGrow: 1,
  },
  snackbar: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  snackbarText: {
    fontSize: 14,
  },
});
