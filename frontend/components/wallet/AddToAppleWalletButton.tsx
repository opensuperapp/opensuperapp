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
import { APPLE_ADD_PASS_BUTTON } from "@/constants/WalletButton";
import {
  AddPassButtonStyle,
  AppleWalletButtonView,
} from "@/modules/apple-wallet-button";
import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";

type Props = {
  /** Called on the control's own touch-up; there is no separate tap target. */
  onPress: () => void;
  /** `black` (default) for light backgrounds, `blackOutline` for dark ones. */
  addPassButtonStyle?: AddPassButtonStyle;
  /** Layout only. The height is fixed here; pass a width or `alignSelf`. */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

// Apple's badge artwork is for "web pages and emails, or printed materials"
// only; the Add to Apple Wallet guidelines say "for apps, use the
// PKAddPassButton class" (https://developer.apple.com/wallet/add-to-apple-wallet-guidelines/),
// which is what @/modules/apple-wallet-button exposes. So there is nothing to
// draw here and nothing to style: the system owns the artwork, the label and
// its localisation, and it is already an accessibility element with the button
// trait and its own localised label. The only decision left is the frame.
export default function AddToAppleWalletButton({
  onPress,
  addPassButtonStyle = "black",
  style,
  accessibilityLabel,
}: Props) {
  // Null on a build without the native module — see the module's index.ts. The
  // footer's other save affordances stay, and nothing stands in for the
  // control, because only Apple's own control may offer this action in an app.
  if (!AppleWalletButtonView) {
    return null;
  }

  return (
    <AppleWalletButtonView
      addPassButtonStyle={addPassButtonStyle}
      // The native event carries no payload; callers want a bare handler.
      onAddPassPress={() => onPress()}
      style={[styles.button, style]}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    // At or above the control's intrinsic height it draws its content at full
    // size and centres it vertically; below, it scales the glyph and label
    // down. Width is left to the caller — the control fills whatever it gets.
    height: APPLE_ADD_PASS_BUTTON.height,
  },
});
