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
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import React from "react";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";

const CameraPermission = ({
  handlePress,
  message = "This app requires access to your camera to scan QR codes.",
}: {
  handlePress: () => void;
  message?: string;
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            Colors[colorScheme ?? "light"].primaryBackgroundColor,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Camera Icon */}
        <Ionicons
          style={styles.icon}
          name="camera"
          size={80}
          color={Colors.companyOrange}
        />

        {/* Title */}
        <Text
          style={[styles.title, { color: isDark ? "#E5E7EB" : "#1F2937" }]}
          allowFontScaling={false}
        >
          Camera Access Needed
        </Text>

        {/* Description */}
        <Text
          style={[
            styles.description,
            { color: isDark ? "#9CA3AF" : "#4B5563" },
          ]}
          allowFontScaling={false}
        >
          {message}
        </Text>

        {/* Button */}
        <TouchableOpacity style={styles.button} onPress={handlePress}>
          <Text
            style={[
              styles.buttonText,
              { color: isDark ? "#D1D5DB" : "#F9FAFB" },
            ]}
            allowFontScaling={false}
          >
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CameraPermission;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 40,
  },
  icon: {
    margin: 20,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    marginTop: 16,
  },
  button: {
    backgroundColor: Colors.companyOrange,
    width: "100%",
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginTop: 30,
  },
  buttonText: {
    textAlign: "center",
    fontWeight: "600",
    fontSize: 15,
  },
});
