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
import { Colors } from "@/constants/Colors";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useColorScheme,
  View,
} from "react-native";


// Props for the text prompt dialog component.
type TextPromptDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

/**
 * Cross-platform modal with a single-line text field and Cancel / OK actions.
 * @param props - Dialog visibility, copy, default value, and callbacks.
 * @returns {JSX.Element} Modal prompt UI.
 */
const TextPromptDialog = ({
  visible,
  title,
  message,
  defaultValue = "",
  placeholder,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: TextPromptDialogProps) => {
  const colorScheme = useColorScheme() ?? "light";
  const styles = createStyles(colorScheme);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (visible) {
      setValue(defaultValue);
    }
  }, [visible, defaultValue]);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onConfirm(trimmed);
    }
    onCancel();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.card}>
                <Text style={styles.title}>{title}</Text>
                {message ? <Text style={styles.message}>{message}</Text> : null}
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  placeholder={placeholder ?? message}
                  placeholderTextColor={Colors[colorScheme].mutedTextColor}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={styles.input}
                  selectionColor={Colors.companyOrange}
                />
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.button, styles.cancelButton]}
                    onPress={onCancel}
                  >
                    <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.button, styles.confirmButton]}
                    onPress={handleConfirm}
                  >
                    <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (colorScheme: "light" | "dark") => {
  const isLight = colorScheme === "light";

  return StyleSheet.create({
    keyboardView: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: isLight ? "rgba(15, 23, 42, 0.55)" : "rgba(0, 0, 0, 0.72)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    card: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: isLight
        ? Colors.light.primaryBackgroundColor
        : Colors.dark.secondaryBackgroundColor,
      padding: 24,
      ...Platform.select({
        ios: {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isLight ? 0.2 : 0.45,
          shadowRadius: 16,
        },
        android: {
          elevation: 12,
        },
      }),
    },
    title: {
      fontSize: 18,
      fontWeight: "bold",
      color: isLight
        ? Colors.light.text
        : Colors.dark.ternaryTextColor,
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      color: isLight
        ? Colors.light.secondaryTextColor
        : Colors.dark.ternaryTextColor,
      marginBottom: 12,
      lineHeight: 20,
    },
    input: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: isLight
        ? Colors.light.text
        : Colors.dark.ternaryTextColor,
      backgroundColor: isLight
        ? Colors.light.ternaryBackgroundColor
        : Colors.dark.ternaryBackgroundColor,
      marginBottom: 20,
    },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
    },
    button: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      minWidth: 88,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: isLight
        ? Colors.light.ternaryBackgroundColor
        : Colors.dark.ternaryBackgroundColor,
    },
    confirmButton: {
      backgroundColor: Colors.companyOrange,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: isLight
        ? Colors.light.text
        : Colors.dark.ternaryTextColor,
    },
    confirmButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
    },
  });
};

export default TextPromptDialog;
