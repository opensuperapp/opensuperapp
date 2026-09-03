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
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

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
  const colorScheme = useColorScheme() ?? "light";
  const styles = createStyles(colorScheme);

  return (
    <Pressable
      onPress={onPress}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="open_wallet_app"
      accessibilityHint={label}
    >
      <View style={styles.content}>
        <Ionicons
          name="wallet-outline"
          size={18}
          color={Colors[colorScheme].primaryTextColor}
        />
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
};

export default OpenInWalletButton;

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    button: {
      alignSelf: "stretch",
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: Styles.BorderRadius.medium,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: Colors[colorScheme].modalBorderColor,
      backgroundColor: Colors[colorScheme].secondaryBackgroundColor,
      paddingVertical: 12,
      paddingHorizontal: Styles.Padding.default,
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      gap: Styles.Padding.small,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: Colors[colorScheme].primaryTextColor,
    },
  });
