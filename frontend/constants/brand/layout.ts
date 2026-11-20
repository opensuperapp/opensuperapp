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

/** Choreo Labs spacing, radius and component sizes (px / dp). */

export const spacing = {
  screen: 16, // screen side padding
  /** header padding: top = statusBar + 6, then right / bottom / left */
  headerPadding: { topExtra: 6, right: 12, bottom: 8, left: 20 },
  headerMinHeightExtra: 56, // header min height = statusBar + 56
  appGrid: { columns: 4, rowGap: 22, columnGap: 8 },
} as const;

export const radius = {
  card: 20,
  hero: 22,
  sheetTop: 22,
  input: 14, // search + inputs
  buttonPrimary: 16,
  buttonSmall: 12,
  pill: 999, // pills, chips
  chatBubbleUser: { topLeft: 18, topRight: 18, bottomRight: 4, bottomLeft: 18 },
  qr: 14,
  /** fraction of tile size */
  appTileRatio: 0.27,
  /** iOS squircle, fraction of icon size */
  homeIconRatio: 0.2237,
} as const;

export const size = {
  minHitTarget: 44,
  buttonPrimaryHeight: 54,
  searchHeight: 48,
  chatComposerHeight: 54,
  tabBarItemMinHeight: 52,
  tagHeight: 32,
  tile: { grid: 64, storeRow: 56, appDetail: 104 },
  avatar: { author: 44, businessCard: 76, profile: 136, chatBot: 30, chatEmpty: 80 },
  profileAvatarRing: 8,
  chatTypingMark: 22,
  drawer: { widthRatio: 0.82, maxWidth: 340 },
  /** glyph drawn at 50% of tile; stroke 1.6, 1.4 when tile > 80 */
  tileGlyphRatio: 0.5,
  homeIconMarkRatio: 0.54,
  launchMark: { widthRatio: 0.3, max: 132 },
  heroMark: { widthRatio: 0.34, max: 146 },
  heroAspect: 16 / 10,
  businessCardQrRatio: 0.44,
} as const;

export const blur = {
  bar: 18, // header / tab bar backdrop blur
} as const;
