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
import { brand, size as sizes, soraFamily, themes } from "@/constants/brand";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

const ARTWORK = require("@/assets/brand/blackout-dots.png");
const ARTWORK_ASPECT = 900 / 1200;
const ARTWORK_SCALE = 2.2;
// Posts by the company itself get the orange team disc instead of initials.
const TEAM_AUTHOR = /^(wso2|choreo labs)( team)?$/i;

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * Author avatar: initials on the dot artwork, with the author's photo on top
 * when there is one (a photo that fails to load leaves the initials showing).
 */
const AuthorAvatar = ({
  name,
  photoUri,
  size = sizes.avatar.author,
}: {
  name: string;
  photoUri?: string;
  size?: number;
}) => {
  const circle = { width: size, height: size, borderRadius: size / 2 };

  if (TEAM_AUTHOR.test(name.trim())) {
    return (
      <View style={[styles.base, styles.team, circle]}>
        <ChoreoMark width={size * 0.54} color={themes.dark.text} />
      </View>
    );
  }

  const artWidth = size * ARTWORK_SCALE;
  const artHeight = artWidth * ARTWORK_ASPECT;

  return (
    <View style={[styles.base, styles.dots, circle]}>
      <Image
        source={ARTWORK}
        style={{
          position: "absolute",
          width: artWidth,
          height: artHeight,
          left: (size - artWidth) / 2,
          top: (size - artHeight) / 2,
        }}
      />
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>
        {initialsOf(name)}
      </Text>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={[StyleSheet.absoluteFill, circle]}
          resizeMode="cover"
        />
      ) : null}
      <View pointerEvents="none" style={[styles.ring, circle]} />
    </View>
  );
};

export default AuthorAvatar;

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  team: {
    backgroundColor: brand.signal,
  },
  dots: {
    backgroundColor: brand.ink,
  },
  initials: {
    fontFamily: soraFamily[600],
    color: themes.dark.text,
    letterSpacing: -0.3,
  },
  ring: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: themes.dark.line2,
  },
});
