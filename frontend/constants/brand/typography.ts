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
 * Choreo Labs type scale. Font: Sora only (300–700).
 *
 * React Native notes:
 * - Load with `@expo-google-fonts/sora` (not installed yet). Custom fonts on Android
 *   don't synthesise weights, so pick the family per weight via `soraFamily`.
 * - RN `letterSpacing` is in px; the spec is in em. `textStyle()` converts.
 */

export type SoraWeight = 300 | 400 | 500 | 600 | 700;

export const soraFamily: Record<SoraWeight, string> = {
  300: "Sora_300Light",
  400: "Sora_400Regular",
  500: "Sora_500Medium",
  600: "Sora_600SemiBold",
  700: "Sora_700Bold",
};

export interface TypeToken {
  size: number;
  weight: SoraWeight;
  /** tracking in em; negative for large type, +.14–.16 for small caps labels */
  tracking?: number;
  /** line-height as a multiplier of size */
  lineHeight?: number;
  uppercase?: boolean;
}

export const type = {
  tabRootTitle: { size: 24, weight: 600, tracking: -0.035, lineHeight: 1.2 }, // left aligned
  pushedTitle: { size: 17, weight: 600, tracking: -0.02 }, // centred
  articleTitle: { size: 26, weight: 600, tracking: -0.04, lineHeight: 1.2 }, // also App detail
  sectionHeading: { size: 20, weight: 600, tracking: -0.03 }, // "News"
  cardTitle: { size: 17, weight: 600, tracking: -0.025, lineHeight: 1.35 },
  storeRowName: { size: 16, weight: 600, tracking: -0.02 },
  heroGreeting: { size: 24, weight: 600 },
  body: { size: 15, weight: 400 }, // chat
  lead: { size: 17, weight: 400, lineHeight: 1.6 }, // article lead
  excerpt: { size: 14, weight: 400, lineHeight: 1.55 }, // 2-line clamp
  metaLabel: { size: 11, weight: 500, tracking: 0.14, uppercase: true }, // NEWS, BLOG…
  heroDate: { size: 10, weight: 600, tracking: 0.16, uppercase: true },
  tabLabel: { size: 11, weight: 500 }, // 600 when selected
  tabLabelSelected: { size: 11, weight: 600 },
  gridAppLabel: { size: 12, weight: 500 }, // single line, ellipsis
  cardFieldLabel: { size: 10, weight: 600, tracking: 0.16, uppercase: true }, // business card
  authorName: { size: 14, weight: 600 },
  authorRole: { size: 12, weight: 400 },
  profileFieldLabel: { size: 12, weight: 400 },
  profileFieldValue: { size: 16, weight: 400 },
} as const satisfies Record<string, TypeToken>;

/** Convert a token to a React Native TextStyle-compatible object. */
export function textStyle(t: TypeToken) {
  return {
    fontFamily: soraFamily[t.weight],
    fontSize: t.size,
    ...(t.tracking !== undefined && { letterSpacing: t.tracking * t.size }),
    ...(t.lineHeight !== undefined && { lineHeight: Math.round(t.lineHeight * t.size) }),
    ...(t.uppercase && { textTransform: "uppercase" as const }),
  };
}
