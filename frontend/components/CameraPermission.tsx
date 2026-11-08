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
import PrimaryButton from "@/components/brand/PrimaryButton";
import { soraFamily, textStyle, type } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

// No camera glyph in the brand set: drawn on the same 24 grid, outline, round joins.
const CameraIcon = ({ color }: { color: string }) => (
  <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 7.5h3l1.6-2.5h6.8L17 7.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1Z"
      stroke={color}
      strokeWidth={1.4}
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={13} r={3.5} stroke={color} strokeWidth={1.4} />
  </Svg>
);

const CameraPermission = ({
  handlePress,
  message = "This app requires access to your camera to scan QR codes.",
}: {
  handlePress: () => void;
  message?: string;
}) => {
  const { colors } = useBrandTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        {/* Camera Icon */}
        <View style={styles.icon}>
          <CameraIcon color={colors.accent} />
        </View>

        {/* Title */}
        <Text
          style={[styles.title, { color: colors.text }]}
          allowFontScaling={false}
        >
          Camera Access Needed
        </Text>

        {/* Description */}
        <Text
          style={[styles.description, { color: colors.text2 }]}
          allowFontScaling={false}
        >
          {message}
        </Text>

        {/* Button */}
        <PrimaryButton
          title="Continue"
          onPress={handlePress}
          style={styles.button}
        />
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
    ...textStyle(type.articleTitle),
    textAlign: "center",
  },
  description: {
    fontFamily: soraFamily[400],
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 16,
  },
  button: {
    width: "100%",
    marginTop: 30,
  },
});
