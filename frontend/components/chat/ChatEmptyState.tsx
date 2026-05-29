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
import ChatSuggestionChip from "@/components/chat/ChatSuggestionChip";
import SuperAppAgentIcon from "@/components/chat/SuperAppAgentIcon";
import { CHAT_EMPTY_HINT, CHAT_SUGGESTIONS } from "@/constants/Constants";
import { getChatEmptyTitleContent } from "@/utils/chatEmptyTitle";
import { ChatThemePalette } from "@/constants/ChatTheme";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export interface ChatEmptyStateProps {
  theme: ChatThemePalette;
  firstName?: string;
  onSuggestionPress: (prompt: string) => void;
  suggestionsDisabled?: boolean;
}

/**
 * Empty chat state with greeting, headline, and quick-action suggestion chips.
 *
 * @param {ChatEmptyStateProps} props - Theme, user name, and chip handler.
 * @returns {JSX.Element} Empty chat state UI.
 */
const ChatEmptyState = ({
  theme,
  firstName,
  onSuggestionPress,
  suggestionsDisabled = false,
}: ChatEmptyStateProps): JSX.Element => {
  const { greeting, message } = getChatEmptyTitleContent(firstName);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <SuperAppAgentIcon size={72} />

      <View style={styles.copyBlock}>
        {greeting ? (
          <Text style={[styles.greeting, { color: theme.accent }]}>
            {greeting}
          </Text>
        ) : null}

        <Text style={[styles.message, { color: theme.assistantText }]}>
          {message}
        </Text>

        <Text style={[styles.hint, { color: theme.muted }]}>
          {CHAT_EMPTY_HINT}
        </Text>
      </View>

      <View style={styles.chips}>
        {CHAT_SUGGESTIONS.map((suggestion) => (
          <ChatSuggestionChip
            key={suggestion.id}
            label={suggestion.label}
            theme={theme}
            disabled={suggestionsDisabled}
            onPress={() => onSuggestionPress(suggestion.prompt)}
          />
        ))}
      </View>
    </ScrollView>
  );
};

export default ChatEmptyState;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 16,
    gap: 24,
  },
  copyBlock: {
    alignItems: "center",
    gap: 10,
    maxWidth: 320,
  },
  greeting: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.8,
    textAlign: "center",
    lineHeight: 40,
  },
  message: {
    fontSize: 20,
    fontWeight: "500",
    letterSpacing: -0.2,
    textAlign: "center",
    lineHeight: 28,
  },
  hint: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    maxWidth: 360,
  },
});
