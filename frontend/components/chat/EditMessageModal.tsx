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
import { ChatThemePalette } from "@/constants/ChatTheme";
import { isIos } from "@/constants/Constants";
import { MAX_MESSAGE_LENGTH } from "@/types/chat.types";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface EditMessageModalProps {
  visible: boolean;
  initialContent: string;
  theme: ChatThemePalette;
  onSave: (content: string) => void;
  onClose: () => void;
}

/**
 * Full-screen modal for editing a previously sent user message.
 *
 * @param {EditMessageModalProps} props - Visibility, content, and handlers.
 * @returns {JSX.Element} Edit message modal.
 */
const EditMessageModal = ({
  visible,
  initialContent,
  theme,
  onSave,
  onClose,
}: EditMessageModalProps): JSX.Element => {
  const [content, setContent] = useState(initialContent);
  const insets = useSafeAreaInsets();
  const canSend = content.trim().length > 0;

  useEffect(() => {
    if (visible) {
      setContent(initialContent);
    }
  }, [visible, initialContent]);

  const handleSend = () => {
    const trimmed = content.trim();
    if (trimmed) {
      onSave(trimmed);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.dismissBtn,
              {
                backgroundColor: theme.inputSurface,
                borderColor: theme.inputBorder,
              },
            ]}
            accessibilityLabel="Dismiss edit"
            accessibilityRole="button"
          >
            <Ionicons
              name="close"
              size={20}
              color={theme.assistantText}
            />
            <Text style={[styles.dismissText, { color: theme.assistantText }]}>
              Dismiss edit
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={isIos ? "padding" : undefined}
          keyboardVerticalOffset={insets.top}
        >
          <TextInput
            style={[styles.input, { color: theme.assistantText }]}
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            autoFocus
            textAlignVertical="top"
            placeholderTextColor={theme.muted}
          />
        </KeyboardAvoidingView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            style={[
              styles.sendBtn,
              { backgroundColor: canSend ? theme.accent : theme.surface },
            ]}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <Ionicons
              name="send"
              size={20}
              color={canSend ? "#fff" : theme.muted}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default EditMessageModal;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  dismissBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 22,
  },
  dismissText: {
    fontSize: 15,
    fontWeight: "600",
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    ...Platform.select({
      android: { paddingBottom: 8 },
    }),
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: "flex-end",
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
