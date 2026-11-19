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
 * Choreo Labs icons, copied verbatim from the handoff (source/icons.jsx).
 * All paths are on a 24×24 grid, round caps and joins. Render with react-native-svg <Path>.
 *
 * UI icons (ICON_PATHS): stroke currentColor, width 1.6 (tab bar 1.5, selected 1.9), fill none.
 *   Special case "apps" (tab icon) is a 3×3 dot grid at x/y ∈ {5,12,19}: r 1.9 outlined
 *   (stroke 1.4) normally, r 2.1 filled when selected.
 * App glyphs (GLYPHS): `b` = base strokes in text colour, `a` = accent strokes in cobalt
 *   (Azure on dark, Cobalt on light), `dot` = filled accent dot (r 1.5).
 *   GLYPH_FILLS lists which base (`f`) / accent (`af`) paths get the soft Halo fill.
 */

export const ICON_PATHS = {
  feed: ['M12 3 3 7.5l9 4.5 9-4.5L12 3Z', 'M3 12l9 4.5 9-4.5', 'M3 16.5 12 21l9-4.5'],
  library: ['M12 6.5C10 5 7 4.5 3.5 4.5v14c3.5 0 6.5.5 8.5 2 2-1.5 5-2 8.5-2v-14C17 4.5 14 5 12 6.5Z', 'M12 6.5v14'],
  chat: ['M5 4.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 3.5v-3.5H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z', 'M8 11h.01M12 11h.01M16 11h.01'],
  profile: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M12 6.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z', 'M6.2 18.4c1.3-2 3.4-3 5.8-3s4.5 1 5.8 3'],
  search: ['M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z', 'M20 20l-4.2-4.2'],
  bell: ['M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z', 'M10 20.5a2 2 0 0 0 4 0'],
  store: ['M4 9.5 5.5 4h13L20 9.5', 'M4 9.5c0 1.4 1.1 2.5 2.7 2.5s2.6-1.1 2.6-2.5c0 1.4 1.2 2.5 2.7 2.5s2.7-1.1 2.7-2.5c0 1.4 1.1 2.5 2.6 2.5S20 10.9 20 9.5', 'M5 12v8h14v-8', 'M10 20v-4.5h4V20'],
  card: ['M5 5.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z', 'M3 10h18', 'M6.5 14.5h4'],
  close: ['M6 6l12 12M18 6 6 18'],
  back: ['M15 5l-7 7 7 7'],
  send: ['M4 12 20 4l-4 16-4.5-6.5L4 12Z', 'M11.5 13.5 20 4'],
  menu: ['M4 8h16M4 16h11'],
  mail: ['M5 5.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z', 'm3.5 7 8.5 6 8.5-6'],
  user: ['M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5'],
  logout: ['M14 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8', 'M10 12h10', 'm16.5 8.5 3.5 3.5-3.5 3.5'],
  doc: ['M7 3.5h7l4 4v13H7Z', 'M14 3.5v4h4', 'M9.5 12h6M9.5 15.5h6'],
  news: ['M3.5 4.5h13v15h-11a2 2 0 0 1-2-2Z', 'M16.5 8h3v9.5a2 2 0 0 1-4 0', 'M6.5 8h7M6.5 11.5h7M6.5 15h4.5'],
  arrow: ['M5 12h14M13 6l6 6-6 6'],
  info: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M12 11v5.5M12 7.8v.2'],
  share: ['M12 3.5v11', 'm7.5 8 4.5-4.5L16.5 8', 'M7 11H5v9.5h14V11h-2'],
  download: ['M12 4v11', 'm7.5 10.5 4.5 4.5 4.5-4.5', 'M5 19.5h14'],
  wallet: ['M5.5 6h13a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-9A2.5 2.5 0 0 1 5.5 6Z', 'M3 10.5h18', 'M15.5 15h2.5'],
  check: ['m5 12.5 4.5 4.5L19 7'],
  plus: ['M12 5v14M5 12h14'],
  trash: ['M5 7h14', 'M9.5 7V4.5h5V7', 'M6.5 7l1 13h9l1-13'],
  calendar: ['M5.5 5h13a2 2 0 0 1 2 2v11.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z', 'M3.5 10h17', 'M8 3v4M16 3v4'],
  wifi: ['M3 9.5a13 13 0 0 1 18 0', 'M6 12.8a8.5 8.5 0 0 1 12 0', 'M9 16a4 4 0 0 1 6 0', 'M12 19.2h.01'],
  flip: ['M4 12a8 8 0 0 1 13.7-5.6L20 8.5', 'M20 4v4.5h-4.5', 'M20 12a8 8 0 0 1-13.7 5.6L4 15.5', 'M4 20v-4.5h4.5'],
  edit: ['M4 20h4L19 9l-4-4L4 16v4Z', 'M13.5 6.5l4 4'],
  copy: ['M9 9h10v11H9Z', 'M5 15V4h10']
} satisfies Record<string, readonly string[]>;

export interface Glyph { b: readonly string[]; a: readonly string[]; dot?: readonly [number, number] }

