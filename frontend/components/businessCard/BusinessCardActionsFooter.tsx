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
import { brand, radius, size, textStyle, type } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import React, { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  onShareVCard: () => void;
  onSaveAsImage: () => void;
  // Opens the platform's wallet disclaimer. Passed only where there is a wallet
  // download to disclose anything about: with the remote config flag off the
  // card never reaches a wallet, so a notice explaining what a wallet does with
  // it would be describing something that cannot happen.
  onShowDisclaimer?: () => void;
  // The wallet affordance itself. Apple and Google both ship their own button
  // artwork with their own sizing rules, so each platform file supplies it and
  // only this chrome is shared. When the wallet pass is disabled there is no
  // vendor button to show, and "Save image" takes over the primary slot
  // instead of being demoted to a secondary link.
  children?: ReactNode;
};

const BusinessCardActionsFooter = ({
  onShareVCard,
  onSaveAsImage,
  onShowDisclaimer,
  children,
}: Props) => {
  const { colors } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const hasWallet = children !== undefined;
  const linkText = [styles.linkText, { color: colors.cobalt }];

  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.walletSlot}>
        {hasWallet ? (
          children
        ) : (
          <Pressable
            onPress={onSaveAsImage}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: pressed ? brand.flare : colors.primaryFill,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="save_card_image"
            accessibilityHint="Saves your business card as an image"
          >
            <Text
              style={[styles.primaryButtonText, { color: colors.primaryText }]}
            >
              Save image
            </Text>
          </Pressable>
        )}
      </View>

      {/* Links inside the card sheet take the cobalt token, per the handoff. */}
      <View style={styles.links}>
        <Pressable
          onPress={onShareVCard}
          hitSlop={8}
          style={styles.link}
          accessibilityRole="button"
          accessibilityLabel="share_contact_file"
        >
          <BrandIcon name="share" size={18} color={colors.cobalt} />
          <Text style={linkText}>Share contact file</Text>
        </Pressable>
        {hasWallet && (
          <Pressable
            onPress={onSaveAsImage}
            hitSlop={8}
            style={styles.link}
            accessibilityRole="button"
            accessibilityLabel="save_card_image"
          >
            <BrandIcon name="download" size={18} color={colors.cobalt} />
            <Text style={linkText}>Save as image</Text>
          </Pressable>
        )}
      </View>

      {/* Its own row under the links rather than a third item in theirs. The
          links are actions on the card; this one opens a document about it. */}
      {onShowDisclaimer && (
        <Pressable
          onPress={onShowDisclaimer}
          hitSlop={8}
          style={[styles.link, styles.disclaimer]}
          accessibilityRole="button"
          accessibilityLabel="view_wallet_disclaimer"
          accessibilityHint="Shows what goes on your wallet card and how the details are handled"
        >
          <BrandIcon name="info" size={18} color={colors.cobalt} />
          <Text style={linkText}>Privacy</Text>
        </Pressable>
      )}
    </View>
  );
};

export default BusinessCardActionsFooter;

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  walletSlot: {
    alignItems: "center",
  },
  // The prototype's primary .btn: Signal fill, Ink label, 54 high.
  primaryButton: {
    width: "100%",
    height: size.buttonPrimaryHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.buttonPrimary,
  },
  primaryButtonText: {
    ...textStyle({ ...type.storeRowName, tracking: -0.01 }),
  },
  links: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 20,
    marginTop: 16,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  disclaimer: {
    alignSelf: "center",
    marginTop: 4,
  },
  linkText: {
    ...textStyle({ size: 14, weight: 500 }),
  },
});
