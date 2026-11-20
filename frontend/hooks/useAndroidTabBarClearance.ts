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
import { isAndroid, TAB_BAR_EXTRA_INSET } from "@/constants/Constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Bottom padding an Android tab screen needs to keep its last row clear of the tab bar.
 *
 * react-native-screens 4.16 sizes the tab screen to the whole tab host in JS (the native
 * content frame above the BottomNavigationView is never reported back to Yoga), so the
 * screen's content runs under the Material bar and the system nav bar. iOS gets the same
 * clearance from `contentInsetAdjustmentBehavior="automatic"`, so this is 0 there.
 * Read it outside any nested SafeAreaProvider, where the bottom inset is the nav bar.
 */
export function useAndroidTabBarClearance(): number {
  const { bottom } = useSafeAreaInsets();
  return isAndroid ? bottom + TAB_BAR_EXTRA_INSET : 0;
}
