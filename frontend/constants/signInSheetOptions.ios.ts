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
import type { BrandTheme } from "@/hooks/useBrandTheme";
import { PlatformColor } from "react-native";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

/**
 * The system sheet background in light mode. In dark, the theme's lightest navy
 * surface: `bg` and `sheet` are too close to the screen behind to read as a sheet.
 */
export const signInSheetBackground = ({ isDark, colors }: BrandTheme) =>
  isDark ? colors.card2 : PlatformColor("systemBackground");

/**
 * A native iOS form sheet sized to its content, so the expiry reads as an interruption
 * the user can swipe away rather than a page they navigated to.
 */
export const signInSheetOptions = (
  theme: BrandTheme,
): NativeStackNavigationOptions => ({
  presentation: "formSheet",
  headerShown: false,
  sheetAllowedDetents: "fitToContents",
  sheetGrabberVisible: true,
  // The sheet keeps the home indicator inset below the content; paint that strip the
  // same background as the sheet.
  contentStyle: { backgroundColor: signInSheetBackground(theme) },
});
