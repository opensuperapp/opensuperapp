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
import ChoreoMark from "@/components/brand/ChoreoMark";
import WaveMark from "@/components/brand/WaveMark";
import { brand, easing, wave } from "@/constants/brand";
import React, { JSX } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
} from "react-native-reanimated";

export interface SuperAppAgentIconProps {
  size?: number;
  style?: ViewStyle;
  /** Waiting for a reply: plays the Wave in place of the static mark. */
  animated?: boolean;
}

// The Wave's own intro (fade + grow) brings it in; leaving, it fades over the same
// time while the static mark fades back, so the reply never cuts the animation off.
const CROSSFADE = Easing.bezier(...easing.standard);
const markIn = FadeIn.duration(wave.introMs).easing(CROSSFADE);
const markOut = FadeOut.duration(wave.introMs).easing(CROSSFADE);

/**
 * Assistant avatar: a Signal disc holding the Ink Choreo mark, which becomes the
 * Wave while a reply is awaited.
 *
 * @param {SuperAppAgentIconProps} props - Disc size, waiting state and optional style.
 * @returns {JSX.Element} Assistant avatar.
 */
const SuperAppAgentIcon = ({
  size = 30,
  style,
  animated = false,
}: SuperAppAgentIconProps): JSX.Element => {
  // Prototype: the mark is 50% of the disc.
  const markWidth = Math.round(size * 0.5);

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
      accessibilityLabel={
        animated ? "Assistant is typing" : "Choreo Labs AI assistant"
      }
      accessibilityRole={animated ? "progressbar" : undefined}
    >
      {/* skipEntering: a row that mounts already answered (history, scrolling back)
          shows its mark at once; only a reply arriving fades it in.
          skipExiting: when the whole avatar goes (its row removed, the chat switched
          or deleted) the mark goes with it; the fade-out only plays for the
          in-place swap between the Wave and the mark. */}
      <LayoutAnimationConfig skipEntering skipExiting>
        {animated ? (
          <Animated.View key="wave" style={styles.layer} exiting={markOut}>
            <WaveMark size={markWidth} color={brand.ink} />
          </Animated.View>
        ) : (
          <Animated.View
            key="mark"
            style={styles.layer}
            entering={markIn}
            exiting={markOut}
          >
            <ChoreoMark width={markWidth} color={brand.ink} />
          </Animated.View>
        )}
      </LayoutAnimationConfig>
    </View>
  );
};

export default SuperAppAgentIcon;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brand.signal,
  },
  // Both marks share the disc's centre, so the crossfade happens in place.
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
