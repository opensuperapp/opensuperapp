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
import React, { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface EditMessageModalProps {
  visible: boolean;
  initialContent: string;
  theme: ChatThemePalette;
  onSave: (content: string) => void;
  onClose: () => void;
}

/**
 * Modal for editing a previously sent user message.
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

  useEffect(() => {
    if (visible) {
      setContent(initialContent);
    }
  }, [visible, initialContent]);

  const handleSave = () => {
    const trimmed = content.trim();
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
          <Text style={[styles.title, { color: theme.assistantText }]}>
            Edit message
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
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={5000}
            autoFocus
          />
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.textBtn}>
              <Text style={[styles.cancelText, { color: theme.muted }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: theme.accentMuted }]}
            >
              <Text style={styles.saveText}>Save & resend</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EditMessageModal;

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
  title: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 14,
  },
  input: {
    minHeight: 100,
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
    textAlignVertical: "top",
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
  },
  saveText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
