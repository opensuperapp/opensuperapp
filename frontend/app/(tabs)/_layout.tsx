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
import { soraFamily } from "@/constants/brand";
import {
  CHAT_TAB_NAME,
  FEED_TAB_NAME,
  LIBRARY_TAB_NAME,
  MY_APPS_TAB_NAME,
  PROFILE_TAB_NAME,
} from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { selectIsSignedIn } from "@/context/slices/authSlice";
import { RootState } from "@/context/store";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useLeaveHiddenTab } from "@/hooks/useLeaveHiddenTab";
import { useTabVisibilityRules } from "@/hooks/useRemoteConfig";
import { useRestoreLastTab } from "@/hooks/useRestoreLastTab";
import { shouldShowTab } from "@/utils/tabVisibility";
import {
  Icon,
  Label,
  NativeTabs,
} from "expo-router/unstable-native-tabs";
import type { ImageSourcePropType } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";
import { useSelector } from "react-redux";

interface TabDef {
  /** Key in the remote visibility rules. */
  rule: string;
  /** Route folder under app/(tabs). */
  route: string;
  /** Where navigating to the tab lands. */
  path: ScreenPaths;
  title: string;
  sf: { default: SFSymbol; selected: SFSymbol };
  android: { default: ImageSourcePropType; selected: ImageSourcePropType };
}

// iOS draws SF Symbols; Android draws the brand outline icons (assets/images/tabs).
const TABS: TabDef[] = [
  {
    rule: "index",
    route: "(feed)",
    path: ScreenPaths.FEED,
    title: FEED_TAB_NAME,
    sf: { default: "newspaper", selected: "newspaper.fill" },
    android: {
      default: require("@/assets/images/tabs/feed.png"),
      selected: require("@/assets/images/tabs/feed-selected.png"),
    },
  },
  {
    rule: "library",
    route: "library",
    path: ScreenPaths.LIBRARY,
    title: LIBRARY_TAB_NAME,
    sf: { default: "books.vertical", selected: "books.vertical.fill" },
    android: {
      default: require("@/assets/images/tabs/library.png"),
      selected: require("@/assets/images/tabs/library-selected.png"),
    },
  },
  {
    rule: "apps",
    route: "apps",
    path: ScreenPaths.MY_APPS,
    title: MY_APPS_TAB_NAME,
    sf: { default: "square.grid.3x3", selected: "square.grid.3x3.fill" },
    android: {
      default: require("@/assets/images/tabs/apps.png"),
      selected: require("@/assets/images/tabs/apps-selected.png"),
    },
  },
  {
    rule: "chat",
    route: "chat",
    path: ScreenPaths.CHAT,
    title: CHAT_TAB_NAME,
    sf: {
      default: "bubble.left.and.bubble.right",
      selected: "bubble.left.and.bubble.right.fill",
    },
    android: {
      default: require("@/assets/images/tabs/chat.png"),
      selected: require("@/assets/images/tabs/chat-selected.png"),
    },
  },
  {
    rule: "profile",
    route: "profile",
    path: ScreenPaths.PROFILE,
    title: PROFILE_TAB_NAME,
    sf: { default: "person.crop.circle", selected: "person.crop.circle.fill" },
    android: {
      default: require("@/assets/images/tabs/profile.png"),
      selected: require("@/assets/images/tabs/profile-selected.png"),
    },
  },
];

/** The native tab bar (UITabBar on iOS, Material bottom navigation on Android). */
export default function TabLayout() {
  const authEmail = useSelector((state: RootState) => state.auth.email);
  const workEmail = useSelector(
    (state: RootState) => state.userInfo.userInfo?.workEmail
  );
  const email = authEmail ?? workEmail ?? null;
  const isAuthenticated = useSelector(selectIsSignedIn);
  const { colors } = useBrandTheme();

  // rules holds the defaults until the first fetch lands and keeps the last good
  // value through a refresh, so a refetch never flips a tab's hidden prop.
  const { loading, rules } = useTabVisibilityRules();
  const isVisible = (rule: string) =>
    shouldShowTab(rule, email, isAuthenticated, rules);

  useRestoreLastTab(isVisible, !loading);

  // A tab that loses its rule while focused stays shown until focus has moved off it:
  // NativeTabs cannot display a focused tab that is hidden.
  const isRouteHidden = (route: string) =>
    TABS.some((tab) => tab.route === route && !isVisible(tab.rule));
  const fallbackPath =
    TABS.find((tab) => isVisible(tab.rule))?.path ?? ScreenPaths.FEED;
  const leavingRoute = useLeaveHiddenTab(isRouteHidden, fallbackPath);

  return (
    <NativeTabs
      tintColor={colors.accent}
      // Selected colours must be explicit: `tintColor` only reaches the standard appearance,
      // so a short screen sitting at the scroll edge (My Apps, Profile) fell back to `text3`.
      iconColor={{ default: colors.text3, selected: colors.accent }}
      labelStyle={{
        default: { fontFamily: soraFamily[500], fontSize: 11 },
        selected: {
          fontFamily: soraFamily[500],
          fontSize: 11,
          color: colors.accent,
        },
      }}
      badgeBackgroundColor={colors.accent}
      indicatorColor={colors.card2}
      // Opaque, like the tab-root navbars (TabStack): solid colour, no blur, and it
      // stays solid at the scroll edge instead of turning clear.
      backgroundColor={colors.barSolid}
      blurEffect="none"
      disableTransparentOnScrollEdge
    >
      {TABS.map((tab) => (
        <NativeTabs.Trigger
          key={tab.route}
          name={tab.route}
          hidden={!isVisible(tab.rule) && tab.route !== leavingRoute}
        >
          <Icon sf={tab.sf} androidSrc={tab.android} />
          <Label>{tab.title}</Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
