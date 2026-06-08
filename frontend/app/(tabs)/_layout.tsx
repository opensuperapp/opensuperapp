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
import { HapticTab } from "@/components/HapticTab";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import {
  CHAT_TAB_NAME,
  FEED_TAB_NAME,
  LIBRARY_TAB_NAME,
  MY_APPS_TAB_NAME,
  PROFILE_TAB_NAME,
} from "@/constants/Constants";
import { RootState } from "@/context/store";
import { DEFAULT_TAB_CONFIG } from "@/types/remoteConfig.types";
import { useTabVisibilityRules } from "@/hooks/useRemoteConfig";
import { useRestoreLastTab } from "@/hooks/useRestoreLastTab";
import { shouldShowTab } from "@/utils/tabVisibility";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSelector } from "react-redux";

type TabType = {
  name: string;
  requiresAuth?: boolean;
  options: {
    headerShown: boolean;
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconFocused: keyof typeof Ionicons.glyphMap;
  };
};

const tabs: TabType[] = [
  {
    name: "index",
    options: {
      headerShown: true,
      title: FEED_TAB_NAME,
      icon: "layers-outline",
      iconFocused: "layers-sharp",
    },
  },
  {
    name: "library",
    options: {
      headerShown: true,
      title: LIBRARY_TAB_NAME,
      icon: "book-outline",
      iconFocused: "book",
    },
  },
  {
    name: "apps",
    options: {
      headerShown: false,
      title: MY_APPS_TAB_NAME,
      icon: "apps-outline",
      iconFocused: "apps",
    },
  },
  {
    name: "chat",
    requiresAuth: true,
    options: {
      headerShown: false,
      title: CHAT_TAB_NAME,
      icon: "chatbubble-ellipses-outline",
      iconFocused: "chatbubble-ellipses",
    },
  },
  {
    name: "profile",
    options: {
      headerShown: true,
      title: PROFILE_TAB_NAME,
      icon: "person-circle-outline",
      iconFocused: "person-circle",
    },
  },
];

export default function TabLayout() {
  useRestoreLastTab();

  const authEmail = useSelector((state: RootState) => state.auth.email);
  const workEmail = useSelector(
    (state: RootState) => state.userInfo.userInfo?.workEmail
  );
  const email = authEmail ?? workEmail ?? null;
  const authState = useSelector((state: RootState) => state.auth.accessToken);
  const isAuthenticated = Boolean(authState);

  const { loading, rules } = useTabVisibilityRules();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.companyOrange,
        headerShown: true,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: "absolute",
          },
        }),
      }}
    >
      {tabs.map((tab, index) => {
        const effectiveRules = loading ? DEFAULT_TAB_CONFIG : rules;
        const showTab = shouldShowTab(tab.name, email, isAuthenticated, effectiveRules);

        return (
          <Tabs.Screen
            key={`tab-${index}`}
            name={tab.name}
            options={{
              tabBarAccessibilityLabel: `tab_${tab.name}`,
              headerShown: tab.options.headerShown,
              title: tab.options.title,
              headerTitleAllowFontScaling: false,
              href: showTab ? undefined : null,
              tabBarIcon: ({ focused, color }) => (
                <Ionicons
                  name={focused ? tab.options.iconFocused : tab.options.icon}
                  size={28}
                  color={color}
                />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
