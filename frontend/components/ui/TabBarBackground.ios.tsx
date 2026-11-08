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
import { blur } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// expo-blur's intensity runs 0-100; this lands near an 18px CSS backdrop blur.
const BLUR_INTENSITY = blur.bar * 2;

/** The brand bar colour over an 18px backdrop blur. */
export default function BlurTabBarBackground() {
  const { colors, isDark } = useBrandTheme();

  return (
    <BlurView
      tint={isDark ? "dark" : "light"}
      intensity={BLUR_INTENSITY}
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.bar }]}
    />
  );
}

export function useBottomTabOverflow() {
  const tabHeight = useBottomTabBarHeight();
  const { bottom } = useSafeAreaInsets();
  return tabHeight - bottom;
}
