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
import { useColorScheme } from "@/hooks/useColorScheme";
import { useSignInSheet } from "@/hooks/useSignInSheet";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

/**
 * The sign-in sheet laid out like a native iOS sheet: icon, title and message
 * over a prominent Sign In button with a plain "Not now" below it.
 *
 * Each element is its own accessibility element; the old modal card merged them into
 * one, so VoiceOver could never reach the button.
 */
const SignInSheet = () => {
  const { title, message, isSigningIn, signIn, dismiss } =
    useSignInSheet();
  const colorScheme = useColorScheme() ?? "light";
  const styles = createStyles(colorScheme);

  return (
    <View style={styles.container}>
      <Ionicons
        name="log-in-outline"
        size={44}
        color={Colors.companyOrange}
        style={styles.icon}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        onPress={signIn}
        disabled={isSigningIn}
        accessibilityRole="button"
        accessibilityLabel="Sign in"
        accessibilityState={{ busy: isSigningIn, disabled: isSigningIn }}
        style={({ pressed }) => [
          styles.signInButton,
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
        <Text style={styles.notNowText}>Not now</Text>
      </Pressable>
    </View>
  );
};

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    // No background or bottom inset here: the sheet's contentStyle paints both, and
    // fitToContents already adds the home indicator inset below this view.
    container: {
      alignItems: "center",
      paddingTop: 36,
      paddingHorizontal: 24,
      paddingBottom: 8,
    },
    icon: {
      marginBottom: 12,
    },
    // Sizes follow the iOS Title 2 and Body text styles.
    title: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "700",
      color: Colors[colorScheme].text,
      textAlign: "center",
      marginBottom: 8,
    },
    message: {
      fontSize: 17,
      lineHeight: 22,
      color: Colors[colorScheme].primaryTextColor,
      textAlign: "center",
      marginBottom: 28,
    },
    signInButton: {
      alignSelf: "stretch",
      height: 50,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: Colors.companyOrange,
      alignItems: "center",
      justifyContent: "center",
    },
    signInText: {
      fontSize: 17,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    notNowButton: {
      alignSelf: "stretch",
      height: 44,
      marginTop: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    notNowText: {
      fontSize: 17,
      color: Colors.companyOrange,
    },
    pressed: {
      opacity: 0.6,
    },
  });

export default SignInSheet;
