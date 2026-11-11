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
import WheelLoader from "@/components/brand/WheelLoader";
import BrandIcon from "@/components/brand/BrandIcon";
import EditMessageModal from "@/components/chat/EditMessageModal";
import ChatComposer from "@/components/chat/ChatComposer";
import ChatEmptyState from "@/components/chat/ChatEmptyState";
import ChatMenuButton from "@/components/chat/ChatMenuButton";
import ChatMessageRow from "@/components/chat/ChatMessageRow";
import { useChatSessionsContext } from "@/components/chat/ChatSessionsContext";
import { textStyle } from "@/constants/brand";
import { getChatTheme } from "@/constants/ChatTheme";
import { ChatRole, MessageStatus } from "@/constants/enums/Chat";
import { CHAT_MENU_BUTTON_SIZE, isIos } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useChat } from "@/hooks/useChat";
import { useLeaveWhenSessionEnds } from "@/hooks/useLeaveWhenSessionEnds";
import { useTrackActiveScreen } from "@/hooks/useTrackActiveScreen";
import { ChatMessage } from "@/types/chat.types";
import { useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaInsetsContext,
  SafeAreaProvider,
} from "react-native-safe-area-context";

/**
 * AI Agent chat screen with Super App branding and SQLite-backed sessions.
 *
 * @returns {JSX.Element} Chat screen.
 */
export default function ChatScreen(): JSX.Element {
  const { isDark } = useBrandTheme();
  const theme = getChatTheme(isDark);
  const navigation = useNavigation();
  const {
    activeSessionId,
    isLoading: sessionsLoading,
    error: sessionsError,
    createNewSession,
  } = useChatSessionsContext();

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
  const [editTarget, setEditTarget] = useState<{
    id: string;
    content: string;
  } | null>(null);

  const snackbarOpacity = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  useTrackActiveScreen(ScreenPaths.CHAT);

  // The tab is hidden once signed out, and there is no Sign In fallback here.
  useLeaveWhenSessionEnds(() => router.navigate(ScreenPaths.FEED));


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

  // `tabBottomInset` comes from the screen's own SafeAreaProvider (below), so on iOS it
  // includes the native tab bar the screen extends under; the root provider's inset is
  // only the home indicator. On Android the content ends above the bar, so only a small
  // gap is needed.
  const composerBottomInset = (tabBottomInset: number) =>
    isKeyboardVisible ? (isIos ? 12 : 16) : (isIos ? tabBottomInset : 0) + 8;
  const hasMessages = messages.length > 0;

  // Native bar buttons: history on the left, "new chat" once there is something to leave.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <ChatMenuButton
          theme={theme}
          onPress={() => router.push("/chat/history")}
          accessibilityLabel="Open chat history"
        />
      ),
      headerRight: hasMessages
        ? () => (
            <TouchableOpacity
              onPress={createNewSession}
              style={styles.headerAction}
              accessibilityLabel="New chat"
              accessibilityRole="button"
            >
              <BrandIcon name="edit" size={22} color={theme.accent} />
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [navigation, theme, hasMessages, createNewSession]);

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
          item.status === MessageStatus.Sent &&
          (item.role === ChatRole.Assistant || item.role === ChatRole.User)
            ? handleCopyMessage
            : undefined
        }
        onEdit={
          item.role === ChatRole.User &&
          item.status === MessageStatus.Sent &&
          !isGenerating
            ? () => setEditTarget({ id: item.id, content: item.content })
            : undefined
        }
        onCopy={handleCopy}
      />
    );
  };

  if (sessionsLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <WheelLoader size={40} color={theme.muted} />
      </View>
    );
  }

  return (
    <>
      {/* Not around EditMessageModal: its sheet has no tab bar under it. */}
      <SafeAreaProvider>
        <View style={[styles.screen, { backgroundColor: theme.background }]}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={isIos ? "padding" : undefined}
            keyboardVerticalOffset={0}
          >
            <FlatList
              ref={flatListRef}
              // Scrolls under the translucent bar; iOS insets it for the header.
              contentInsetAdjustmentBehavior="automatic"
              keyboardDismissMode="interactive"
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
                  onSuggestionPress={handleSuggestionPress}
                  suggestionsDisabled={isGenerating}
                />
              }
              showsVerticalScrollIndicator={false}
            />

            <SafeAreaInsetsContext.Consumer>
              {(tabInsets) => (
                <ChatComposer
                  theme={theme}
                  value={inputText}
                  onChangeText={setInputText}
                  onSend={handleSend}
                  onStop={stopGeneration}
                  isGenerating={isGenerating}
                  bottomInset={composerBottomInset(tabInsets?.bottom ?? 0)}
                />
              )}
            </SafeAreaInsetsContext.Consumer>
          </KeyboardAvoidingView>

          {snackbarVisible && (
            <Animated.View
              style={[
                styles.snackbar,
                {
                  opacity: snackbarOpacity,
                  backgroundColor: theme.assistantText,
                },
              ]}
            >
              <Text
                style={[
                  styles.snackbarText,
                  { color: theme.background },
                ]}
              >
                {snackbarText}
              </Text>
            </Animated.View>
          )}

        </View>
      </SafeAreaProvider>

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
  list: {
    paddingHorizontal: 16,
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
  headerAction: {
    width: CHAT_MENU_BUTTON_SIZE,
    height: CHAT_MENU_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  snackbarText: {
    ...textStyle({ size: 14, weight: 500 }),
  },
});
