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
  themes,
  type,
  type ThemeColors,
  type ThemeName,
} from "@/constants/brand";
import { DarkTheme, DefaultTheme, type Theme } from "expo-router/react-navigation";
import { Platform } from "react-native";
import type { NativeStackNavigationOptions } from "expo-router/native-stack";

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
      card: colors.barSolid,
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

/**
 * iOS 27 always draws the bars as Liquid Glass (UIDesignRequiresCompatibility no longer
 * applies), and an opaque bar background there hides the native large title. So the
 * solid `barSolid` bars stop at iOS 26; on 27+ every bar is the system one, matching the
 * glass tab bar the OS forces.
 */
const solidBars =
  Platform.OS !== "ios" || parseInt(String(Platform.Version), 10) < 27;

/**
 * The glass bars carry no fill or material of their own, as on stock iOS 26+. Under
 * scrolled content they get the Liquid Glass soft edge; `automatic` resolved to the
 * classic-looking blur on the tab roots.
 */
const glassBarOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: "transparent" },
  headerBlurEffect: "none",
  scrollEdgeEffects: { top: "soft" },
};

/** Pushed screens: centred 17/600 title, accent back chevron and back label. */
export const pushedHeaderOptions = (
  colors: ThemeColors,
): NativeStackNavigationOptions => ({
  headerTitleAlign: "center",
  headerTintColor: colors.accent,
  ...(solidBars
    ? { headerStyle: { backgroundColor: colors.barSolid }, headerBlurEffect: "none" }
    : glassBarOptions),
  headerTitleStyle: {
    fontFamily: soraFamily[type.pushedTitle.weight],
    fontSize: type.pushedTitle.size,
    color: colors.text,
  },
  headerBackTitleStyle: { fontFamily: soraFamily[500], fontSize: 16 },
});

/**
 * Tab roots: the native large title that collapses into the bar as the content scrolls.
 * The bar is opaque `barSolid` with no blur, matching the tab bar; the two must stay the
 * same style (both solid, or both translucent), never mixed.
 * Android has no large title; it gets the native Material top app bar.
 */
export const largeTitleHeaderOptions = (
  colors: ThemeColors,
): NativeStackNavigationOptions => ({
  headerTintColor: colors.accent,
  headerTitleStyle: {
    fontFamily: soraFamily[type.pushedTitle.weight],
    color: colors.text,
  },
  headerBackTitleStyle: { fontFamily: soraFamily[500] },
  ...(solidBars
    ? { headerStyle: { backgroundColor: colors.barSolid } }
    : glassBarOptions),
  contentStyle: { backgroundColor: colors.bg },
  ...Platform.select<NativeStackNavigationOptions>({
    ios: {
      headerLargeTitle: true,
      ...(solidBars && {
        headerBlurEffect: "none",
        headerLargeStyle: { backgroundColor: colors.barSolid },
      }),
      // As UIKit does: no hairline under the large title, one under the inline bar once
      // the content scrolls beneath it.
      headerShadowVisible: true,
      headerLargeTitleShadowVisible: false,
      headerLargeTitleStyle: {
        fontFamily: soraFamily[700],
        fontSize: 30,
        color: colors.text,
      },
    },
    android: { headerShadowVisible: false },
  }),
});
