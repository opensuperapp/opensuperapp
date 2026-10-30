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

/**
 * A native Android bottom sheet sized to its content, so the expiry reads as an
 * interruption the user can swipe or back away from rather than a page they navigated to.
 *
 * There is no contentStyle background here: options are static, so they can't follow the
 * color scheme. The sheet clips its content to the rounded shape, so the sheet component
 * paints the surface color itself.
 */
export const signInSheetOptions: NativeStackNavigationOptions = {
  presentation: "formSheet",
  headerShown: false,
  sheetAllowedDetents: "fitToContents",
  // Material 3 extra-large shape. Documented as iOS-only, but react-native-screens
  // applies it to the Android sheet too.
  sheetCornerRadius: 28,
};
