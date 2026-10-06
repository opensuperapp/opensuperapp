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
import AddToAppleWalletButton from "@/components/wallet/AddToAppleWalletButton";
import { APPLE_ADD_PASS_BUTTON } from "@/constants/WalletButton";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

type Props = {
  saving: boolean;
  walletDownloadEnabled: boolean;
  // Whether Apple Wallet already holds this card. PassKit is asked directly,
  // so this is the wallet's own answer rather than something remembered.
  passInWallet: boolean;
  onSavePass: () => void;
  onOpenWallet: () => void;
  // Accepted so both platform files take the same props, and deliberately
  // unused here: PassKit answers the presence question itself, so "Add again"
  // could only offer to re-add a card iOS has just confirmed is installed.
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
  onShareVCard,
  onSaveAsImage,
}: Props) => (
  <BusinessCardActionsFooter
    onShareVCard={onShareVCard}
    onSaveAsImage={onSaveAsImage}
  >
    {walletDownloadEnabled ? (
      // Adding a pass that is already installed re-opens the same "Add"
      // sheet and does nothing, so once Wallet has the card the add button
      // has no work left to do and the useful action is opening it.
      passInWallet ? (
        <OpenInWalletButton
          label="Open in Apple Wallet"
          onPress={onOpenWallet}
        />
      ) : saving ? (
        // "Do not display a dimmed version of the badge" — and PKAddPassButton
        // is a system control we may not restyle at all, so the pending state
        // takes it off screen and puts a spinner of the same footprint in its
        // place rather than fading or overlaying it. There is nothing to tap
        // while it is gone, hence no onPress here.
        <View
          style={styles.pending}
          accessibilityRole="button"
          accessibilityLabel="save_business_card"
          accessibilityState={{ disabled: true }}
        >
          <ActivityIndicator />
        </View>
      ) : (
        // No Pressable around it: the control handles its own touches and
        // reports them through the module's onPress. No accessibilityRole and
        // no accessibilityHint either — PKAddPassButton is itself an
        // accessibility element carrying the button trait and a
        // system-localised "Add to Apple Wallet" label, and a role or hint on
        // the React Native container would only double-announce what the
        // system already says. The label stays as the handle other code and
        // the tests reach the wallet affordance by.
        <AddToAppleWalletButton
          onPress={onSavePass}
          style={styles.button}
          accessibilityLabel="save_business_card"
        />
      )
    ) : undefined}
  </BusinessCardActionsFooter>
);

export default BusinessCardActions;

const styles = StyleSheet.create({
  button: {
    // PKAddPassButton is resizable: its background fills the frame and the
    // glyph and label stay centred, so it takes the footer's full width. Past
    // APPLE_ADD_PASS_BUTTON.oneLineWidth that is the one-line layout.
    alignSelf: "stretch",
  },
  pending: {
    height: APPLE_ADD_PASS_BUTTON.height,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
});
