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
import OfflineToast from "@/components/OfflineToast";
import { largeTitleHeaderOptions } from "@/components/headers/navigationTheme";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

/** Reads the insets of the provider around it, which includes the tab bar. */
function TabOfflineToast() {
  const insets = useSafeAreaInsets();
  return <OfflineToast bottom={0} bottomInset={insets.bottom} />;
}

/**
 * A tab's own native stack: large-title bar on its root, native pushes beneath it.
 *
 * The offline toast lives here rather than in the tab bar: the bar is native now, so the
 * toast sits on the tab's content instead. That content runs under the bar on iOS, and
 * the root provider's bottom inset is only the home indicator, so the toast measures
 * its own provider here, whose safe area includes the bar.
 */
export default function TabStack({ children }: { children?: ReactNode }) {
  const { colors } = useBrandTheme();
  return (
    <>
      <Stack screenOptions={largeTitleHeaderOptions(colors)}>
        {children}
      </Stack>
      <SafeAreaProvider style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <TabOfflineToast />
      </SafeAreaProvider>
    </>
  );
}
