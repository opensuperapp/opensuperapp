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
import { ActionSheetIOS, Alert, type AlertButton } from "react-native";

// Android's AlertDialog shows at most a neutral, a negative and a positive button.
const ANDROID_ALERT_MAX_BUTTONS = 3;
const MORE_ACTIONS_LABEL = "More…";

/** One entry of a native action menu. */
export interface ChatMenuAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

/**
 * Native action menu: an action sheet on iOS, an alert with buttons on Android.
 *
 * Android's alert has three button slots (neutral, negative, positive) and drops any
 * extra button. A destructive action takes the neutral slot, apart from the others and
 * never the primary one. Cancel takes the negative slot when there is room; with three
 * actions it is left out and the dialog is dismissed with back or a tap outside. Past
 * three, the last slot opens the rest as a second menu.
 *
 * @param {string | undefined} title - Menu title (the item it acts on).
 * @param {ChatMenuAction[]} actions - Actions in display order; a Cancel is added.
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

  const ordered = [
    ...actions.filter((action) => action.destructive),
    ...actions.filter((action) => !action.destructive),
  ];
  const toButton = (action: ChatMenuAction): AlertButton => ({
    text: action.label,
    style: action.destructive ? "destructive" : undefined,
    onPress: action.onPress,
  });
  const cancel: AlertButton = {
    text: ChatSessionAction.Cancel,
    style: "cancel",
  };

  // RN fills the slots from the end: the last button is positive, the one before it
  // negative, and the first of three neutral.
  let buttons: AlertButton[];
  if (ordered.length <= 2) {
    const last = ordered[ordered.length - 1];
    buttons = [...ordered.slice(0, -1).map(toButton), cancel, toButton(last)];
  } else if (ordered.length === ANDROID_ALERT_MAX_BUTTONS) {
    buttons = ordered.map(toButton);
  } else {
    buttons = [
      ...ordered.slice(0, ANDROID_ALERT_MAX_BUTTONS - 1).map(toButton),
      {
        text: MORE_ACTIONS_LABEL,
        onPress: () =>
          showChatActionMenu(
            title,
            ordered.slice(ANDROID_ALERT_MAX_BUTTONS - 1),
            tintColor
          ),
      },
    ];
  }

  Alert.alert(title ?? "", undefined, buttons, { cancelable: true });
};
