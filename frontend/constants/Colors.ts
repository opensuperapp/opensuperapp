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

import { brand, themes } from "@/constants/brand";

/**
 * Legacy colour keys, now mapped onto the Choreo Labs tokens in `constants/brand`.
 * New code should use `useBrandTheme()` and the token names directly.
 *
 * Below are the colors that are used in the app. The colors are defined for light and dark modes.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

// Theme colors interface
interface ThemeColors {
  text: string;
  icon: string;
  tabIconDefault: string;
  primaryTextColor: string;
  secondaryTextColor: string;
  ternaryTextColor: string;
  defaultAppTextColor: string;
  primaryBackgroundColor: string;
  secondaryBackgroundColor: string;
  profileFontColor: string;
  profileBackgroundColor: string;
  libraryCardBackgroundColor: string;
  mutedTextColor: string;
  articleTextColor: string;
  borderColor: string;
  discoveryContentBackgroundColor: string;
  ternaryBackgroundColor: string;
  skeletonColorOne: string;
  skeletonColorTwo: string;
  contentItemBackgroundColor: string;
  overLayColor: string;
  modalBorderColor: string;
  offlineBackgroundColor: string;
  offlineTextColor: string;
}

// App colors interface
interface AppColors {
  light: ThemeColors;
  dark: ThemeColors;
  companyOrange: string;
  companyOrange20: string;
  companyOrange15: string;
  actionButtonTextColor: string;
  removeButtonTextColor: string;
}

/**
 * Global color palette for light and dark themes.
 *
 * Usage:
 *   import { Colors } from "@/constants/Colors";
 *   const backgroundColor = Colors.light.primaryBackgroundColor;
 */

export const Colors: AppColors = {
  light: {
    text: themes.light.text,
    icon: themes.light.text3,
    tabIconDefault: themes.light.text3,

    primaryTextColor: themes.light.text,
    secondaryTextColor: themes.light.text2,
    ternaryTextColor: themes.light.text,

    defaultAppTextColor: themes.light.text3,

    primaryBackgroundColor: themes.light.bg,
    secondaryBackgroundColor: themes.light.card2,

    profileFontColor: "#FFFFFF", // Initials sit on the dark dot artwork
    profileBackgroundColor: brand.ink,

    libraryCardBackgroundColor: themes.light.card,
    mutedTextColor: themes.light.text2,
    articleTextColor: themes.light.text2,

    borderColor: themes.light.line,
    discoveryContentBackgroundColor: themes.light.card,
    ternaryBackgroundColor: themes.light.card2,

    skeletonColorOne: themes.light.card,
    skeletonColorTwo: themes.light.card2,

    contentItemBackgroundColor: themes.light.card,

    overLayColor: themes.light.backdrop,
    modalBorderColor: themes.light.line2,
    offlineBackgroundColor: themes.light.error, // No-connection toast
    offlineTextColor: "#FFFFFF", // White on #B42318 (6.6:1)
  },

  dark: {
    text: themes.dark.text,
    icon: themes.dark.text3,
    tabIconDefault: themes.dark.text3,

    primaryTextColor: themes.dark.text,
    secondaryTextColor: themes.dark.text2,
    ternaryTextColor: themes.dark.text,
    defaultAppTextColor: themes.dark.text3,

    primaryBackgroundColor: themes.dark.bg,
    secondaryBackgroundColor: themes.dark.card2,

    profileFontColor: "#FFFFFF",
    profileBackgroundColor: brand.ink,

    libraryCardBackgroundColor: themes.dark.card,
    mutedTextColor: themes.dark.text2,
    articleTextColor: themes.dark.text2,

    borderColor: themes.dark.line,
    discoveryContentBackgroundColor: themes.dark.card,
    ternaryBackgroundColor: themes.dark.card2,

    skeletonColorOne: themes.dark.card,
    skeletonColorTwo: themes.dark.card2,

    contentItemBackgroundColor: themes.dark.card,

    overLayColor: themes.dark.backdrop,
    modalBorderColor: themes.dark.line2,
    offlineBackgroundColor: themes.dark.error, // No-connection toast
    offlineTextColor: brand.ink, // Ink on #FF7A7F (7.4:1)
  },

  // Signal: fills only. Orange text/icons should use the theme's `accent` (Burn on light).
  companyOrange: brand.signal,
  companyOrange20: "#FF460033",
  companyOrange15: "#FF460026",
  actionButtonTextColor: themes.dark.cobalt, // Prefer theme `cobalt` per scheme
  removeButtonTextColor: themes.dark.error, // Prefer theme `error` per scheme
};
