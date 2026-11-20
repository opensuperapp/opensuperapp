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
import {
  GLYPHS,
  GLYPH_FILLS,
  gradients,
  radius,
  size as sizes,
  soraFamily,
  tile,
} from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { Image } from "expo-image";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { appInitial, resolveAppGlyph } from "./appGlyph";

interface AppTileProps {
  /** App display name; picks the glyph, or the initial when none fits. */
  name: string;
  appId?: string;
  /** The micro app's own icon. Drawn in the tile when it loads; Halo otherwise. */
  iconUrl?: string;
  /** 64 grid, 56 store row, 104 detail. */
  size?: number;
}

const DOT_PITCH = 4;
const DOT_RADIUS = 0.8;

// The prototype's halo is a 4px dot pattern inset 16%, masked by
// radial-gradient(circle, #000 0%, .5 25%, transparent 60%) of the
// farthest-corner radius. Baking that mask into each dot's opacity
// avoids an SVG mask, which is costly on Android.
function haloDots(tileSize: number) {
  const inset = tileSize * 0.16;
  const box = tileSize - inset * 2;
  const centre = tileSize / 2;
  const reach = (box * Math.SQRT2) / 2;
  const dots: { x: number; y: number; o: number }[] = [];
  for (let y = inset + DOT_PITCH / 2; y < inset + box; y += DOT_PITCH) {
    for (let x = inset + DOT_PITCH / 2; x < inset + box; x += DOT_PITCH) {
      const t = Math.hypot(x - centre, y - centre) / reach;
      const o =
        t <= 0.25 ? 1 - 2 * t : t < 0.6 ? 0.5 * (1 - (t - 0.25) / 0.35) : 0;
      if (o > 0.02) dots.push({ x, y, o });
    }
  }
  return dots;
}

const OPACITY_LEVELS = 6;

// One <Path> per opacity step instead of one <Circle> per dot: a grid of tiles
// would otherwise draw thousands of SVG nodes, which is slow on Android.
function haloDotPaths(tileSize: number) {
  const buckets = new Map<number, string[]>();
  for (const { x, y, o } of haloDots(tileSize)) {
    const level = Math.ceil(o * OPACITY_LEVELS) / OPACITY_LEVELS;
    const arc = `M${x - DOT_RADIUS} ${y}a${DOT_RADIUS} ${DOT_RADIUS} 0 1 0 ${DOT_RADIUS * 2} 0a${DOT_RADIUS} ${DOT_RADIUS} 0 1 0 ${-DOT_RADIUS * 2} 0`;
    const arcs = buckets.get(level) ?? [];
    arcs.push(arc);
    buckets.set(level, arcs);
  }
  return [...buckets].map(([o, arcs]) => ({ o, d: arcs.join("") }));
}

/**
 * App tile: the micro app's own icon when it has one, else the Halo tile (brand glyph,
 * or the name's initial, on a navy (dark) or white (light) tile).
 */
const AppTile = React.memo(function AppTile({
  name,
  appId,
  iconUrl,
  size = sizes.tile.grid,
}: AppTileProps) {
  // Remembers which URL failed, so a new URL gets its own try.
  const [failedIconUrl, setFailedIconUrl] = useState<string>();
  const { colors, scheme, isDark } = useBrandTheme();
  const surface = tile[scheme];
  const glyphId = resolveAppGlyph(name, appId);
  const dotPaths = useMemo(() => haloDotPaths(size), [size]);

  const r = size * radius.appTileRatio;
  const glyphSize = size * sizes.tileGlyphRatio;
  const offset = (size - glyphSize) / 2;
  const glyph = glyphId ? GLYPHS[glyphId] : null;
  const fills = glyphId ? GLYPH_FILLS[glyphId] : {};
  const stroke = size > 80 ? 1.4 : 1.6;
  const glossEnd = isDark ? "38%" : "40%";
  const bg = isDark ? gradients.tileDark : gradients.tileLight;

  if (iconUrl && iconUrl !== failedIconUrl) {
    return (
      <View
        style={[
          styles.iconTile,
          {
            width: size,
            height: size,
            borderRadius: r,
            borderColor: surface.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <Image
          source={iconUrl}
          style={styles.icon}
          contentFit="contain"
          transition={200}
          onError={() => setFailedIconUrl(iconUrl)}
        />
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          {isDark ? (
            <RadialGradient
              id="bg"
              cx="0.2"
              cy="0"
              rx="1.2"
              ry="0.9"
              fx="0.2"
              fy="0"
            >
              <Stop offset="0" stopColor={bg[0]} />
              <Stop offset="0.55" stopColor={bg[1]} />
              <Stop offset="1" stopColor={bg[2]} />
            </RadialGradient>
          ) : (
            <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={bg[0]} />
              <Stop offset="1" stopColor={bg[1]} />
            </LinearGradient>
          )}
          <LinearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={surface.gloss[0]} />
            <Stop offset={glossEnd} stopColor={surface.gloss[1]} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} rx={r} fill="url(#bg)" />
        <Rect width={size} height={size} rx={r} fill="url(#gloss)" />
        {dotPaths.map(({ o, d }) => (
          <Path
            key={o}
            d={d}
            fill={surface.haloDot}
            fillOpacity={o * surface.haloOpacity}
          />
        ))}
        {glyph && (
          <G
            transform={`translate(${offset} ${offset}) scale(${glyphSize / 24})`}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={stroke}
          >
            {(fills.f ?? []).map((i) => (
              <Path
                key={`f${i}`}
                d={glyph.b[i]}
                fill={surface.glyphFill}
                stroke="none"
              />
            ))}
            {(fills.af ?? []).map((i) => (
              <Path
                key={`af${i}`}
                d={glyph.a[i]}
                fill={surface.accentFill}
                stroke="none"
              />
            ))}
            {glyph.b.map((d, i) => (
              <Path key={`b${i}`} d={d} stroke={colors.text} />
            ))}
            {glyph.a.map((d, i) => (
              <Path key={`a${i}`} d={d} stroke={colors.cobalt} />
            ))}
            {glyph.dot && (
              <Circle
                cx={glyph.dot[0]}
                cy={glyph.dot[1]}
                r={1.5}
                fill={colors.cobalt}
              />
            )}
          </G>
        )}
        <Rect
          x={0.5}
          y={0.5}
          width={size - 1}
          height={size - 1}
          rx={r - 0.5}
          fill="none"
          stroke={surface.border}
          strokeWidth={1}
        />
      </Svg>
      {!glyph && (
        <View style={styles.initialWrap} pointerEvents="none">
          <Text
            style={[
              styles.initial,
              { color: colors.text, fontSize: size * 0.4 },
            ]}
            allowFontScaling={false}
          >
            {appInitial(name)}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  iconTile: {
    borderWidth: 1,
    overflow: "hidden",
  },
  icon: {
    flex: 1,
  },
  initialWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontFamily: soraFamily[600],
  },
});

export default AppTile;
