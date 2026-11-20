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
import BrandIcon from "@/components/brand/BrandIcon";
import TabStack from "@/components/headers/TabStack";
import { brand } from "@/constants/brand";
import { MY_APPS_TAB_NAME } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { selectIsSignedIn } from "@/context/slices/authSlice";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useNotifications } from "@/hooks/useNotifications";
import { router, Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";

export default function AppsStack() {
  const { hasUnread } = useNotifications();
  const isSignedIn = useSelector(selectIsSignedIn);
  const { colors } = useBrandTheme();

  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hasUnread) {
      shakeAnimation.setValue(0);
      return;
    }

    const timing = (toValue: number, duration: number) =>
      Animated.timing(shakeAnimation, {
        toValue,
        duration,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      });

    const singleShake = Animated.sequence([
      timing(-25, 80),
      timing(25, 120),
      timing(-18, 100),
      timing(0, 140),
    ]);

    const loopAnimation = Animated.loop(
      Animated.sequence([
        singleShake,
        Animated.delay(120),
        singleShake,
        Animated.delay(120),
        singleShake,
        Animated.delay(2200),
      ])
    );

    loopAnimation.start();

    return () => {
      loopAnimation.stop();
      shakeAnimation.setValue(0);
    };
  }, [hasUnread]);

  const rotate = shakeAnimation.interpolate({
    inputRange: [-25, 25],
    outputRange: ["-25deg", "25deg"],
  });

  return (
    <TabStack>
      <Stack.Screen
        name="index"
        options={{
          title: MY_APPS_TAB_NAME,
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <TouchableOpacity
                onPressIn={() => router.push(ScreenPaths.STORE)}
                style={headerAction}
                accessibilityLabel="Store"
                accessibilityRole="button"
              >
                <BrandIcon name="store" size={24} color={colors.accent} />
              </TouchableOpacity>

              {isSignedIn ? (
                <TouchableOpacity
                  onPressIn={() => router.push(ScreenPaths.NOTIFICATIONS)}
                  style={headerAction}
                  accessibilityLabel="Notifications"
                  accessibilityRole="button"
                >
                  <View>
                    <Animated.View style={{ transform: [{ rotate }] }}>
                      <BrandIcon name="bell" size={24} color={colors.accent} />
                    </Animated.View>
                    {hasUnread && (
                      <View
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          borderWidth: 2,
                          borderColor: colors.bg,
                          backgroundColor: brand.signal,
                        }}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="store"
        options={{
          ...pushedOptions,
          title: "Store",
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          ...pushedOptions,
          title: "Notifications",
        }}
      />
    </TabStack>
  );
}

// Pushed from the large-title root: a standard bar, still translucent over the content,
// with the native back button labelled after the tab.
const pushedOptions = {
  headerLargeTitle: false,
  headerBackTitle: MY_APPS_TAB_NAME,
} as const;

const headerAction = {
  width: 44,
  height: 44,
  alignItems: "center",
  justifyContent: "center",
} as const;
