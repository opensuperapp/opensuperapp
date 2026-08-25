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
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";

const BusinessCardEmptyState = () => {
  const colorScheme = useColorScheme() ?? "light";
  const styles = createStyles(colorScheme);

  return (
    <View style={styles.container}>
      <Ionicons
        name="card-outline"
        size={48}
        color={Colors[colorScheme].icon}
      />
      <Text style={styles.title}>Your card isn&apos;t ready yet</Text>
      <Text style={styles.description}>
        We need your name and work email to build your digital business card.
        Please sign in or try again once your profile has synced.
      </Text>
    </View>
  );
};

export default BusinessCardEmptyState;

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    title: {
      marginTop: 16,
      fontSize: 18,
      fontWeight: "600",
      color: Colors[colorScheme].text,
      textAlign: "center",
    },
    description: {
      marginTop: 8,
      fontSize: 14,
      color: Colors[colorScheme].secondaryTextColor,
      textAlign: "center",
    },
  });
