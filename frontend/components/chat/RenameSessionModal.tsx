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
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
        <View
          style={[
            styles.dialog,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
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
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder={CHAT_RENAME_PLACEHOLDER}
            placeholderTextColor={theme.muted}
            maxLength={CHAT_SESSION_TITLE_MAX_LENGTH}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.textBtn}>
              <Text style={[styles.cancelText, { color: theme.muted }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: theme.accent }]}
              disabled={!title.trim()}
            >
              <Text style={styles.saveText}>Save</Text>
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
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  heading: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 14,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  textBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cancelText: {
    fontSize: 15,
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    opacity: 1,
  },
  saveText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
