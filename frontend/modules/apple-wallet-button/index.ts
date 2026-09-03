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

// Local Expo module (autolinked from `modules/`, so it survives the prebuild
// that regenerates the gitignored `ios/`). It wraps PassKit's PKAddPassButton,
// which Apple's badge guidelines require apps to use instead of the Add to
// Apple Wallet badge artwork. iOS only: there is no Android implementation, and
// only `BusinessCardActions.ios.tsx` reaches this file, so Metro never resolves
// it in an Android bundle.
import { requireNativeView, requireOptionalNativeModule } from "expo";
import type { ComponentType } from "react";
import type { StyleProp, ViewStyle } from "react-native";

/** The two cases of `PKAddPassButtonStyle`: PassKit defines no others. */
export type AddPassButtonStyle = "black" | "blackOutline";

export type AppleWalletButtonViewProps = {
  /** `black` for light backgrounds, `blackOutline` for dark ones. */
  addPassButtonStyle?: AddPassButtonStyle;
  /**
   * Fired by the control's own `.touchUpInside`; carries no payload. Not
   * `onPress`: React Native's base iOS view config already claims `topPress`
   * as a bubbling event, and a native view registering it as a direct one
   * trips "Event cannot be both direct and bubbling: topPress" at render.
   */
  onAddPassPress?: (event: { nativeEvent: Record<string, never> }) => void;
  /**
   * The control fills this frame: the background stretches edge to edge and the
   * glyph and label stay centred, so a width is a layout decision. Keep the
   * height at or above `APPLE_ADD_PASS_BUTTON.intrinsicHeight` or the system
   * scales the artwork down.
   */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

const NATIVE_MODULE_NAME = "AppleWalletButton";

function loadNativeView(): ComponentType<AppleWalletButtonViewProps> | null {
  // `requireNativeView` does not fail loudly when the module is absent — it
  // warns and hands back a host component for a native view class that will
  // never exist (Jest, a bundle built before this module landed) — so ask for
  // the module itself first and let callers render nothing.
  if (!requireOptionalNativeModule(NATIVE_MODULE_NAME)) {
    return null;
  }
  return requireNativeView<AppleWalletButtonViewProps>(NATIVE_MODULE_NAME);
}

/** `PKAddPassButton` as a view, or `null` where PassKit's control is absent. */
export const AppleWalletButtonView = loadNativeView();

export const isAppleWalletButtonAvailable = AppleWalletButtonView !== null;
