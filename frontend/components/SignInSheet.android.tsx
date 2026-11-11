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
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useSignInSheet } from "@/hooks/useSignInSheet";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The sign-in sheet as a plain Material bottom sheet: theme surface, system type,
 * the reason over a filled Sign In button and a text "Not now" button. No artwork or logo.
 */
const SignInSheet = () => {
  const { title, message, isSigningIn, signIn, dismiss } = useSignInSheet();
  // The app draws edge to edge, so the sheet runs under the navigation bar.
  const { bottom } = useSafeAreaInsets();
  const { colors } = useBrandTheme();

  return (
    <View
      style={[
        styles.sheet,
        { backgroundColor: colors.card, paddingBottom: bottom + 16 },
      ]}
    >
      {/* react-native-screens only draws a grabber on iOS. Swipe-down and back
          already dismiss, so the handle is decoration for TalkBack. */}
      <View
        style={[styles.handle, { backgroundColor: colors.text3 }]}
        importantForAccessibility="no"
      />
      <Text
        style={[styles.title, { color: colors.text }]}
        accessibilityRole="header"
      >
        {title}
      </Text>
      <Text style={[styles.message, { color: colors.text2 }]}>{message}</Text>
      <Pressable
        onPress={signIn}
        disabled={isSigningIn}
        accessibilityRole="button"
        accessibilityLabel="Sign In"
        accessibilityState={{ busy: isSigningIn, disabled: isSigningIn }}
        android_ripple={{ color: "rgba(255,255,255,0.24)", foreground: true }}
        style={[styles.signInButton, { backgroundColor: colors.accent }]}
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
        android_ripple={{ color: colors.text3, foreground: true }}
        style={styles.notNowButton}
      >
        <Text style={[styles.notNowText, { color: colors.accent }]}>
          Not now
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: 24,
  },
  handle: {
    alignSelf: "center",
    width: 32,
    height: 4,
    borderRadius: 2,
    marginTop: 16,
    marginBottom: 24,
    opacity: 0.4,
  },
  title: {
    fontSize: 24,
    textAlign: "center",
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  signInButton: {
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  signInText: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.1,
    color: "#FFFFFF",
  },
  notNowButton: {
    height: 48,
    marginTop: 8,
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  notNowText: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
});

export default SignInSheet;
