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
import {
  brand,
  soraFamily,
  spacing,
  textStyle,
  themes,
  type,
  type ThemeColors,
  type ThemeName,
} from "@/constants/brand";
import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

// The family carries the weight: Android doesn't synthesise weights for custom fonts.
const fonts: Theme["fonts"] = {
  regular: { fontFamily: soraFamily[400], fontWeight: "normal" },
  medium: { fontFamily: soraFamily[500], fontWeight: "normal" },
  bold: { fontFamily: soraFamily[600], fontWeight: "normal" },
  heavy: { fontFamily: soraFamily[700], fontWeight: "normal" },
};

const buildTheme = (scheme: ThemeName): Theme => {
  const colors = themes[scheme];
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: scheme === "dark",
    colors: {
      primary: colors.accent,
      background: colors.bg,
      card: colors.bar,
      text: colors.text,
      border: colors.line,
      notification: brand.signal,
    },
    fonts,
  };
};

/** React Navigation themes built from the Choreo Labs tokens. */
export const navigationThemes: Record<ThemeName, Theme> = {
  dark: buildTheme("dark"),
  light: buildTheme("light"),
};

/** Pushed screens: centred 17/600 title, accent back chevron and back label. */
export const pushedHeaderOptions = (
  colors: ThemeColors,
): NativeStackNavigationOptions => ({
  headerTitleAlign: "center",
  headerTintColor: colors.accent,
  headerStyle: { backgroundColor: colors.bar },
  headerTitleStyle: {
    fontFamily: soraFamily[type.pushedTitle.weight],
    fontSize: type.pushedTitle.size,
    color: colors.text,
  },
  headerBackTitleStyle: { fontFamily: soraFamily[500], fontSize: 16 },
});

/**
 * Tab roots in a native stack (e.g. My Apps): left-aligned 24/600 title.
 * A native header can't take tracking; iOS also keeps its title centred.
 */
export const stackTabRootHeaderOptions = (
  colors: ThemeColors,
): NativeStackNavigationOptions => ({
  ...pushedHeaderOptions(colors),
  headerTitleAlign: "left",
  headerTitleStyle: {
    fontFamily: soraFamily[type.tabRootTitle.weight],
    fontSize: type.tabRootTitle.size,
    color: colors.text,
  },
});

/** Tab roots rendered by the tab navigator: left-aligned 24/600 title, accent actions. */
export const tabRootHeaderOptions = (
  colors: ThemeColors,
): BottomTabNavigationOptions => ({
  headerTitleAlign: "left",
  headerTintColor: colors.accent,
  headerStyle: { backgroundColor: colors.bar, borderBottomColor: colors.line },
  headerTitleStyle: { ...textStyle(type.tabRootTitle), color: colors.text },
  headerTitleContainerStyle: { marginLeft: spacing.headerPadding.left },
  headerRightContainerStyle: { paddingRight: spacing.headerPadding.right },
});
