// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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
import React, { useEffect } from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { RootState } from "@/context/store";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { Colors } from "@/constants/Colors";
import SignInMessage from "@/components/SignInMessage";

export default function LoginScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const styles = createStyles(colorScheme);
  const router = useRouter();
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const version = Constants.expoConfig?.version;

  // If already authenticated (e.g., restored), go to main app
  useEffect(() => {
    if (accessToken) {
      router.replace("/(tabs)");
    }
  }, [accessToken, router]);

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      <View style={styles.content}>
        <View style={styles.card}>
          <SignInMessage message="Please sign in to continue using the app" />
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.versionText}>version {version}</Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
      justifyContent: "space-between",
    },
    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    card: {
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
      padding: 30,
      borderRadius: 16,
      width: "90%",
      alignItems: "center",
    },
    footer: {
      marginBottom: 80,
      alignItems: "center",
    },
    versionText: {
      color: Colors[colorScheme].text,
    },
  });
