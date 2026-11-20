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
import { brand } from "@/constants/brand";
import React, { ReactNode } from "react";
import {
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

const DOTS = require("@/assets/brand/blackout-dots.png");

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * The sign-in backdrop: Midnight with the blackout-dots artwork full bleed.
 * It stays dark in both themes, so anything drawn on it uses the dark tokens.
 */
const SignInArtwork = ({ children, style }: Props) => (
  <View style={[styles.container, style]}>
    <Image
      source={DOTS}
      resizeMode="cover"
      style={StyleSheet.absoluteFill}
      accessibilityIgnoresInvertColors
    />
    {children}
  </View>
);

export default SignInArtwork;

const styles = StyleSheet.create({
  container: {
    backgroundColor: brand.midnight,
    overflow: "hidden",
  },
});
