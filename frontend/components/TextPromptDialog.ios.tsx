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
import { useEffect, useRef } from "react";
import { Alert, type TextInputProps } from "react-native";

// Props for the text prompt dialog component.
type TextPromptDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // The native prompts have no capitalisation or autocorrect switches; these are
  // kept so callers don't change, and are ignored.
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  onConfirm: (value: string) => void;
  onClose: () => void;
  onCancel?: () => void;
};

/**
 * iOS's own single-line text prompt (`Alert.prompt`) with Cancel / OK actions.
 * Android keeps the in-app dialog (TextPromptDialog.android.tsx): there is no
 * maintained native prompt for the New Architecture.
 *
 * Still driven by `visible`, so callers stay declarative: the prompt opens each time
 * `visible` turns true and renders nothing itself. A native prompt can't disable its
 * OK button, so confirming an empty value behaves as Cancel.
 * @param props - Dialog visibility, copy, default value, and callbacks.
 * @returns {null} The prompt is native; nothing renders in the tree.
 */
const TextPromptDialog = ({
  visible,
  title,
  message,
  defaultValue = "",
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  keyboardType = "url",
  onConfirm,
  onClose,
  onCancel,
}: TextPromptDialogProps) => {
  // Read when a button is pressed, not when the prompt opens, so a caller passing
  // fresh closures each render still gets the current ones called.
  const callbacks = useRef({ onConfirm, onClose, onCancel });
  callbacks.current = { onConfirm, onClose, onCancel };
  const prevVisible = useRef(false);

  useEffect(() => {
    const opening = visible && !prevVisible.current;
    prevVisible.current = visible;
    if (!opening) {
      return;
    }

    const handleDismiss = () => {
      callbacks.current.onCancel?.();
      callbacks.current.onClose();
    };

    const handleConfirm = (value?: string) => {
      const trimmed = (value ?? "").trim();
      if (!trimmed) {
        handleDismiss();
        return;
      }
      callbacks.current.onConfirm(trimmed);
      callbacks.current.onClose();
    };

    const buttons = [
      { text: cancelLabel, style: "cancel" as const, onPress: handleDismiss },
      { text: confirmLabel, onPress: handleConfirm },
    ];

    Alert.prompt(
      title,
      message,
      buttons,
      "plain-text",
      defaultValue,
      keyboardType,
    );
  }, [
    visible,
    title,
    message,
    defaultValue,
    confirmLabel,
    cancelLabel,
    keyboardType,
  ]);

  return null;
};

export default TextPromptDialog;
