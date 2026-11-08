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
import OfflineAwareTabBar from "@/components/OfflineAwareTabBar";
import SimulateOfflineButton from "@/components/SimulateOfflineButton";
import { tabRootHeaderOptions } from "@/components/headers/navigationTheme";
import TabBarIcon, { type TabIconName } from "@/components/tabbar/TabBarIcon";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { textStyle, type } from "@/constants/brand";
import {
  CHAT_TAB_NAME,
  FEED_TAB_NAME,
  LIBRARY_TAB_NAME,
  MY_APPS_TAB_NAME,
  PROFILE_TAB_NAME,
} from "@/constants/Constants";
import { selectIsSignedIn } from "@/context/slices/authSlice";
import { RootState } from "@/context/store";
import { DEFAULT_TAB_CONFIG } from "@/types/remoteConfig.types";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useTabVisibilityRules } from "@/hooks/useRemoteConfig";
import { useRestoreLastTab } from "@/hooks/useRestoreLastTab";
import { shouldShowTab } from "@/utils/tabVisibility";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

// Bar: 6 top padding, a 52+ item (5 padding, 26 icon, 3 gap, label), then the safe area.
const TAB_BAR_PADDING_TOP = 6;
const TAB_BAR_CONTENT_HEIGHT = 62;

type TabType = {
  name: string;
  requiresAuth?: boolean;
  options: {
    headerShown: boolean;
    title: string;
    icon: TabIconName;
  };
};

const tabs: TabType[] = [
  {
    name: "index",
    options: {
      headerShown: true,
      title: FEED_TAB_NAME,
      icon: "feed",
    },
  },
  {
    name: "library",
    options: {
      headerShown: true,
      title: LIBRARY_TAB_NAME,
      icon: "library",
    },
  },
  {
    name: "apps",
    options: {
      headerShown: false,
      title: MY_APPS_TAB_NAME,
      icon: "apps",
    },
  },
  {
    name: "chat",
    requiresAuth: true,
    options: {
      headerShown: false,
      title: CHAT_TAB_NAME,
      icon: "chat",
    },
  },
  {
    name: "profile",
    options: {
      headerShown: true,
      title: PROFILE_TAB_NAME,
      icon: "profile",
    },
  },
];

export default function TabLayout() {
  const authEmail = useSelector((state: RootState) => state.auth.email);
  const workEmail = useSelector(
    (state: RootState) => state.userInfo.userInfo?.workEmail
  );
  const email = authEmail ?? workEmail ?? null;
  const isAuthenticated = useSelector(selectIsSignedIn);
  const { colors } = useBrandTheme();
  const insets = useSafeAreaInsets();

  const { loading, rules } = useTabVisibilityRules();
  const effectiveRules = loading ? DEFAULT_TAB_CONFIG : rules;

  useRestoreLastTab(
    (tabName) => shouldShowTab(tabName, email, isAuthenticated, effectiveRules),
    !loading
  );

  return (
    <Tabs
      tabBar={(props) => <OfflineAwareTabBar {...props} />}
      screenOptions={{
        ...tabRootHeaderOptions(colors),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.text3,
        headerShown: true,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground
          ? () => <TabBarBackground />
          : undefined,
        // headerRight is taken by some tabs; the left is free on all of them.
        headerLeft: __DEV__ ? () => <SimulateOfflineButton /> : undefined,
        tabBarLabelPosition: "below-icon",
        tabBarIconStyle: styles.icon,
        tabBarStyle: [
          {
            height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
            paddingTop: TAB_BAR_PADDING_TOP,
            borderTopColor: colors.line,
          },
          Platform.select({
            ios: { position: "absolute" as const },
            default: { backgroundColor: colors.bar },
          }),
        ],
      }}
    >
      {tabs.map((tab, index) => {
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
                <TabBarIcon
                  name={tab.options.icon}
                  focused={focused}
                  color={color}
                />
              ),
              tabBarLabel: ({ focused, color, children }) => (
                <Text
                  style={[
                    styles.label,
                    focused && styles.labelSelected,
                    { color },
                  ]}
                  allowFontScaling={false}
                  numberOfLines={1}
                >
                  {children}
                </Text>
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 26,
    height: 26,
  },
  label: {
    ...textStyle(type.tabLabel),
    letterSpacing: 0.11,
    marginTop: 3,
  },
  labelSelected: {
    ...textStyle(type.tabLabelSelected),
  },
});
