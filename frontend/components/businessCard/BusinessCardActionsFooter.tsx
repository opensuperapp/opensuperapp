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
import { Colors } from "@/constants/Colors";
import { Styles } from "@/constants/Styles";
import React, { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  onShareVCard: () => void;
  onSaveAsImage: () => void;
  // Shown only once the card is already in the wallet, where the primary slot
  // holds "Open" and there is otherwise no way back to adding it. That case is
  // real on Android, which cannot ask Google Wallet what it holds and so is
  // going on what this device last did; on iOS PassKit answers directly and
  // this is a no-op the employee should never need.
  onAddAgain?: () => void;
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
  onAddAgain,
  children,
}: Props) => {
  const colorScheme = useColorScheme() ?? "light";
  const styles = createStyles(colorScheme);
  const insets = useSafeAreaInsets();
  const hasWallet = children !== undefined;

  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.walletSlot}>
        {hasWallet ? (
          children
        ) : (
          <Pressable
            onPress={onSaveAsImage}
            style={styles.primaryButton}
            accessibilityRole="button"
            accessibilityLabel="save_card_image"
            accessibilityHint="Saves your business card as an image"
          >
            <Text style={styles.primaryButtonText}>Save image</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.secondaryActions}>
        <Pressable
          onPress={onShareVCard}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="share_contact_file"
        >
          <Text style={styles.secondaryActionText}>Share contact file</Text>
        </Pressable>
        {hasWallet && (
          <>
            <Text style={styles.secondaryActionSeparator}>·</Text>
            <Pressable
              onPress={onSaveAsImage}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="save_card_image"
            >
              <Text style={styles.secondaryActionText}>Save as image</Text>
            </Pressable>
          </>
        )}
        {onAddAgain && (
          <>
            <Text style={styles.secondaryActionSeparator}>·</Text>
            <Pressable
              onPress={onAddAgain}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="add_to_wallet_again"
            >
              <Text style={styles.secondaryActionText}>Add again</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
};

export default BusinessCardActionsFooter;

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: Colors[colorScheme].borderColor,
    },
    walletSlot: {
      alignItems: "center",
    },
    primaryButton: {
      backgroundColor: Colors.companyOrange,
      width: "100%",
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: Styles.BorderRadius.medium,
      paddingVertical: 12,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: Colors[colorScheme].primaryBackgroundColor,
    },
    secondaryActions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
    },
    secondaryActionText: {
      fontSize: 14,
      color: Colors.actionButtonTextColor,
    },
    secondaryActionSeparator: {
      marginHorizontal: 10,
      fontSize: 14,
      color: Colors[colorScheme].secondaryTextColor,
    },
  });
