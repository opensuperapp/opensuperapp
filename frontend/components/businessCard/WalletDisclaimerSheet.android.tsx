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
import { GOOGLE_WALLET_DISCLAIMER_MD } from "@/constants/WalletDisclaimer";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
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
  onCancel: () => void;
  onProceed: () => void;
  proceeding: boolean;
};

/**
 * The consent step between tapping the wallet button and the pass being built.
 *
 * The card is made of employee data — name, title, department, work contact
 * details, directory photo — and putting it in a wallet is a processing step
 * the employee should be agreeing to before it happens, not discovering
 * afterwards from a pass that already exists. Tapping "Add to Google Wallet" is
 * a tap, not consent; this screen is what turns it into one.
 *
 * The disclosure carries more weight here than on iOS. An Apple pass is signed
 * by WSO2 and stays on the device; a Google pass is an object stored and
 * rendered on Google's own servers, which also fetch the directory photo from
 * us. Saving really does hand those fields to a third party, so the Google copy
 * says so and the Apple copy does not. See WalletDisclaimer.ts.
 *
 * A bottom sheet rather than the iOS page sheet: Android has no page-sheet
 * presentation, and the platform's own consent surfaces are anchored to the
 * bottom edge, near the thumb, over a dimmed backdrop that is itself a way out.
 */
const WalletDisclaimerSheet = ({
  visible,
  onCancel,
  onProceed,
  proceeding,
}: Props) => {
  const colorScheme = useColorScheme() ?? "light";
  const styles = createStyles(colorScheme);
  const markdownStyles = createMarkdownStyles(colorScheme);
  const insets = useSafeAreaInsets();

  // Returning false keeps the library from also opening the URL through its own
  // handler. A policy link that no longer resolves, or a mailto: with no mail
  // account behind it, rejects — and a consent screen that crashes on the way
  // to the privacy policy is the worst possible failure here, so the rejection
  // is logged and swallowed.
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
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.sheetWrapper} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Before you add this card</Text>
            <Pressable
              onPress={onCancel}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="cancel_wallet_disclaimer"
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
            contentContainerStyle={styles.scrollContent}
          >
            <Markdown style={markdownStyles} onLinkPress={openLink}>
              {GOOGLE_WALLET_DISCLAIMER_MD}
            </Markdown>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <Pressable
              onPress={onProceed}
              disabled={proceeding}
              style={styles.primaryButton}
              accessibilityRole="button"
              accessibilityLabel="accept_wallet_disclaimer"
              accessibilityState={{ disabled: proceeding }}
            >
              {proceeding ? (
                // Same footprint as the label so the sheet does not jump, and
                // no dimming: the button is not refusing the tap, it is working
                // on the one it already took.
                <View style={styles.pending}>
                  <ActivityIndicator />
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>
                  Continue to Google Wallet
                </Text>
              )}
            </Pressable>
          </View>
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
    },
    title: {
      fontSize: 17,
      fontWeight: "600",
      color: Colors[colorScheme].text,
    },
    scroll: {
      flexShrink: 1,
    },
    scrollContent: {
      paddingHorizontal: Styles.Padding.default,
      paddingBottom: Styles.Padding.large,
    },
    footer: {
      paddingHorizontal: Styles.Padding.default,
      paddingTop: Styles.Padding.medium,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: Colors[colorScheme].borderColor,
    },
    primaryButton: {
      backgroundColor: Colors.companyOrange,
      width: "100%",
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: Styles.BorderRadius.medium,
      paddingVertical: Styles.Padding.medium,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: Colors[colorScheme].primaryBackgroundColor,
    },
    pending: {
      alignItems: "center",
      justifyContent: "center",
    },
  });
