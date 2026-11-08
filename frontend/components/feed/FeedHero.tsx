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
import HeroMark from "@/components/brand/HeroMark";
import {
  brand,
  easing,
  gradients,
  hero,
  radius,
  size,
  textStyle,
  themes,
  type,
} from "@/constants/brand";
import { RootState } from "@/context/store";
import { format } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSelector } from "react-redux";

const ARTWORK = require("@/assets/brand/blackout-dots.png");
const ARTWORK_ASPECT = 900 / 1200;
const ARTWORK_SCALE = 1.5;
// CSS background-position percentages the artwork pans between.
const PAN_FROM = { x: 0.4, y: 0.5 };
const PAN_TO = { x: 0.62, y: 0.38 };
const PADDING = { vertical: 20, horizontal: 22 };
// The hero stays dark in both themes, so it reads from the dark palette.
const HERO_COLORS = themes.dark;

const greetingFor = (hour: number) =>
  hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

/** One hero text line fading up 8px, staggered by its index. */
const FadeUp = ({
  index,
  reduceMotion,
  children,
}: {
  index: number;
  reduceMotion: boolean;
  children: React.ReactNode;
}) => {
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withDelay(
      index * hero.textStaggerMs,
      withTiming(1, {
        duration: hero.textFadeUpMs,
        easing: Easing.bezier(...easing.standard),
      })
    );
  }, [index, progress, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * hero.textFadeUpOffset }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
};

/** Feed greeting banner: Midnight with slowly panning dot artwork and the swaying mark. */
const FeedHero = () => {
  const firstName = useSelector(
    (state: RootState) => state.userInfo.userInfo?.firstName?.trim() ?? ""
  );
  const reduceMotion = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const pan = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pan.value = withRepeat(
      withTiming(1, {
        duration: hero.artworkPanMs,
        easing: Easing.bezier(0.42, 0, 0.58, 1), // CSS ease-in-out
      }),
      -1,
      true
    );
  }, [pan, reduceMotion]);

  // Mirrors CSS background-position: offset = (box - image) * percentage.
  const height = width / size.heroAspect;
  const artWidth = width * ARTWORK_SCALE;
  const artHeight = artWidth * ARTWORK_ASPECT;
  const slackX = width - artWidth;
  const slackY = height - artHeight;

  const artworkStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: slackX * (PAN_FROM.x + (PAN_TO.x - PAN_FROM.x) * pan.value) },
      { translateY: slackY * (PAN_FROM.y + (PAN_TO.y - PAN_FROM.y) * pan.value) },
    ],
  }));

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  const now = new Date();
  const greeting = greetingFor(now.getHours());
  const contentWidth = width - PADDING.horizontal * 2;
  const markWidth = Math.min(
    contentWidth * size.heroMark.widthRatio,
    size.heroMark.max
  );
  // Prototype: clamp(24px, 9%, 40px) gap and clamp(19px, 5.4vw, 24px) type.
  const gap = Math.min(Math.max(width * 0.09, 24), 40);
  const greetingSize = Math.min(Math.max(windowWidth * 0.054, 19), 24);
  const greetingStyle = textStyle({
    ...type.heroGreeting,
    size: greetingSize,
    tracking: -0.035,
    lineHeight: 1.2,
  });

  return (
    <View style={styles.hero} onLayout={onLayout}>
      {width > 0 && (
        <>
          <Animated.View
            style={[
              styles.artwork,
              { width: artWidth, height: artHeight },
              artworkStyle,
            ]}
          >
            <Image source={ARTWORK} style={styles.fill} resizeMode="cover" />
          </Animated.View>
          <LinearGradient
            colors={gradients.heroOverlay}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.content, { gap }]}>
            <HeroMark width={markWidth} color={HERO_COLORS.text} />
            <View style={styles.text}>
              <FadeUp index={0} reduceMotion={reduceMotion}>
                <Text style={styles.date}>
                  {format(now, "EEEE d MMMM")}
                </Text>
              </FadeUp>
              <FadeUp index={1} reduceMotion={reduceMotion}>
                <Text style={[greetingStyle, styles.greeting]}>
                  {firstName ? `${greeting},` : greeting}
                </Text>
              </FadeUp>
              {firstName ? (
                <FadeUp index={2} reduceMotion={reduceMotion}>
                  <Text style={[greetingStyle, styles.name]}>
                    {firstName}
                  </Text>
                </FadeUp>
              ) : null}
            </View>
          </View>
        </>
      )}
      <View pointerEvents="none" style={styles.hairline} />
    </View>
  );
};

export default FeedHero;

const styles = StyleSheet.create({
  hero: {
    width: "100%",
    aspectRatio: size.heroAspect,
    borderRadius: radius.hero,
    overflow: "hidden",
    backgroundColor: brand.midnight,
  },
  artwork: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  fill: {
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: PADDING.vertical,
    paddingHorizontal: PADDING.horizontal,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  date: {
    ...textStyle(type.heroDate),
    color: HERO_COLORS.text2,
    marginBottom: 10,
  },
  greeting: {
    color: HERO_COLORS.text,
  },
  name: {
    color: brand.azure,
  },
  hairline: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.hero,
    borderWidth: 1,
    borderColor: HERO_COLORS.line,
  },
});
