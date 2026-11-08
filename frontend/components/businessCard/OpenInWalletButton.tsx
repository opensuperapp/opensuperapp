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
import { radius, size, textStyle, type } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  label: string;
  onPress: () => void;
};

/**
 * The card footer's primary action once the card is already in the wallet.
 *
 * Deliberately not Apple's PKAddPassButton or Google's "Add to Google Wallet"
 * artwork: both vendors' controls mean "add", and both sets of brand
 * guidelines forbid relabelling them, so an "Open" action drawn in their
 * artwork would be both wrong and against the rules. Plain app chrome instead,
 * outlined rather than filled so it does not compete with the add button it
 * replaces.
 *
 * Shared by both platform action files because only the label differs — the
 * vendor-specific sizing rules that force those two files apart do not apply
 * to a button that is neither vendor's.
 *
 * @param {Props} props - Button label and press handler.
 * @returns The outlined open-in-wallet button.
 */
const OpenInWalletButton = ({ label, onPress }: Props) => {
  const { colors } = useBrandTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { borderColor: colors.line2 },
        pressed && { backgroundColor: colors.card2 },
      ]}
      accessibilityRole="button"
      accessibilityLabel="open_wallet_app"
      accessibilityHint={label}
    >
      <View style={styles.content}>
        <BrandIcon name="wallet" size={22} color={colors.text} />
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      </View>
    </Pressable>
  );
};

export default OpenInWalletButton;

// The prototype's ghost .btn: line2 outline, text-coloured label.
const styles = StyleSheet.create({
  button: {
    alignSelf: "stretch",
    height: size.buttonPrimaryHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.buttonPrimary,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  label: {
    ...textStyle({ ...type.storeRowName, tracking: -0.01 }),
  },
});
