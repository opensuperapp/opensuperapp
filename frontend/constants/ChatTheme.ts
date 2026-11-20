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
import { brand, themes } from "@/constants/brand";

export interface ChatThemePalette {
  background: string;
  surface: string;
  inputSurface: string;
  inputBorder: string;
  userBubble: string;
  userText: string;
  assistantText: string;
  muted: string;
  border: string;
  chipBg: string;
  chipText: string;
  accent: string;
  accentMuted: string;
  drawerActive: string;
  shadow: string;
  newChatButton: string;
  gradientBottom: string;
  /** Raised surface (cards, menus); `surface` is the chip/pill tone. */
  card: string;
  /** Tertiary text: placeholders, timestamps, the "Recent" label. */
  subtle: string;
  /** Drawer and modal sheet background. */
  sheet: string;
  /** Backdrop behind the drawer and modals. */
  backdrop: string;
  /** Signal fill for the bot avatar and the active send button. */
  signal: string;
  /** Ink: the mark and icons drawn on a Signal fill. */
  onSignal: string;
  /** Cobalt brand highlight (the greeting name). Never interactive. */
  highlight: string;
}

const buildChatTheme = (isDark: boolean): ChatThemePalette => {
  const c = themes[isDark ? "dark" : "light"];
  return {
    background: c.bg,
    surface: c.card2,
    inputSurface: c.field,
    inputBorder: c.line2,
    userBubble: c.userBubble,
    userText: "#FFFFFF",
    assistantText: c.text,
    muted: c.text2,
    border: c.line,
    chipBg: c.card2,
    chipText: c.text,
    accent: c.accent,
    accentMuted: c.text2,
    drawerActive: c.card2,
    shadow: c.backdrop,
    newChatButton: c.primaryFill,
    gradientBottom: "transparent",
    card: c.card,
    subtle: c.text3,
    sheet: c.sheet,
    backdrop: c.backdrop,
    signal: brand.signal,
    onSignal: brand.ink,
    highlight: c.cobalt,
  };
};

// Built once per scheme, so a screen that depends on the palette (an effect calling
// navigation.setOptions, a memoised row) sees the same object on every render.
const CHAT_THEMES = { light: buildChatTheme(false), dark: buildChatTheme(true) };

/**
 * Resolves chat UI colors for light or dark mode from the Choreo Labs tokens.
 *
 * @param {boolean} isDark - Whether dark mode is active.
 * @returns {ChatThemePalette} Theme palette for chat screens; the same object for
 *   the same scheme on every call.
 */
export const getChatTheme = (isDark: boolean): ChatThemePalette =>
  CHAT_THEMES[isDark ? "dark" : "light"];
