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
import { useColorScheme as useRNColorScheme } from "react-native";

export type AppColorScheme = "light" | "dark";

/**
 * The OS colour scheme, narrowed to the schemes the app has colours for.
 * React Native 0.82+ can report "unspecified"; that, null and undefined all
 * come back as null so callers can keep writing `scheme ?? "light"`.
 */
export function useColorScheme(): AppColorScheme | null {
  const scheme = useRNColorScheme();
  return scheme === "light" || scheme === "dark" ? scheme : null;
}
