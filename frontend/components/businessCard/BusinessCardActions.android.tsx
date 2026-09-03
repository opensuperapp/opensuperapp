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
import OpenInWalletButton from "@/components/businessCard/OpenInWalletButton";
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
  // Whether this device has saved the card to Google Wallet. Google offers no
  // way to ask what a wallet holds, so this is what the app last did, not what
  // is actually there — which is why onAddAgain has to exist here.
  passInWallet: boolean;
  onSavePass: () => void;
  onOpenWallet: () => void;
  onAddAgain: () => void;
  onShareVCard: () => void;
  onSaveAsImage: () => void;
};

const BusinessCardActions = ({
  saving,
  walletDownloadEnabled,
  passInWallet,
  onSavePass,
  onOpenWallet,
  onAddAgain,
  onShareVCard,
  onSaveAsImage,
}: Props) => (
  <BusinessCardActionsFooter
    onShareVCard={onShareVCard}
    onSaveAsImage={onSaveAsImage}
    onAddAgain={walletDownloadEnabled && passInWallet ? onAddAgain : undefined}
  >
    {walletDownloadEnabled ? (
      // Saving a card Google Wallet already has just walks the employee back
      // through Google's save screen to no effect, so once it is there the
      // useful action is opening it instead.
      passInWallet ? (
        <OpenInWalletButton
          label="Open in Google Wallet"
          onPress={onOpenWallet}
        />
      ) : (
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
      )
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
