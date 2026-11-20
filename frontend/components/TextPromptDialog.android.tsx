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
  radius,
  soraFamily,
  textStyle,
  type,
  type ThemeColors,
} from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  TouchableWithoutFeedback,
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
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  onConfirm: (value: string) => void;
  onClose: () => void;
  onCancel?: () => void;
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
  autoCapitalize = "none",
  autoCorrect = false,
  keyboardType = "url",
  onConfirm,
  onClose,
  onCancel,
}: TextPromptDialogProps) => {
  const { colors } = useBrandTheme();
  const styles = createStyles(colors);
  const [value, setValue] = useState(defaultValue);
  const prevVisible = useRef(false);
  const canConfirm = value.trim().length > 0;

  useEffect(() => {
    if (visible && !prevVisible.current) {
      setValue(defaultValue);
    }
    prevVisible.current = visible;
  }, [visible, defaultValue]);

  const handleDismiss = () => {
    onCancel?.();
    onClose();
  };

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    onConfirm(trimmed);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.card}>
                <Text style={styles.title}>{title}</Text>
                {message ? <Text style={styles.message}>{message}</Text> : null}
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  placeholder={placeholder ?? message}
                  placeholderTextColor={colors.text3}
                  autoCapitalize={autoCapitalize}
                  autoCorrect={autoCorrect}
                  keyboardType={keyboardType}
                  autoFocus
                  style={styles.input}
                  selectionColor={colors.accent}
                />
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.button, styles.cancelButton]}
                    onPress={handleDismiss}
                  >
                    <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.button,
                      styles.confirmButton,
                      !canConfirm && styles.confirmButtonDisabled,
                    ]}
                    onPress={handleConfirm}
                    disabled={!canConfirm}
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    keyboardView: {
      flex: 1,
    },
    overlay: {
      flex: 1,
      backgroundColor: colors.backdrop,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    card: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: colors.card,
      borderRadius: radius.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
      padding: 24,
      ...Platform.select({
        ios: {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.35,
          shadowRadius: 24,
        },
        android: {
          elevation: 12,
        },
      }),
    },
    title: {
      ...textStyle(type.pushedTitle),
      color: colors.text,
      marginBottom: 8,
    },
    message: {
      fontFamily: soraFamily[400],
      fontSize: 14,
      color: colors.text2,
      marginBottom: 12,
      lineHeight: 20,
    },
    input: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: soraFamily[400],
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.field,
      borderWidth: 1,
      borderColor: colors.line2,
      borderRadius: radius.input,
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
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: radius.buttonSmall,
    },
    cancelButton: {
      backgroundColor: colors.card2,
    },
    confirmButton: {
      backgroundColor: colors.primaryFill,
    },
    confirmButtonDisabled: {
      opacity: 0.45,
    },
    cancelButtonText: {
      fontFamily: soraFamily[600],
      fontSize: 16,
      color: colors.text,
    },
    confirmButtonText: {
      fontFamily: soraFamily[600],
      fontSize: 16,
      color: colors.primaryText,
    },
  });

export default TextPromptDialog;
