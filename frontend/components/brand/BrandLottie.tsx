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
import { easing } from "@/constants/brand";
import LottieView, { type AnimationObject } from "lottie-react-native";
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import ChoreoMark, { MARK_ASPECT } from "./ChoreoMark";

interface BrandLottieProps {
  source: AnimationObject;
  /** Rendered width; height follows the composition's aspect ratio. */
  width: number;
  aspect: number;
  color: string;
  intro: { durationMs: number; fromScaleX: number };
}

/** Follows the OS reduce-motion setting live, not just its value at startup. */
function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

/**
 * Plays one of the baked brand loops (assets/brand/lottie) tinted to `color`.
 * The file is a seamless loop; the spec's intro (fade + grow) is played here.
 * With reduce-motion on, the static mark is shown instead.
 */
export default function BrandLottie({ source, width, aspect, color, intro }: BrandLottieProps) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: intro.durationMs,
      easing: Easing.bezier(...easing.standard),
    });
  }, [progress, intro.durationMs]);

  const introStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: intro.fromScaleX + (1 - intro.fromScaleX) * progress.value }],
  }));

  if (reduceMotion) {
    // Static mark keeps the same box so layouts don't jump.
    const markWidth = (width * aspect) / MARK_ASPECT;
    return (
      <Animated.View style={{ width, height: width * aspect, alignItems: "center", justifyContent: "center" }}>
        <ChoreoMark width={Math.min(width, markWidth)} color={color} />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ width, height: width * aspect }, introStyle]}>
      <LottieView
        source={source}
        autoPlay
        loop
        resizeMode="contain"
        colorFilters={[{ keypath: "mark", color }]}
        style={{ width: "100%", height: "100%" }}
      />
    </Animated.View>
  );
}
