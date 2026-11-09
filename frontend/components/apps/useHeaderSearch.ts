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
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { NavigationContext } from "@react-navigation/native";
import { useContext, useLayoutEffect } from "react";

interface HeaderSearchOptions {
  /** Receives the query as typed; cancel clears it. */
  onChangeQuery: (query: string) => void;
  /** Off while the screen has nothing to search, e.g. behind the sign-in gate. */
  enabled?: boolean;
  /** Keep the bar visible while the content scrolls; for screens where search is primary. */
  pinned?: boolean;
}

/**
 * Installs the native header search bar (UISearchController on iOS, Material search on
 * Android) on the current stack screen.
 *
 * Reads the navigation from context rather than useNavigation, so a screen rendered on
 * its own (as the jest suites do) simply has no header to configure instead of throwing.
 */
export function useHeaderSearch({
  onChangeQuery,
  enabled = true,
  pinned = false,
}: HeaderSearchOptions) {
  const navigation = useContext(NavigationContext);
  const { colors } = useBrandTheme();

  useLayoutEffect(() => {
    if (!navigation) return;
    navigation.setOptions({
      headerSearchBarOptions: enabled
        ? {
            placeholder: "Search by keywords",
            onChangeText: (e: { nativeEvent: { text: string } }) =>
              onChangeQuery(e.nativeEvent.text),
            onCancelButtonPress: () => onChangeQuery(""),
            hideWhenScrolling: !pinned,
            autoCapitalize: "none",
            tintColor: colors.accent,
            textColor: colors.text,
            hintTextColor: colors.text3,
            headerIconColor: colors.accent,
          }
        : undefined,
    });
  }, [navigation, enabled, pinned, onChangeQuery, colors]);
}
