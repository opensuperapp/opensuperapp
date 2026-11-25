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
import { size, textStyle, type } from "@/constants/brand";
import { ChatThemePalette } from "@/constants/ChatTheme";
import { isIos } from "@/constants/Constants";
import { MAX_MESSAGE_LENGTH } from "@/types/chat.types";
import React, { JSX, useEffect, useState } from "react";
import {
  Dimensions,
  Keyboard,
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
 * Native page sheet for editing a previously sent user message, with the platform's
 * Cancel / Send bar buttons. Multi-line editing can't live in an alert prompt.
 *
 * @param {EditMessageModalProps} props - Visibility, content, and handlers.
 * @returns {JSX.Element} Edit message sheet.
 */
const EditMessageModal = ({
  visible,
  initialContent,
  theme,
  onSave,
  onClose,
}: EditMessageModalProps): JSX.Element => {
  const [content, setContent] = useState(initialContent);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const insets = useSafeAreaInsets();
  const canSend = content.trim().length > 0;

  useEffect(() => {
    if (visible) {
      setContent(initialContent);
    }
  }, [visible, initialContent]);

  // A page sheet's bottom edge is the screen's, so the keyboard overlap is simply the
  // distance from its top to the bottom of the window. Android resizes for us.
  useEffect(() => {
    if (!isIos) {
      return;
    }
    const frameSub = Keyboard.addListener("keyboardWillChangeFrame", (e) => {
      const { screenY, height } = e.endCoordinates;
      const windowHeight = Dimensions.get("window").height;
      // "Prefer Cross-Fade Transitions" reports screenY 0, which would turn the whole
      // window into padding; KeyboardAvoidingView treats that as no keyboard.
      if (screenY === 0 || height === 0) {
        setKeyboardInset(0);
        return;
      }
      setKeyboardInset(
        Math.min(Math.max(windowHeight - screenY, 0), windowHeight - 1)
      );
    });
    // An undocked or floating keyboard hides after its last frame change.
    const hideSub = Keyboard.addListener("keyboardWillHide", () =>
      setKeyboardInset(0)
    );
    return () => {
      frameSub.remove();
      hideSub.remove();
    };
  }, []);

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
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.screen,
          {
            backgroundColor: theme.sheet,
            paddingTop: isIos ? 0 : insets.top,
            paddingBottom: Math.max(keyboardInset, insets.bottom),
          },
        ]}
      >
        <View style={[styles.bar, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={8}
            style={styles.barButton}
            accessibilityLabel="Dismiss edit"
            accessibilityRole="button"
          >
            <Text style={[styles.barButtonText, { color: theme.accent }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <Text
            style={[styles.title, { color: theme.assistantText }]}
            accessibilityRole="header"
            numberOfLines={1}
          >
            Edit message
          </Text>

          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            hitSlop={8}
            style={[styles.barButton, styles.barButtonRight]}
            accessibilityLabel="Send message"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSend }}
          >
            <Text
              style={[
                styles.barButtonText,
                styles.barButtonDone,
                { color: canSend ? theme.accent : theme.subtle },
              ]}
            >
              Send
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.input, { color: theme.assistantText }]}
          value={content}
          onChangeText={setContent}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          autoFocus
          textAlignVertical="top"
          placeholderTextColor={theme.subtle}
          selectionColor={theme.highlight}
        />
      </View>
    </Modal>
  );
};

export default EditMessageModal;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  // Mirrors a UINavigationBar inside a sheet: 56pt, text buttons either side.
  bar: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  barButton: {
    minWidth: size.minHitTarget,
    minHeight: size.minHitTarget,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  barButtonRight: {
    alignItems: "flex-end",
  },
  barButtonText: {
    ...textStyle({ size: 17, weight: 400 }),
  },
  barButtonDone: {
    ...textStyle({ size: 17, weight: 600 }),
  },
  title: {
    flex: 1,
    textAlign: "center",
    ...textStyle({ size: 17, weight: 600 }),
  },
  input: {
    flex: 1,
    ...textStyle({ ...type.body, lineHeight: 1.6 }),
    paddingHorizontal: 20,
    paddingTop: 16,
    ...Platform.select({
      android: { paddingBottom: 8 },
    }),
  },
});
