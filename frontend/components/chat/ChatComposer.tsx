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
import { CHAT_INPUT_PLACEHOLDER } from "@/constants/Constants";
import { ChatThemePalette } from "@/constants/ChatTheme";
import { MAX_MESSAGE_LENGTH } from "@/types/chat.types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface ChatComposerProps {
  theme: ChatThemePalette;
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
  bottomInset: number;
}

/**
 * Chat message composer with text field and send (or stop) button.
 *
 * @param {ChatComposerProps} props - Input state and handlers.
 * @returns {JSX.Element} Chat composer bar.
 */
const ChatComposer = ({
  theme,
  value,
  onChangeText,
  onSend,
  onStop,
  isGenerating,
  bottomInset,
}: ChatComposerProps): JSX.Element => {
  const canSend = value.trim().length > 0 && !isGenerating;

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomInset }]}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: theme.inputSurface,
            borderColor: theme.inputBorder,
            ...Platform.select({
              ios: {
                shadowColor: theme.shadow,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.14,
                shadowRadius: 6,
              },
              android: { elevation: 4 },
            }),
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: theme.assistantText }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={CHAT_INPUT_PLACEHOLDER}
          placeholderTextColor={theme.muted}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          editable={!isGenerating}
          accessibilityLabel="chat_input"
        />

        {isGenerating ? (
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: theme.assistantText }]}
            onPress={onStop}
            accessibilityLabel="stop_generation"
          >
            <Ionicons name="stop" size={18} color={theme.background} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: canSend ? theme.accent : theme.surface },
            ]}
            onPress={onSend}
            disabled={!canSend}
            accessibilityLabel="send_message"
          >
            <Ionicons
              name="send"
              size={20}
              color={canSend ? "#fff" : theme.muted}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default ChatComposer;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 32,
    borderWidth: 1,
    minHeight: 56,
    paddingRight: 8,
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    paddingVertical: 14,
    paddingRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
