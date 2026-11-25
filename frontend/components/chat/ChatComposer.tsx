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
import { radius, size, textStyle } from "@/constants/brand";
import { CHAT_INPUT_PLACEHOLDER } from "@/constants/Constants";
import { ChatThemePalette } from "@/constants/ChatTheme";
import { MAX_MESSAGE_LENGTH } from "@/types/chat.types";
import { Ionicons } from "@expo/vector-icons";
import React, { JSX, useState } from "react";
import {
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
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomInset }]}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: theme.inputSurface,
            borderColor: focused ? theme.highlight : theme.inputBorder,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: theme.assistantText }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={CHAT_INPUT_PLACEHOLDER}
          placeholderTextColor={theme.subtle}
          selectionColor={theme.highlight}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
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
              { backgroundColor: canSend ? theme.signal : theme.surface },
            ]}
            onPress={onSend}
            disabled={!canSend}
            accessibilityLabel="send_message"
          >
            <BrandIcon
              name="send"
              size={20}
              strokeWidth={1.8}
              color={canSend ? theme.onSignal : theme.subtle}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default ChatComposer;

// Composer pill: 54 high, 6 right / 18 left padding, 42px send button.
const SEND_SIZE = 42;
const INPUT_LINE_HEIGHT = 22;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: size.chatComposerHeight,
    paddingRight: 6,
    paddingLeft: 18,
  },
  input: {
    flex: 1,
    ...textStyle({ size: 16, weight: 400 }),
    lineHeight: INPUT_LINE_HEIGHT,
    maxHeight: 120,
    paddingVertical: (size.chatComposerHeight - 2 - INPUT_LINE_HEIGHT) / 2,
  },
  sendBtn: {
    width: SEND_SIZE,
    height: SEND_SIZE,
    borderRadius: SEND_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
