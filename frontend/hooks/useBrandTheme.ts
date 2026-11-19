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
import { themes, type ThemeColors, type ThemeName } from "@/constants/brand";
import { useColorScheme } from "@/hooks/useColorScheme";

export interface BrandTheme {
  scheme: ThemeName;
  isDark: boolean;
  colors: ThemeColors;
}

/**
 * Choreo Labs theme for the current OS colour scheme.
 * Dark is the primary theme, so an unknown scheme resolves to dark.
 */
export function useBrandTheme(): BrandTheme {
  const scheme: ThemeName = useColorScheme() === "light" ? "light" : "dark";
  return { scheme, isDark: scheme === "dark", colors: themes[scheme] };
}
