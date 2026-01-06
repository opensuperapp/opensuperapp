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
import { Colors } from "@/constants/Colors";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { RootState } from "@/context/store";
import { useNotifications } from "@/hooks/useNotifications";
import { logout } from "@/services/authService";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSelector } from "react-redux";

export default function AppsStack() {
  const { hasUnread } = useNotifications(logout);
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const colorScheme = useColorScheme() ?? "light";

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
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: "My Apps",
          headerRight: () => (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 24 }}
            >
              <TouchableOpacity
                onPress={() => router.push(ScreenPaths.STORE)}
                hitSlop={20}
              >
                <Ionicons
                  name="storefront-outline"
                  size={24}
                  color={Colors.companyOrange}
                />
              </TouchableOpacity>

              {accessToken ? (
                <TouchableOpacity
                  onPress={() => router.push(ScreenPaths.NOTIFICATIONS)}
                  hitSlop={20}
                >
                  <View>
                    <Animated.View style={{ transform: [{ rotate }] }}>
                      <Ionicons
                        name="notifications-outline"
                        size={24}
                        color={Colors.companyOrange}
                      />
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
                          borderColor:
                            Colors[colorScheme].primaryBackgroundColor,
                          backgroundColor: "red",
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
          headerTitle: "Store",
          headerBackTitle: "My Apps",
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          headerTitle: "Notifications",
          headerBackTitle: "My Apps",
        }}
      />
    </Stack>
  );
}
