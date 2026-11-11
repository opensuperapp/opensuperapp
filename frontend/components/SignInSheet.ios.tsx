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
import { signInSheetBackground } from "@/constants/signInSheetOptions";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useSignInSheet } from "@/hooks/useSignInSheet";
import React from "react";
import {
  ActivityIndicator,
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

/**
 * The sign-in sheet as a plain iOS sheet: system background, system type, the reason
 * over a filled Sign In button and a plain "Not now" below it. No artwork or logo.
 *
 * Each element is its own accessibility element, so VoiceOver can reach the button.
 */
const SignInSheet = () => {
  const { title, message, isSigningIn, signIn, dismiss } = useSignInSheet();
  // The app tint, the same one the tab bar and navigation bars use.
  const theme = useBrandTheme();
  const { colors } = theme;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: signInSheetBackground(theme) },
      ]}
    >
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        onPress={signIn}
        disabled={isSigningIn}
        accessibilityRole="button"
        accessibilityLabel="Sign In"
        accessibilityState={{ busy: isSigningIn, disabled: isSigningIn }}
        style={({ pressed }) => [
          styles.signInButton,
          { backgroundColor: colors.accent },
          pressed && styles.pressed,
        ]}
      >
        {isSigningIn ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.signInText}>Sign In</Text>
        )}
      </Pressable>
      <Pressable
        onPress={dismiss}
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => [
          styles.notNowButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.notNowText, { color: colors.accent }]}>
          Not now
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  // No bottom inset here: fitToContents already adds the home indicator inset
  // below this view.
  container: {
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: PlatformColor("label"),
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: PlatformColor("secondaryLabel"),
    textAlign: "center",
    marginBottom: 24,
  },
  signInButton: {
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  signInText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  notNowButton: {
    height: 44,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  notNowText: {
    fontSize: 17,
  },
  pressed: {
    opacity: 0.6,
  },
});

export default SignInSheet;
