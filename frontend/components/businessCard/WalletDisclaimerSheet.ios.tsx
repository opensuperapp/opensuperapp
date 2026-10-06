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
import { createMarkdownStyles } from "@/components/businessCard/walletDisclaimerStyles";
import { Colors } from "@/constants/Colors";
import { Styles } from "@/constants/Styles";
import {
  APPLE_WALLET_DISCLAIMER_MD,
  APPLE_WALLET_DISCLAIMER_TITLE,
} from "@/constants/WalletDisclaimer";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * What putting this card in Apple Wallet actually does with employee data.
 *
 * The card is made of employee data — name, title, department, work contact
 * details, directory photo — and an employee is entitled to read what happens
 * to it before deciding to add the card. This sheet is that document, reachable
 * from the card's action row rather than thrown in front of the wallet button:
 * it informs, it does not gate, so the only control it needs is a way out.
 *
 * The Apple copy is not the Google copy with a name swapped. A pass here is
 * signed by WSO2 and lands in Wallet on this device, and the only thing Apple
 * carries is a contentless push telling the device to re-fetch — so there is no
 * disclosure to Apple to warn about, and claiming one would be false. See
 * WalletDisclaimer.ts.
 */
const WalletDisclaimerSheet = ({ visible, onClose }: Props) => {
  const colorScheme = useColorScheme() ?? "light";
  const styles = createStyles(colorScheme);
  const markdownStyles = createMarkdownStyles(colorScheme);
  const insets = useSafeAreaInsets();

  // Returning false keeps the library from also opening the URL through its own
  // handler. A mailto: with no mail account behind it rejects — and a privacy
  // notice that crashes on the way to the DPO's address is the worst possible
  // failure here, so the rejection is logged and swallowed.
  const openLink = (url: string) => {
    Linking.openURL(url).catch((error) => {
      console.error("Could not open the wallet disclaimer link.", error);
    });
    return false;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{APPLE_WALLET_DISCLAIMER_TITLE}</Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="close_wallet_disclaimer"
            accessibilityHint="Closes the wallet disclaimer"
          >
            <Ionicons
              name="close"
              size={24}
              color={Colors[colorScheme].secondaryTextColor}
            />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + Styles.Padding.large },
          ]}
        >
          <Markdown style={markdownStyles} onLinkPress={openLink}>
            {APPLE_WALLET_DISCLAIMER_MD}
          </Markdown>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default WalletDisclaimerSheet;

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    sheet: {
      flex: 1,
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: Styles.Padding.default,
      paddingTop: 14,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Colors[colorScheme].borderColor,
    },
    title: {
      fontSize: 17,
      fontWeight: "600",
      color: Colors[colorScheme].text,
      // The title is longer than "Cancel" ever was, and the close control has
      // to keep its corner.
      flexShrink: 1,
      marginRight: Styles.Padding.medium,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: Styles.Padding.default,
      paddingTop: Styles.Padding.small,
    },
  });
