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
import { isIos } from "@/constants/Constants";
import { ChatSessionAction } from "@/constants/enums/Chat";
import { ActionSheetIOS, Alert } from "react-native";

/** One entry of a native action menu. */
export interface ChatMenuAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

/**
 * Native action menu: an action sheet on iOS, an alert with buttons on Android.
 *
 * @param {string | undefined} title - Menu title (the item it acts on).
 * @param {ChatMenuAction[]} actions - Actions in display order; a Cancel is appended.
 * @param {string} [tintColor] - Brand tint for the iOS sheet's buttons.
 */
export const showChatActionMenu = (
  title: string | undefined,
  actions: ChatMenuAction[],
  tintColor?: string
): void => {
  if (actions.length === 0) {
    return;
  }

  if (isIos) {
    const destructiveButtonIndex = actions
      .map((action, index) => (action.destructive ? index : -1))
      .filter((index) => index >= 0);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [
          ...actions.map((action) => action.label),
          ChatSessionAction.Cancel,
        ],
        cancelButtonIndex: actions.length,
        destructiveButtonIndex,
        tintColor,
      },
      (index) => actions[index]?.onPress()
    );
    return;
  }

  Alert.alert(
    title ?? "",
    undefined,
    [
      ...actions.map((action) => ({
        text: action.label,
        style: action.destructive ? ("destructive" as const) : undefined,
        onPress: action.onPress,
      })),
      { text: ChatSessionAction.Cancel, style: "cancel" as const },
    ],
    { cancelable: true }
  );
};
