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
import { useSignInSheet } from "@/hooks/useSignInSheet";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The sign-in sheet laid out as a Material 3 modal bottom sheet.
 */
const SignInSheet = () => {
  const { title, message, isSigningIn, signIn, dismiss } =
    useSignInSheet();
  const styles = createStyles(useColorScheme() ?? "light");
  // The app draws edge to edge, so the sheet runs under the navigation bar.
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={[styles.sheet, { paddingBottom: bottom + 8 }]}>
      {/* react-native-screens only draws a grabber on iOS. Swipe-down and back
          already dismiss, so the handle is decoration for TalkBack. */}
      <View style={styles.handle} importantForAccessibility="no" />
      <Ionicons
        name="log-in-outline"
        size={32}
        color={Colors.companyOrange}
        style={styles.icon}
        importantForAccessibility="no"
      />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        style={styles.signInButton}
        android_ripple={{ color: styles.signInText.color, foreground: true }}
        onPress={signIn}
        disabled={isSigningIn}
        accessibilityRole="button"
        accessibilityLabel="Sign in"
        accessibilityState={{ busy: isSigningIn, disabled: isSigningIn }}
      >
        {isSigningIn ? (
          <ActivityIndicator color={styles.signInText.color} />
        ) : (
          <Text style={styles.signInText}>Sign In</Text>
        )}
      </Pressable>
      <Pressable
        style={styles.notNowButton}
        android_ripple={{ color: Colors.companyOrange20, foreground: true }}
        onPress={dismiss}
        accessibilityRole="button"
      >
        <Text style={styles.notNowText}>Not now</Text>
      </Pressable>
    </View>
  );
};

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    sheet: {
      // A raised surface, so the sheet's edge reads against the screen behind it.
      backgroundColor: Colors[colorScheme].secondaryBackgroundColor,
      paddingHorizontal: 24,
      alignItems: "center",
    },
    handle: {
      width: 32,
      height: 4,
      borderRadius: 2,
      marginTop: 16,
      marginBottom: 24,
      backgroundColor: Colors[colorScheme].icon,
      opacity: 0.4,
    },
    icon: {
      marginBottom: 16,
    },
    title: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "600",
      color: Colors[colorScheme].text,
      textAlign: "center",
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      lineHeight: 20,
      color: Colors[colorScheme].primaryTextColor,
      textAlign: "center",
      marginBottom: 24,
    },
    signInButton: {
      alignSelf: "stretch",
      height: 48,
      borderRadius: 24,
      // Keeps the ripple inside the pill.
      overflow: "hidden",
      backgroundColor: Colors.companyOrange,
      alignItems: "center",
      justifyContent: "center",
    },
    signInText: {
      fontSize: 16,
      fontWeight: "600",
      color: Colors[colorScheme].primaryBackgroundColor,
    },
    notNowButton: {
      alignSelf: "stretch",
      height: 48,
      marginTop: 8,
      borderRadius: 24,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    notNowText: {
      fontSize: 16,
      fontWeight: "600",
      color: Colors.companyOrange,
    },
  });

export default SignInSheet;
