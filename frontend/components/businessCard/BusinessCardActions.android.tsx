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
import BusinessCardActionsFooter from "@/components/businessCard/BusinessCardActionsFooter";
import AddToGoogleWalletButton from "@/components/wallet/AddToGoogleWalletButton";
import {
  GOOGLE_WALLET_BUTTON,
  GOOGLE_WALLET_BUTTON_ASPECT_RATIO,
} from "@/constants/WalletButton";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

type Props = {
  saving: boolean;
  walletDownloadEnabled: boolean;
  // Accepted so both platform files take the same props, and deliberately
  // unused here, along with onOpenWallet and onAddAgain. Google offers no way
  // to ask what a wallet holds, so this could only ever be a marker of what
  // this device last did — and acting on it took the add button away from an
  // employee whose card is not actually there. See below.
  passInWallet: boolean;
  onSavePass: () => void;
  onOpenWallet: () => void;
  onAddAgain: () => void;
  onShareVCard: () => void;
  onSaveAsImage: () => void;
  // Opens the disclaimer describing what the wallet does with the card. Only
  // reachable when the wallet download is on; see BusinessCardActionsFooter.
  onShowDisclaimer: () => void;
};

const BusinessCardActions = ({
  saving,
  walletDownloadEnabled,
  onSavePass,
  onShareVCard,
  onSaveAsImage,
  onShowDisclaimer,
}: Props) => (
  <BusinessCardActionsFooter
    onShareVCard={onShareVCard}
    onSaveAsImage={onSaveAsImage}
    onShowDisclaimer={walletDownloadEnabled ? onShowDisclaimer : undefined}
  >
    {walletDownloadEnabled ? (
      // Always the add button, never an "Open in Google Wallet" one. There is
      // no Google Wallet app to open on Android: the save URL is a web link, so
      // that button dropped the employee into a browser rather than the wallet
      // it named. And because Google cannot be asked what a wallet holds, the
      // presence it was keyed on was only ever a note of what this device last
      // did — so a card deleted from Google Wallet, or added on another device,
      // left the employee with a browser link and no way to add it. Saving a
      // card Google already has is the harmless case here; losing the add
      // button is not, which is also why there is no "Add again" link.
      <Pressable
        onPress={onSavePass}
        disabled={saving}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="save_business_card"
        // The label is baked into Google's artwork, so spell it out for
        // TalkBack rather than leaving the artwork to be announced.
        accessibilityHint="Adds your business card to Google Wallet"
        accessibilityState={{ disabled: saving }}
      >
        {saving ? (
          // Dimming or tinting the button is not allowed, so the pending state
          // replaces it with a spinner in a box of exactly the same footprint
          // instead of drawing over it.
          <View style={styles.pending}>
            <ActivityIndicator />
          </View>
        ) : (
          // Google's unmodified official primary button, as vector artwork.
          // GPASS.md forbids recolouring it, altering its font, radius or
          // padding, and free-scaling it, so it is drawn at its intrinsic
          // 283x50 and never stretched to the footer width.
          <AddToGoogleWalletButton
            height={GOOGLE_WALLET_BUTTON.intrinsicHeight}
          />
        )}
      </Pressable>
    ) : undefined}
  </BusinessCardActionsFooter>
);

export default BusinessCardActions;

const styles = StyleSheet.create({
  button: {
    // "Always maintain the minimum clear space of 8 dp on all sides."
    padding: GOOGLE_WALLET_BUTTON.clearSpace,
  },
  pending: {
    height: GOOGLE_WALLET_BUTTON.intrinsicHeight,
    width:
      GOOGLE_WALLET_BUTTON.intrinsicHeight * GOOGLE_WALLET_BUTTON_ASPECT_RATIO,
    alignItems: "center",
    justifyContent: "center",
  },
});
