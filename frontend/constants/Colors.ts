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

/**
 * Below are the colors that are used in the app. The colors are defined for light and dark modes.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

/**
 * Global color palette for light and dark themes.
 *
 * Usage:
 *   import { Colors } from "@/constants/Colors";
 *   const backgroundColor = Colors.light.primaryBackgroundColor;
 */

export const Colors = {
  light: {
    text: "#1F2937", // Main text color (gray-950)
    icon: "#687076", // Default icon color
    tabIconDefault: "#687076", // Bottom tab icon default color

    primaryTextColor: "#1F2937", // Primary content text
    secondaryTextColor: "#374151", // Secondary/description text
    ternaryTextColor: "#000000", // Minor/deemphasized text

    primaryBackgroundColor: "#FFFFFF", // Main app background
    secondaryBackgroundColor: "#EEEEEF", // Card/section background

    profileFontColor: "#FFFFFF", // Font color for profile initials
    profileBackgroundColor: "#BDBFC4", // Profile circle background

    libraryCardBackgroundColor: "#FFFFFF", // Background for library cards
    mutedTextColor: "#242424", // Author name on library cards
    articleTextColor: "#494848", // Text content inside articles

    borderColor: "#EEEEEF", // Border color (gray-300)
    discoveryContentBackgroundColor: "#FFFFFF", // Discovery section background
    ternaryBackgroundColor: "#F3F4F6", // Another ternary background color (gray-200)

    skeletonColorOne: "#E5E7EB", // Skeleton loader first color
    skeletonColorTwo: "#D1D5DB", // Skeleton loader second color

    contentItemBackgroundColor: "#F7F7F7", // Background for content items

    overLayColor: "#FFFFFF78", // White overlay (about 47% opacity)
    modalBorderColor: "#D0D0D0", // Modal outline border color
  },

  dark: {
    text: "#F9FAFB", // Main text color (gray-50)
    icon: "#9BA1A6", // Default icon color
    tabIconDefault: "#9BA1A6", // Bottom tab icon default color

    primaryTextColor: "#9CA3AF", // Primary content text
    secondaryTextColor: "#6B7280", // Secondary/description text
    ternaryTextColor: "#DCE0E6", // Minor/deemphasized text

    primaryBackgroundColor: "#171717ff", // Main app background
    secondaryBackgroundColor: "#1F2937", // Card/section background

    profileFontColor: "#B6B6B6", // Font color for profile initials
    profileBackgroundColor: "#464849", // Profile circle background

    libraryCardBackgroundColor: "#1E1E1E", // Background for library cards
    mutedTextColor: "#CCCCCC", // Author name on library cards
    articleTextColor: "#BDC1C6", // Text content inside articles

    borderColor: "#666666", // Border color
    discoveryContentBackgroundColor: "#000", // Discovery section background
    ternaryBackgroundColor: "#2E2E2E", // Ternary background color

    skeletonColorOne: "#242424", // Skeleton loader first color
    skeletonColorTwo: "#2B2B2B", // Skeleton loader second color

    contentItemBackgroundColor: "#1C1C1C", // Content item background

    overLayColor: "#00000078", // Black overlay (about 47% opacity)
    modalBorderColor: "#EBEBEB", // Modal outline border color
  },

  companyOrange: "#FF7300", // Company brand accent color
  actionButtonTextColor: "#4989F7", // Action button text color
  removeButtonTextColor: "#EB4E3D", // Remove button text color
};
