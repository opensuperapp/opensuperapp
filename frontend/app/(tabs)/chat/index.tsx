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
import ChatSessionDrawer from "@/components/chat/ChatSessionDrawer";
import { useChatSessionsContext } from "@/components/chat/ChatSessionsContext";
import { textStyle } from "@/constants/brand";
import { getChatTheme } from "@/constants/ChatTheme";
import { ChatRole, MessageStatus } from "@/constants/enums/Chat";
import {
  CHAT_MENU_BUTTON_SIZE,
  isIos,
  TAB_BAR_EXTRA_INSET,
} from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useChat } from "@/hooks/useChat";
import { useLeaveWhenSessionEnds } from "@/hooks/useLeaveWhenSessionEnds";
import { useTrackActiveScreen } from "@/hooks/useTrackActiveScreen";
import { ChatMessage } from "@/types/chat.types";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  AndroidSoftInputModes,
  KeyboardController,
  useKeyboardController,
  useReanimatedKeyboardAnimation,
} from "react-native-keyboard-controller";
import Reanimated, { useAnimatedStyle } from "react-native-reanimated";
import {
  SafeAreaInsetsContext,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// Composer padding over the tab bar, and the gap it keeps above the keyboard.
const COMPOSER_GAP = 8;
const KEYBOARD_GAP = 12;

/**
 * Lifts the chat by the keyboard, frame by frame with the keyboard's own animation.
 * The lift starts once the keyboard passes the tab bar, and ends KEYBOARD_GAP above
 * it, so the composer's padding never has to jump. The tab bar itself stays put: on
 * Android that needs keyboard-controller enabled, which stops the window resizing
 * (see ChatScreen), so the lift is zero while it is off.
 */
function KeyboardLift({
  screenBottomGap,
  children,
}: {
  screenBottomGap: number;
  children: React.ReactNode;
}) {
  // keyboard-controller rather than Reanimated's useAnimatedKeyboard, which jumped
  // straight to the end height on real devices instead of following the keyboard.
  // Its height is negative while the keyboard is up.
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const { enabled } = useKeyboardController();
  const { bottom: tabBottom } = useSafeAreaInsets();
  const lift = useAnimatedStyle(() => ({
    paddingBottom: enabled
      ? Math.max(
          -keyboardHeight.value -
            screenBottomGap -
            tabBottom -
            TAB_BAR_EXTRA_INSET -
            COMPOSER_GAP +
            KEYBOARD_GAP,
          0
        )
      : 0,
  }));
  return (
    <Reanimated.View style={[styles.flex, lift]}>{children}</Reanimated.View>
  );
}

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
  // How far the screen's bottom edge sits above the window's, which the keyboard
  // has to rise past before it covers anything. iOS only: on Android the screen runs
  // to the window's bottom edge, and measureInWindow there comes back short by the
  // status bar height, which would put the composer under the keyboard.
  const screenRef = useRef<View>(null);
  const [screenBottomGap, setScreenBottomGap] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  const measureScreen = useCallback(() => {
    if (!isIos) {
      return;
    }
    screenRef.current?.measureInWindow((_x, y, _w, h) =>
      setScreenBottomGap(Math.max(windowHeight - (y + h), 0))
    );
  }, [windowHeight]);
  // onLayout alone misses a rotation whose layout lands before the new window height:
  // the gap would stay measured against the old one. Measuring again once the height
  // arrives covers that order; onLayout covers the other.
  useEffect(() => {
    measureScreen();
  }, [measureScreen]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarText, setSnackbarText] = useState("");
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    id: string;
    content: string;
  } | null>(null);

  const snackbarOpacity = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  useTrackActiveScreen(ScreenPaths.CHAT);

  // Android: adjustResize shrinks the whole window for the keyboard, tab bar included.
  // While this screen is focused the window is set to adjustNothing instead, and
  // keyboard-controller is switched on so KeyboardLift can follow the keyboard with the
  // composer alone. Every other screen relies on the resize, and so do this screen's
  // modals (the controller pins their windows to adjustNothing too), so both are
  // restored on blur and while a modal is open.
  const { setEnabled: setKeyboardControllerEnabled } = useKeyboardController();
  const modalOpen = isDrawerOpen || editTarget !== null;
  useFocusEffect(
    useCallback(() => {
      if (isIos || modalOpen) {
        return;
      }
      setKeyboardControllerEnabled(true);
      KeyboardController.setInputMode(
        AndroidSoftInputModes.SOFT_INPUT_ADJUST_NOTHING
      );
      return () => {
        KeyboardController.setDefaultMode();
        setKeyboardControllerEnabled(false);
      };
    }, [modalOpen, setKeyboardControllerEnabled])
  );

  // The drawer is a Modal, drawn over the whole window rather than inside this tab, so
  // it has to close whenever the screen loses focus (a notification tap, a tab
  // redirect) or it stays over whatever tab comes next. It goes at once, without its
  // closing slide: a new key remounts it closed, which drops its Modal in this commit.
  // Kept up through the slide, the Modal would still be presented when the sign-in
  // sheet is pushed after an expiry, and iOS refuses to present the sheet over it.
  const [drawerKey, setDrawerKey] = useState(0);
  const dismissDrawerNow = useCallback(() => {
    setDrawerOpen(false);
    setDrawerKey((key) => key + 1);
  }, []);
  useFocusEffect(useCallback(() => dismissDrawerNow, [dismissDrawerNow]));

  // The tab is hidden once signed out, and there is no Sign In fallback here.
  useLeaveWhenSessionEnds(() => {
    dismissDrawerNow();
    router.navigate(ScreenPaths.FEED);
  });

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
  // only the home indicator. On Android the screen also runs under the bar, but the
  // inset is only the system nav bar, so the bar's own height is added.
  // The gap to the keyboard is KeyboardLift's job, so the composer keeps its tab-bar
  // inset throughout.
  const composerBottomInset = (tabBottomInset: number) =>
    tabBottomInset +
    TAB_BAR_EXTRA_INSET +
    COMPOSER_GAP;
  const hasMessages = messages.length > 0;

  // One new chat per tap: a second tap while the first is still being created would
  // leave an extra empty session behind. A failure is reported here on every tap (the
  // hook keeps create failures out of the shared `sessionsError`, so the error effect
  // doesn't show it a second time).
  const creatingSessionRef = useRef(false);
  const startNewSession = useCallback(async () => {
    if (creatingSessionRef.current) {
      return;
    }
    creatingSessionRef.current = true;
    try {
      const session = await createNewSession();
      if (!session) {
        showSnackbar("Couldn't start a new chat. Try again.");
      }
    } finally {
      creatingSessionRef.current = false;
    }
  }, [createNewSession, showSnackbar]);

  // Native bar buttons: history on the left, "new chat" once there is something to leave.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <ChatMenuButton
          theme={theme}
          onPress={() => setDrawerOpen(true)}
          accessibilityLabel="Open chat history"
        />
      ),
      headerRight: hasMessages
        ? () => (
            <TouchableOpacity
              onPress={startNewSession}
              style={styles.headerAction}
              accessibilityLabel="New chat"
              accessibilityRole="button"
            >
              <BrandIcon name="edit" size={22} color={theme.accent} />
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [navigation, theme, hasMessages, startNewSession]);

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
      {/* Not around EditMessageModal or the drawer: neither has the tab bar under it. */}
      <SafeAreaProvider>
        <View
          ref={screenRef}
          onLayout={measureScreen}
          style={[styles.screen, { backgroundColor: theme.background }]}
        >
          <KeyboardLift screenBottomGap={screenBottomGap}>
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
          </KeyboardLift>

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
      <ChatSessionDrawer
        key={drawerKey}
        visible={isDrawerOpen}
        theme={theme}
        onClose={() => setDrawerOpen(false)}
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
