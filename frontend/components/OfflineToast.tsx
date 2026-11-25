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
import BrandIcon from "@/components/brand/BrandIcon";
import { ICON_PATHS, radius, soraFamily, spacing } from "@/constants/brand";
import { Colors } from "@/constants/Colors";
import {
  OFFLINE_DETAIL,
  OFFLINE_TITLE,
  useIsOffline,
} from "@/context/OfflineStatusContext";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";
import Svg, { Path } from "react-native-svg";

const SLIDE_DISTANCE = 24;
export const OFFLINE_TOAST_ANIMATION_MS = 200;
const TOAST_PADDING_VERTICAL = 12;
// Clear of whatever it sits on: the tab bar, or the screen's bottom edge.
const TOAST_GAP = 8;

/** The brand wifi icon, struck through. */
const WifiOffIcon = ({ color }: { color: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    {[...ICON_PATHS.wifi, "M3.5 3.5l17 17"].map((d) => (
      <Path
        key={d}
        d={d}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ))}
  </Svg>
);

type OfflineToastProps = {
  /** Distance from the bottom of the parent, e.g. the tab bar's height. */
  bottom: number;
  /**
   * Room to leave under the toast for the home indicator, when it sits on the screen's
   * bottom edge.
   */
  bottomInset?: number;
  /** Puts the toast away by itself this long after it appears. Unset, it stays up. */
  autoHideMs?: number;
  /** Told the toast's height, so a screen can keep its own bottom-pinned views above it. */
  onHeight?: (height: number) => void;
  /** Told when the toast comes up or is put away. */
  onVisibleChange?: (visible: boolean) => void;
};

/**
 * Tells the user the device is offline, or the backend is out of reach right now.
 *
 * Slides up from the bottom when the connection drops, and stays until the connection
 * comes back or the user closes it. Each toast is closed on its own: a screen opened
 * during the outage shows it again, and closing it there leaves the other screens' alone. It reports a failing network and nothing else — the session is still valid, so the
 * copy must not read as a sign-out. Needs an OfflineStatusProvider above it.
 */
const OfflineToast = ({
  bottom,
  bottomInset = 0,
  autoHideMs,
  onHeight,
  onVisibleChange,
}: OfflineToastProps) => {
  const colorScheme = useColorScheme() ?? "light";
  const styles = createStyles(colorScheme);
  const offline = useIsOffline();
  const [dismissed, setDismissed] = useState(false);
  const dismiss = useCallback(() => setDismissed(true), []);
  // A dismissal holds until the connection comes back: going offline again after that is
  // news, staying offline is not.
  const visible = offline && !dismissed;
  // Stays mounted through the slide-out, so it does not just blink away.
  const [rendered, setRendered] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!offline) {
      setDismissed(false);
    }
  }, [offline]);

  useEffect(() => {
    if (visible) {
      setRendered(true);
    }
    onVisibleChange?.(visible);
  }, [visible, onVisibleChange]);

  // Dismissing, not just hiding: the outage has been told on this screen, so the toast
  // stays away here until the connection comes back.
  useEffect(() => {
    if (!visible || autoHideMs === undefined) {
      return;
    }
    const timer = setTimeout(dismiss, autoHideMs);
    return () => clearTimeout(timer);
  }, [visible, autoHideMs, dismiss]);

  // Only once the view is mounted: a native-driven animation started on a value no view
  // is attached to yet never reaches the view, which then sits there at opacity 0.
  useEffect(() => {
    if (!rendered) {
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: OFFLINE_TOAST_ANIMATION_MS,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) {
        setRendered(false);
      }
    });
    return () => animation.stop();
  }, [visible, rendered, progress]);

  if (!rendered) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom,
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [SLIDE_DISTANCE, 0],
              }),
            },
          ],
        },
      ]}
      onLayout={(event) => onHeight?.(event.nativeEvent.layout.height)}
      // Only the toast itself takes taps; the strip around it belongs to the screen.
      pointerEvents={visible ? "box-none" : "none"}
    >
      <View
        style={[styles.toast, { marginBottom: TOAST_GAP + bottomInset }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <View
          // Decoration: the message already says it.
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <WifiOffIcon color={Colors[colorScheme].offlineTextColor} />
        </View>
        <View style={styles.message}>
          <Text style={styles.title}>{OFFLINE_TITLE}</Text>
          <Text style={styles.detail}>{OFFLINE_DETAIL}</Text>
        </View>
        <Pressable
          onPress={dismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <BrandIcon
            name="close"
            size={18}
            color={Colors[colorScheme].offlineTextColor}
          />
        </Pressable>
      </View>
    </Animated.View>
  );
};

export default OfflineToast;

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    // A floating card just above the tab bar or the screen's bottom. The spec has no
    // offline token, so it is built on the theme's error colour.
    container: {
      position: "absolute",
      left: spacing.screen,
      right: spacing.screen,
      zIndex: 20,
      elevation: 20,
    },
    toast: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: TOAST_PADDING_VERTICAL,
      borderRadius: radius.input,
      backgroundColor: Colors[colorScheme].offlineBackgroundColor,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 6,
    },
    message: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontFamily: soraFamily[600],
      fontSize: 14,
      color: Colors[colorScheme].offlineTextColor,
    },
    detail: {
      fontFamily: soraFamily[400],
      fontSize: 13,
      color: Colors[colorScheme].offlineTextColor,
    },
  });