export const GLYPHS: Record<AppGlyphId, Glyph> = {
  access:   { b: ['M9 3.5h10v17H9', 'M6 20.5h15', 'M15.5 12v.5'], a: ['M3 12h8.5', 'm8.5 9 3 3-3 3'] },
  auth:     { b: ['M12 3 5 6v5.5c0 4.3 3 7.7 7 9.5 4-1.8 7-5.2 7-9.5V6l-7-3Z'], a: ['M12 8.6a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8Z', 'M12 12.4v3.2'] },
  carlift:  { b: ['M4.5 18.5v-3.8l2-4.2h11l2 4.2v3.8Z', 'M3 21h18', 'M8 15.5h.01M16 15.5h.01'], a: ['M9 7.5V2.8', 'M7.2 4.5 9 2.7l1.8 1.8', 'M15 2.8v4.7', 'M13.2 5.8 15 7.6l1.8-1.8'] },
  portal:   { b: ['M5 14v-2a7 7 0 0 1 14 0v2', 'M5 13.5h2.5v5H6a1 1 0 0 1-1-1Z', 'M19 13.5h-2.5v5H18a1 1 0 0 0 1-1Z'], a: ['M18 18.5c0 1.5-1.8 2.5-4.5 2.5'] },
  dod:      { b: ['M3.5 12h17a8.5 8.5 0 0 1-17 0Z', 'M9 20.8h6'], a: ['M8.5 8.5c-.9-1 .9-2.2 0-3.6', 'M12 8.5c-.9-1 .9-2.2 0-3.6', 'M15.5 8.5c-.9-1 .9-2.2 0-3.6'] },
  wifi:     { b: ['M3 9.5a13 13 0 0 1 18 0', 'M6 12.8a8.5 8.5 0 0 1 12 0', 'M9 16a4 4 0 0 1 6 0'], a: ['M12 19.3h.01'], dot: [12, 19.3] },
  leave:    { b: ['M3 17h18', 'M6.5 20.5h11', 'M12 4v2.5', 'M5 7.5l1.7 1.7', 'M19 7.5l-1.7 1.7'], a: ['M7 17a5 5 0 0 1 10 0'] },
  menu:     { b: ['M7 3v6a2 2 0 0 0 4 0V3', 'M9 11v10'], a: ['M17 21V3c-1.8 1.2-2.7 3.5-2.7 6.5V13H17'] },
  opd:      { b: ['M6 3.5h8l4 4v13H6Z', 'M14 3.5v4h4'], a: ['M12 11v6', 'M9 14h6'] },
  people:   { b: ['M9 5.3a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z', 'M3 19.5c.6-3 3-4.8 6-4.8s5.4 1.8 6 4.8'], a: ['M16.5 6.5a2.5 2.5 0 1 1 0 5', 'M17 14.4c2.2.3 3.6 1.9 4 4.6'] },
  sub:      { b: ['M4 12a8 8 0 0 1 13.7-5.6L20 8.5', 'M20 4v4.5h-4.5'], a: ['M20 12a8 8 0 0 1-13.7 5.6L4 15.5', 'M4 20v-4.5h4.5'] },
  visitor:  { b: ['M6 6h12a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z', 'M9.5 6V3.5h5V6', 'M14 11.5h3M14 15h3'], a: ['M9.5 10.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z', 'M7 17.5c.4-1.3 1.3-2 2.5-2s2.1.7 2.5 2'] },
  con:      { b: ['M3.5 7h17v3.2a1.8 1.8 0 0 0 0 3.6V17h-17v-3.2a1.8 1.8 0 0 0 0-3.6Z'], a: ['M14.5 9.5v1M14.5 13.5v1', 'M7.5 12h3'] },
  attendees:{ b: ['M4 8.5V4h4.5', 'M15.5 4H20v4.5', 'M20 15.5V20h-4.5', 'M8.5 20H4v-4.5'], a: ['M7 12h10'] },
  wallet:   { b: ['M5.5 7h13A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-8A2.5 2.5 0 0 1 5.5 7Z', 'M6 7l9.5-3.2A1.5 1.5 0 0 1 17.5 5.2V7'], a: ['M21 11.5h-4a2 2 0 0 0 0 4h4'] }
};

export const GLYPH_FILLS: Record<AppGlyphId, { f?: number[]; af?: number[] }> = {"access":{"f":[0]},"auth":{"f":[0],"af":[0]},"carlift":{"f":[0]},"portal":{"f":[1,2]},"dod":{"f":[0]},"wifi":{},"leave":{"af":[0]},"menu":{"f":[0],"af":[0]},"opd":{"f":[0]},"people":{"f":[0]},"sub":{},"visitor":{"f":[0],"af":[0]},"con":{"f":[0]},"attendees":{},"wallet":{"f":[0]}};

export type AppGlyphId =
  | "access" | "auth" | "carlift" | "portal" | "dod" | "wifi" | "leave" | "menu"
  | "opd" | "people" | "sub" | "visitor" | "con" | "attendees" | "wallet";

/** Display names for the 15 apps. */
export const APP_NAMES: Record<AppGlyphId, string> = {
  access: "Access",
  auth: "Authenticator",
  carlift: "Car Lift",
  con: "Choreo Labs Con",
  attendees: "Choreo Labs Con Attendees",
  portal: "Customer Portal",
  dod: "DoD",
  wifi: "GuestWiFi",
  leave: "Leave",
  menu: "Menu",
  opd: "OPD Claims",
  people: "People",
  sub: "Subscription",
  visitor: "Visitor",
  wallet: "Wallet",
};

/** Apps that ship installed and cannot be removed (Store shows "Default"). */
export const DEFAULT_APPS: readonly AppGlyphId[] = ["portal", "con", "wallet"];
