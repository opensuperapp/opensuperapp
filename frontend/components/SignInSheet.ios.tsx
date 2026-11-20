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
import { size, textStyle, themes, type } from "@/constants/brand";
import { useSignInSheet } from "@/hooks/useSignInSheet";
import Constants from "expo-constants";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

// The sheet sits on the always-dark sign-in artwork, so it reads the dark tokens.
const colors = themes.dark;

/**
 * The sign-in sheet laid out like a native iOS sheet: the Choreo Labs logo and
 * the reason over a prominent Sign In button with a plain "Not now" below it.
 *
 * Each element is its own accessibility element; the old modal card merged them into
 * one, so VoiceOver could never reach the button.
 */
const SignInSheet = () => {
  const { title, message, isSigningIn, signIn, dismiss } =
    useSignInSheet();
  const version = Constants.expoConfig?.version;

  return (
    <SignInArtwork style={styles.container}>
      <View
        style={styles.logo}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
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
        onPress={dismiss}
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => [
          styles.notNowButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.notNowText}>Not now</Text>
      </Pressable>
      <Text style={styles.version}>version {version}</Text>
    </SignInArtwork>
  );
};

const styles = StyleSheet.create({
  // No bottom inset here: fitToContents already adds the home indicator inset
  // below this view, painted Midnight by the sheet's contentStyle.
  container: {
    alignItems: "center",
    paddingTop: 44,
    paddingHorizontal: 24,
    paddingBottom: 8,
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
    marginBottom: 28,
  },
  signInButton: {
    alignSelf: "stretch",
  },
  notNowButton: {
    alignSelf: "stretch",
    height: size.minHitTarget,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
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
  pressed: {
    opacity: 0.6,
  },
});

export default SignInSheet;
