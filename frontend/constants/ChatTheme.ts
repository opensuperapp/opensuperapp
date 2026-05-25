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

import { Colors } from "@/constants/Colors";

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
}

/**
 * Resolves chat UI colors for light or dark mode.
 *
 * @param {boolean} isDark - Whether dark mode is active.
 * @returns {ChatThemePalette} Theme palette for chat screens.
 */
export const getChatTheme = (isDark: boolean): ChatThemePalette =>
  isDark
    ? {
        background: "#131314",
        surface: "#1e1f20",
        inputSurface: "#282a2d",
        inputBorder: "#3c4043",
        userBubble: "#3c4043",
        userText: "#e3e3e3",
        assistantText: "#e3e3e3",
        muted: "#9aa0a6",
        border: "#3c4043",
        chipBg: "#282a2d",
        chipText: "#c4c7c5",
        accent: Colors.companyOrange,
        accentMuted: Colors.companyOrange,
        drawerActive: "#282a2d",
        newChatButton: "#282a2d",
        shadow: "rgba(0,0,0,0.4)",
        gradientBottom: "rgba(255,115,0,0.08)",
      }
    : {
        background: "#ffffff",
        surface: "#f5f5f6",
        inputSurface: "#ffffff",
        inputBorder: "#e0e3e7",
        userBubble: "#f0f4f9",
        userText: "#1f1f1f",
        assistantText: "#1f1f1f",
        muted: "#5f6368",
        border: "#e8eaed",
        chipBg: "#f5f5f6",
        chipText: "#444746",
        accent: Colors.companyOrange,
        accentMuted: Colors.companyOrange,
        drawerActive: Colors.companyOrange15,
        newChatButton: "#f5f5f6",
        shadow: "rgba(60,64,67,0.12)",
        gradientBottom: "rgba(255,115,0,0.12)",
      };
