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
import {
  CHAT_RENAME_MODAL_TITLE,
  CHAT_RENAME_PLACEHOLDER,
  CHAT_SESSION_TITLE_MAX_LENGTH,
} from "@/constants/Constants";
import { radius, textStyle } from "@/constants/brand";
import { ChatThemePalette } from "@/constants/ChatTheme";
import React, { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface RenameSessionModalProps {
  visible: boolean;
  initialTitle: string;
  theme: ChatThemePalette;
  onSave: (title: string) => void;
  onClose: () => void;
}

/**
 * Modal for renaming a chat session.
 *
 * @param {RenameSessionModalProps} props - Visibility, title, and handlers.
 * @returns {JSX.Element} Rename session modal.
 */
const RenameSessionModal = ({
  visible,
  initialTitle,
  theme,
  onSave,
  onClose,
}: RenameSessionModalProps): JSX.Element => {
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
    }
  }, [visible, initialTitle]);

  const handleSave = () => {
    const trimmed = title.trim();
    if (trimmed) {
      onSave(trimmed);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.backdrop }]}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: theme.sheet,
              borderColor: theme.inputBorder,
            },
          ]}
        >
          <Text style={[styles.heading, { color: theme.assistantText }]}>
            {CHAT_RENAME_MODAL_TITLE}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.assistantText,
                backgroundColor: theme.inputSurface,
                borderColor: theme.inputBorder,
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder={CHAT_RENAME_PLACEHOLDER}
            placeholderTextColor={theme.subtle}
            selectionColor={theme.highlight}
            maxLength={CHAT_SESSION_TITLE_MAX_LENGTH}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.textBtn}>
              <Text style={[styles.cancelText, { color: theme.accent }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.saveBtn,
                { backgroundColor: theme.signal },
                !title.trim() && styles.disabled,
              ]}
              disabled={!title.trim()}
            >
              <Text style={[styles.saveText, { color: theme.onSignal }]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default RenameSessionModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  dialog: {
    borderRadius: radius.sheetTop,
    padding: 20,
    borderWidth: 1,
  },
  heading: {
    ...textStyle({ size: 18, weight: 600, tracking: -0.025 }),
    marginBottom: 14,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...textStyle({ size: 16, weight: 400 }),
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  textBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  cancelText: {
    ...textStyle({ size: 15, weight: 500 }),
  },
  saveBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 20,
    borderRadius: radius.buttonSmall,
  },
  disabled: {
    opacity: 0.5,
  },
  saveText: {
    ...textStyle({ size: 15, weight: 600 }),
  },
});
