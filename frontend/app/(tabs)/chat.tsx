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

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";

import { Colors } from "@/constants/Colors";
import { sendChatMessage, ChatMessage } from "@/services/chatService";

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const tabBarHeight = useBottomTabBarHeight();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const theme = {
    bg: isDark ? "#000" : "#fff",
    inputBg: isDark ? "#1c1c1e" : "#f2f2f7",
    userBubble: Colors.companyOrange,
    assistantBubble: isDark ? "#1c1c1e" : "#e9e9eb",
    userText: "#fff",
    assistantText: isDark ? "#fff" : "#000",
    inputText: isDark ? "#fff" : "#000",
    placeholder: isDark ? "#8e8e93" : "#8e8e93",
    border: isDark ? "#2c2c2e" : "#e0e0e0",
    emptyText: isDark ? "#8e8e93" : "#8e8e93",
  };

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const reply = await sendChatMessage(trimmed, messages);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading]);

  const markdownStyles = {
    body: {
      color: theme.assistantText,
      fontSize: 16,
      lineHeight: 22,
    },
    strong: {
      fontWeight: "700" as const,
    },
    heading1: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: theme.assistantText,
      marginBottom: 4,
    },
    heading2: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: theme.assistantText,
      marginBottom: 4,
    },
    heading3: {
      fontSize: 18,
      fontWeight: "600" as const,
      color: theme.assistantText,
      marginBottom: 2,
    },
    bullet_list: {
      marginVertical: 4,
    },
    list_item: {
      marginVertical: 2,
    },
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.messageBubble,
          isUser
            ? [styles.userBubble, { backgroundColor: theme.userBubble }]
            : [
                styles.assistantBubble,
                { backgroundColor: theme.assistantBubble },
              ],
        ]}
      >
        {isUser ? (
          <Text style={[styles.messageText, { color: theme.userText }]}>
            {item.content}
          </Text>
        ) : (
          <Markdown style={markdownStyles}>{item.content}</Markdown>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-ellipses-outline" size={64} color={theme.emptyText} />
      <Text style={[styles.emptyTitle, { color: theme.emptyText }]}>
        Hi there! 👋
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.emptyText }]}>
        Ask me about today&apos;s menu, or anything about the super app!
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.messageList,
          messages.length === 0 && styles.emptyList,
        ]}
        style={{ flex: 1 }}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          isLoading ? (
            <View style={[styles.typingContainer, { backgroundColor: theme.assistantBubble }]}>
              <ActivityIndicator size="small" color={Colors.companyOrange} />
              <Text style={[styles.typingText, { color: theme.placeholder }]}>
                Thinking...
              </Text>
            </View>
          ) : null
        }
      />

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.bg,
            borderTopColor: theme.border,
            paddingBottom: Platform.OS === "ios" ? tabBarHeight + 4 : 8,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.inputBg,
              color: theme.inputText,
            },
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask me anything..."
          placeholderTextColor={theme.placeholder}
          multiline
          maxLength={1000}
          onSubmitEditing={handleSend}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor:
                inputText.trim() && !isLoading
                  ? Colors.companyOrange
                  : theme.inputBg,
            },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={inputText.trim() && !isLoading ? "#fff" : theme.placeholder}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    marginBottom: 8,
    gap: 8,
  },
  typingText: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
