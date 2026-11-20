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
import { brand, soraFamily } from "@/constants/brand";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Skeleton } from "./Skeleton";

const DOTS = require("@/assets/brand/blackout-dots.png");

// The artwork is zoomed past the circle so only its dot field shows, as the
// prototype's `background-size: 220–240%` does.
const ARTWORK_SCALE = 2.3;

interface AvatarProps {
  initials: string;
  size?: number;
}

/** Initials on the blackout-dots artwork, clipped to a circle. */
const Avatar = React.memo(({ initials, size = 64 }: AvatarProps) => {
  if (!initials) {
    return <Skeleton width={size} height={size} circle />;
  }

  const artwork = size * ARTWORK_SCALE;
  const fontSize = Math.round(size * 0.34);

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Image
        source={DOTS}
        resizeMode="cover"
        style={{
          position: "absolute",
          width: artwork,
          height: artwork,
          // 70% / 60% focal point, matching the profile and card avatars.
          left: -(artwork - size) * 0.7,
          top: -(artwork - size) * 0.6,
        }}
        accessibilityIgnoresInvertColors
      />
      <Text
        style={[
          styles.initials,
          { fontSize, letterSpacing: -0.04 * fontSize },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: brand.ink,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  initials: {
    fontFamily: soraFamily[600],
    color: "#FFFFFF",
  },
});

export default Avatar;
