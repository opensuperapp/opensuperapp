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

/**
 * Choreo Labs colour tokens.
 * Source: handoff README "Design tokens" (high fidelity, final).
 *
 * Rules:
 * - Signal (#FF4600) = anything tappable. On light, orange TEXT/ICONS use `accent` (Burn #C43300).
 *   Primary buttons keep the Signal fill with Ink text in both themes.
 * - Cobalt = brand highlight, never interactive (app-icon accents, greeting name).
 */

export const brand = {
  signal: "#FF4600", // interactive orange
  flare: "#FF6E33", // hover / pressed highlight of Signal
  burn: "#C43300", // orange text/icons on light backgrounds
  burnHover: "#8F2400", // link hover on light (motion-loaders.html)
  ink: "#0B1633",
  midnight: "#050A1C",
  cobalt: "#1F4FFF",
  azure: "#3D8BFF",
} as const;

export type ThemeName = "dark" | "light";

export interface ThemeColors {
  bg: string; // screen
  bar: string; // translucent bar colour (use with 18px backdrop blur)
  barSolid: string; // opaque header / tab bar: same as `bg`, so bars and screen read as one surface
  card: string;
  card2: string; // chips, pills, pressed
  line: string; // hairline
  line2: string; // control borders
  text: string;
  text2: string; // secondary
  text3: string; // tertiary
  field: string; // inputs
  accent: string; // interactive orange for text/icons/links
  cobalt: string; // focus, "Get", links in card sheet, app-icon accents
  error: string; // "Remove"
  sheet: string; // bottom-sheet background
  userBubble: string; // chat user bubble
  tagActiveBg: string;
  tagActiveText: string;
  primaryFill: string; // primary button fill (always Signal)
  primaryText: string; // primary button text (always Ink)
  backdrop: string; // sheet backdrop
}

export const themes: Record<ThemeName, ThemeColors> = {
  dark: {
    bg: "#050A1C",
    bar: "rgba(5,10,28,0.86)",
    barSolid: "#050A1C",
    card: "#0A1128",
    card2: "#111A36",
    line: "rgba(255,255,255,0.08)",
    line2: "rgba(255,255,255,0.14)",
    text: "#FFFFFF",
    text2: "#AEB6C6",
    text3: "#8A93A6",
    field: "#0D1530",
    accent: brand.signal,
    cobalt: brand.azure,
    error: "#FF7A7F",
    sheet: "#070D22",
    userBubble: brand.cobalt,
    tagActiveBg: "#FFFFFF",
    tagActiveText: brand.ink,
    primaryFill: brand.signal,
    primaryText: brand.ink,
    backdrop: "rgba(3,7,20,0.62)",
  },
  light: {
    bg: "#F4F6FA",
    bar: "rgba(255,255,255,0.88)",
    barSolid: "#F4F6FA",
    card: "#FFFFFF",
    card2: "#EEF1F7",
    line: "rgba(11,22,51,0.08)",
    line2: "rgba(11,22,51,0.16)",
    text: brand.ink,
    text2: "#5A6072",
    text3: "#5A6072",
    field: "#FFFFFF",
    accent: brand.burn,
    cobalt: brand.cobalt,
    error: "#B42318",
    sheet: "#F4F6FA",
    userBubble: brand.cobalt,
    tagActiveBg: brand.ink,
    tagActiveText: "#FFFFFF",
    primaryFill: brand.signal,
    primaryText: brand.ink,
    backdrop: "rgba(3,7,20,0.62)",
  },
};

/** Gradients as stop lists, for expo-linear-gradient / react-native-svg. */
export const gradients = {
  /** Feed hero overlay, 90deg, over the blackout-dots artwork on Midnight. */
  heroOverlay: ["rgba(5,10,28,0.2)", "rgba(5,10,28,0.75)"],
  /** Home-screen app icon, dark: radial 90% 80% at 30% 15%. */
  appIconDark: ["#1A2A66", "#0B1633", "#050A1C"],
  /** Home-screen app icon, light. */
  appIconLight: ["#FFFFFF", "#EEF1F7"],
  /** In-app tile, dark: radial 120% 90% at 20% 0%, stops 0 / 55% / 100%. */
  tileDark: ["#1A2A66", "#0B1633", "#070D22"],
  /** In-app tile, light: linear top→bottom. */
  tileLight: ["#FFFFFF", "#EEF1F7"],
  /** Business card front: radial. */
  businessCardFront: ["#3D6BFF", "#1F4FFF", "#1640D9"],
} as const;

/** Tile surface details (Halo style). */
export const tile = {
  dark: {
    border: "rgba(255,255,255,0.12)", // inset hairline
    gloss: ["rgba(255,255,255,0.16)", "rgba(255,255,255,0)"], // top 0→38%
    glyphFill: "rgba(255,255,255,0.16)", // closed base shapes
    accentFill: "rgba(61,139,255,0.28)", // closed accent shapes
    haloDot: brand.azure,
    haloOpacity: 0.38,
  },
  light: {
    border: "rgba(11,22,51,0.10)",
    gloss: ["rgba(255,255,255,0.9)", "rgba(255,255,255,0)"], // top 0→40%
    glyphFill: "rgba(11,22,51,0.08)",
    accentFill: "rgba(61,139,255,0.28)",
    haloDot: brand.cobalt,
    haloOpacity: 0.16,
  },
} as const;
