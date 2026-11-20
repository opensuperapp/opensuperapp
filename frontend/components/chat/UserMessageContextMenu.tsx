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
import { textStyle } from "@/constants/brand";
import { ChatThemePalette } from "@/constants/ChatTheme";
import React from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface MessageContextMenuAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UserMessageContextMenuProps {
  visible: boolean;
  anchor: MessageContextMenuAnchor | null;
  theme: ChatThemePalette;
  onEdit?: () => void;
  onCopy?: () => void;
  onDismiss: () => void;
}

const MENU_HEIGHT = 44;
const MENU_GAP = 8;
const HORIZONTAL_PADDING = 16;

/**
 * Tooltip-style action menu for user messages (edit and copy).
 *
 * @param {UserMessageContextMenuProps} props - Anchor position and handlers.
 * @returns {JSX.Element | null} Context menu overlay.
 */
const UserMessageContextMenu = ({
  visible,
  anchor,
  theme,
  onEdit,
  onCopy,
  onDismiss,
}: UserMessageContextMenuProps): JSX.Element | null => {
  if (!visible || !anchor) {
    return null;
  }

  const screenWidth = Dimensions.get("window").width;
  const actionCount = (onEdit ? 1 : 0) + (onCopy ? 1 : 0);
  const menuWidth = actionCount * 88 + (actionCount - 1) * 1;
  const menuLeft = Math.min(
    Math.max(anchor.x + anchor.width - menuWidth, HORIZONTAL_PADDING),
    screenWidth - menuWidth - HORIZONTAL_PADDING
  );
  const menuTop = Math.max(anchor.y - MENU_HEIGHT - MENU_GAP, HORIZONTAL_PADDING);

  const handleEdit = () => {
    onDismiss();
    onEdit?.();
  };

  const handleCopy = () => {
    onDismiss();
    onCopy?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        <View
          style={[
            styles.menu,
            {
              top: menuTop,
              left: menuLeft,
              width: menuWidth,
              backgroundColor: theme.card,
              borderColor: theme.inputBorder,
            },
          ]}
        >
          {onEdit && (
            <TouchableOpacity
              style={styles.action}
              onPress={handleEdit}
              accessibilityLabel="Edit message"
              accessibilityRole="button"
            >
              <BrandIcon name="edit" size={18} color={theme.accent} />
              <Text style={[styles.actionText, { color: theme.accent }]}>
                Edit
              </Text>
            </TouchableOpacity>
          )}
          {onEdit && onCopy && (
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          )}
          {onCopy && (
            <TouchableOpacity
              style={styles.action}
              onPress={handleCopy}
              accessibilityLabel="Copy message"
              accessibilityRole="button"
            >
              <BrandIcon name="copy" size={18} color={theme.accent} />
              <Text style={[styles.actionText, { color: theme.accent }]}>
                Copy
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default UserMessageContextMenu;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menu: {
    position: "absolute",
    height: MENU_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: "100%",
  },
  actionText: {
    ...textStyle({ size: 14, weight: 500 }),
  },
  divider: {
    width: 1,
    height: "60%",
  },
});
