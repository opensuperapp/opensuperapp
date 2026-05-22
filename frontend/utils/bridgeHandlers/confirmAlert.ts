// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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
import { BridgeFunction } from "../../types/bridge.types";
import { Alert } from "react-native";
/**
 * Bridge handler: confirm_alert
 *
 * Params: { title, message, cancelButtonText, confirmButtonText }
 * Resolves: "confirm" or "cancel" depending on user choice
 * Rejects: none
 * Side effects: displays a native alert dialog
 * Error modes: none (Alert API handles UI-level errors)
 */
export const BRIDGE_FUNCTION: BridgeFunction = {
  topic: "confirm_alert",
  handler: async (params, context) => {
    const { title, message, cancelButtonText, confirmButtonText } = params;
    Alert.alert(
      title,
      message,
      [
        {
          text: cancelButtonText,
          style: "cancel",
          onPress: () => context.resolve("cancel"),
        },
        {
          text: confirmButtonText,
          onPress: () => context.resolve("confirm"),
        },
      ],
      { cancelable: false }
    );
  }
};
