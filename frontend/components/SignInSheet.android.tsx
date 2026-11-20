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
import ChoreoLabsLogo from "@/components/brand/ChoreoLabsLogo";
import PrimaryButton from "@/components/brand/PrimaryButton";
import SignInArtwork from "@/components/signIn/SignInArtwork";
import { radius, size, textStyle, themes, type } from "@/constants/brand";
import { useSignInSheet } from "@/hooks/useSignInSheet";
import Constants from "expo-constants";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// The sheet sits on the always-dark sign-in artwork, so it reads the dark tokens.
const colors = themes.dark;

/**
 * The sign-in sheet laid out as a modal bottom sheet over the sign-in artwork.
 */
const SignInSheet = () => {
  const { title, message, isSigningIn, signIn, dismiss } =
    useSignInSheet();
  // The app draws edge to edge, so the sheet runs under the navigation bar.
  const { bottom } = useSafeAreaInsets();
  const version = Constants.expoConfig?.version;

  return (
    <SignInArtwork style={[styles.sheet, { paddingBottom: bottom + 8 }]}>
      {/* react-native-screens only draws a grabber on iOS. Swipe-down and back
          already dismiss, so the handle is decoration for TalkBack. */}
      <View style={styles.handle} importantForAccessibility="no" />
      <View style={styles.logo} importantForAccessibility="no-hide-descendants">
        <ChoreoLabsLogo width={168} color="#FFFFFF" />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
      <PrimaryButton
        title="Sign In"
        onPress={signIn}
        loading={isSigningIn}
        style={styles.signInButton}
      />
      <Pressable
        style={styles.notNowButton}
        android_ripple={{ color: colors.card2, foreground: true }}
        onPress={dismiss}
        accessibilityRole="button"
      >
        <Text style={styles.notNowText}>Not now</Text>
      </Pressable>
      <Text style={styles.version}>version {version}</Text>
    </SignInArtwork>
  );
};

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    marginTop: 8,
    marginBottom: 32,
    backgroundColor: colors.line2,
  },
  logo: {
    marginBottom: 28,
  },
  title: {
    ...textStyle(type.sectionHeading),
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    ...textStyle({ ...type.excerpt, size: 15 }),
    color: colors.text2,
    textAlign: "center",
    marginBottom: 24,
  },
  signInButton: {
    alignSelf: "stretch",
  },
  notNowButton: {
    alignSelf: "stretch",
    height: 48,
    marginTop: 8,
    borderRadius: radius.buttonPrimary,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    minHeight: size.minHitTarget,
  },
  notNowText: {
    ...textStyle(type.storeRowName),
    color: colors.accent,
  },
  version: {
    ...textStyle({ size: 13, weight: 400, tracking: 0.02 }),
    color: colors.text3,
    marginTop: 6,
  },
});

export default SignInSheet;
