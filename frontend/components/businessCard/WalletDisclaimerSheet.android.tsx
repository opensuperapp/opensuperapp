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
  GOOGLE_WALLET_DISCLAIMER_MD,
  GOOGLE_WALLET_DISCLAIMER_TITLE,
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
 * What putting this card in Google Wallet actually does with employee data.
 *
 * The card is made of employee data — name, title, department, work contact
 * details, directory photo — and an employee is entitled to read what happens
 * to it before deciding to add the card. This sheet is that document, reachable
 * from the card's action row rather than thrown in front of the wallet button:
 * it informs, it does not gate, so the only control it needs is a way out.
 *
 * The disclosure carries more weight here than on iOS. An Apple pass is signed
 * by WSO2 and stays on the device; a Google pass is an object stored and
 * rendered on Google's own servers, which also fetch the directory photo from
 * us. Saving really does hand those fields to a third party, so the Google copy
 * says so and the Apple copy does not. See WalletDisclaimer.ts.
 *
 * A bottom sheet rather than the iOS page sheet: Android has no page-sheet
 * presentation, and the platform's own informational surfaces are anchored to
 * the bottom edge, near the thumb, over a dimmed backdrop that is itself a way
 * out.
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
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrapper} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{GOOGLE_WALLET_DISCLAIMER_TITLE}</Text>
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
              {GOOGLE_WALLET_DISCLAIMER_MD}
            </Markdown>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default WalletDisclaimerSheet;

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: Colors[colorScheme].overLayColor,
    },
    sheetWrapper: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheet: {
      // Capped rather than sized to the copy: the disclosure is long enough to
      // fill a phone screen, and a sheet that covers everything stops reading
      // as a sheet you can back out of.
      maxHeight: "85%",
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
      borderTopLeftRadius: Styles.BorderRadius.large,
      borderTopRightRadius: Styles.BorderRadius.large,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: Styles.Padding.default,
      paddingTop: Styles.Padding.default,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Colors[colorScheme].borderColor,
    },
    title: {
      fontSize: 17,
      fontWeight: "600",
      color: Colors[colorScheme].text,
      // The close control has to keep its corner however long the title runs.
      flexShrink: 1,
      marginRight: Styles.Padding.medium,
    },
    // flexShrink rather than flex, so the sheet is as tall as its copy up to
    // the maxHeight above instead of always filling it.
    scroll: {
      flexShrink: 1,
    },
    scrollContent: {
      paddingHorizontal: Styles.Padding.default,
      paddingTop: Styles.Padding.small,
    },
  });
