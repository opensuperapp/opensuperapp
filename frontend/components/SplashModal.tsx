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
import WheelLoader from "@/components/brand/WheelLoader";
import { brand, duration, easing, launch, size } from "@/constants/brand";
import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

/**
 * The launch screen: Midnight in both themes, the white mark playing the Wheel.
 * When `loading` turns off, the mark grows to 1.12 and the screen fades out over the app.
 *
 * It is a plain overlay, not a Modal, so it never sits above sheets the app opens at launch,
 * and it stops taking touches the moment loading ends. Unmounting runs on a JS timer rather
 * than the animation callback, so a cancelled animation can't leave it stuck on screen.
 */
const SplashModal = ({ loading }: { loading: boolean }) => {
  const { width } = useWindowDimensions();
  const markWidth = Math.min(
    width * size.launchMark.widthRatio,
    size.launchMark.max,
  );
  const [visible, setVisible] = useState(loading);
  const exit = useSharedValue(0);

  useEffect(() => {
    if (loading) {
      exit.value = 0;
      setVisible(true);
      return;
    }
    exit.value = withTiming(1, {
      duration: duration.launchExit,
      easing: Easing.bezier(...easing.standard),
    });
    const timer = setTimeout(() => setVisible(false), duration.launchExit);
    return () => clearTimeout(timer);
  }, [loading, exit]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
    transform: [{ scale: 1 + (launch.exitScale - 1) * exit.value }],
  }));

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.screen, screenStyle]}
      pointerEvents={loading ? "auto" : "none"}
    >
      <Animated.View style={markStyle}>
        <WheelLoader size={markWidth} color="#FFFFFF" />
      </Animated.View>
    </Animated.View>
  );
};

export default SplashModal;

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: brand.midnight,
  },
});
