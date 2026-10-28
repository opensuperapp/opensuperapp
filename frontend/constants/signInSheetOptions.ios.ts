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
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { PlatformColor } from "react-native";

/**
 * A native iOS form sheet sized to its content, so the expiry reads as an interruption
 * the user can swipe away rather than a page they navigated to.
 */
export const signInSheetOptions: NativeStackNavigationOptions = {
  presentation: "formSheet",
  headerShown: false,
  sheetAllowedDetents: "fitToContents",
  sheetGrabberVisible: true,
  // Pinned so the corners don't change with the system default across iOS versions.
  sheetCornerRadius: 24,
  // The sheet keeps the home indicator inset below the content, and that strip shows
  // this colour. The system colour follows light and dark mode without the options
  // needing the theme, and uses the raised dark-mode sheet colour like system sheets.
  contentStyle: { backgroundColor: PlatformColor("systemBackground") },
};
