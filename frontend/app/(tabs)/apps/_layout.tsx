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

import SparkleIcon from "@/components/FloatingSparkle";
import { Colors } from "@/constants/Colors";
import { DOWNLOADED, isAndroid, isIos } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { MicroApp } from "@/context/slices/appSlice";
import { RootState } from "@/context/store";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useSelector } from "react-redux";

export default function AppsStack() {
  const apps: MicroApp[] = useSelector((state: RootState) => state.apps.apps);
  const localAppIds: MicroApp[] = apps.filter(
    (app) => app.status === DOWNLOADED
  );

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: "My Apps",
          headerRight: () => (
            <>
              {isIos && (
                <>
                  {localAppIds.length == 0 ? (
                    <SparkleIcon />
                  ) : (
                    <TouchableOpacity
                      onPress={() => router.push(ScreenPaths.STORE)}
                      hitSlop={20}
                      style={{ marginRight: 16 }}
                    >
                      <Ionicons
                        name="storefront-outline"
                        size={24}
                        color={Colors.companyOrange}
                      />
                    </TouchableOpacity>
                  )}
                </>
              )}
              {isAndroid && (
                <TouchableOpacity
                  onPressIn={() => router.push(ScreenPaths.STORE)}
                  hitSlop={20}
                  style={{ marginRight: 16 }}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={24}
                    color={Colors.companyOrange}
                  />
                </TouchableOpacity>
              )}
            </>
          ),
        }}
      />
      <Stack.Screen
        name="store"
        options={{
          headerTitle: "Store",
          headerBackTitle: "My Apps",
        }}
      />
    </Stack>
  );
}
