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
import WalletPassDetails from "@/components/WalletPassDetails";
import WalletPassView from "@/components/WalletPassView";
import { easing, textStyle, type } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { BusinessCardData } from "@/types/businessCard.types";
import React, { ComponentRef, RefObject, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const CONTENT_PADDING_H = 16;
const FLIP_MS = 600;
const PERSPECTIVE = 1400;

type Props = {
  data: BusinessCardData;
  passRef: RefObject<ComponentRef<typeof View> | null>;
  onBarcodePress: () => void;
};

/**
 * The pass front and its back as one card that flips on rotateY. Tapping the
 * card or the hint below it turns it over; the barcode keeps its own tap.
 */
const BusinessCardPreview = ({ data, passRef, onBarcodePress }: Props) => {
  const { colors, scheme } = useBrandTheme();
  const reduceMotion = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  const turn = useSharedValue(0);

  const toggle = () => {
    const next = !flipped;
    setFlipped(next);
    turn.value = withTiming(next ? 1 : 0, {
      duration: reduceMotion ? 0 : FLIP_MS,
      easing: Easing.bezier(...easing.standard),
    });
  };

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { rotateY: `${-180 * turn.value}deg` },
    ],
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { rotateY: `${180 - 180 * turn.value}deg` },
    ],
  }));

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Not an accessibility element itself, so VoiceOver still reaches the
          fields and the barcode; the hint button below is the accessible flip. */}
      <Pressable onPress={toggle} accessible={false} style={styles.card}>
        <Animated.View
          style={[styles.face, frontStyle]}
          pointerEvents={flipped ? "none" : "auto"}
          accessibilityElementsHidden={flipped}
          importantForAccessibility={flipped ? "no-hide-descendants" : "auto"}
        >
          <WalletPassView
            ref={passRef}
            data={data}
            onBarcodePress={onBarcodePress}
          />
        </Animated.View>
        <Animated.View
          style={[styles.face, styles.back, backStyle]}
          pointerEvents={flipped ? "auto" : "none"}
          accessibilityElementsHidden={!flipped}
          importantForAccessibility={flipped ? "auto" : "no-hide-descendants"}
        >
          <WalletPassDetails data={data} colorScheme={scheme} />
        </Animated.View>
      </Pressable>

      <Pressable
        onPress={toggle}
        hitSlop={8}
        accessibilityRole="button"
        style={styles.hint}
      >
        <BrandIcon name="flip" size={16} color={colors.text3} />
        <Text style={[styles.hintText, { color: colors.text3 }]}>
          {flipped ? "Front of the pass" : "On the back of the pass"}
        </Text>
      </Pressable>
    </ScrollView>
  );
};

export default BusinessCardPreview;

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: CONTENT_PADDING_H,
    paddingTop: 8,
    paddingBottom: 4,
  },
  card: {
    width: "100%",
  },
  face: {
    backfaceVisibility: "hidden",
  },
  back: {
    ...StyleSheet.absoluteFill,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    minHeight: 44,
  },
  hintText: {
    ...textStyle(type.metaLabel),
  },
});
