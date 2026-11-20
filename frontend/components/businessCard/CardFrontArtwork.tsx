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
import { gradients } from "@/constants/brand";
import React from "react";
import { StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

const [INNER, MID, OUTER] = gradients.businessCardFront;

/**
 * The business card front: a Cobalt radial (120% 80% at 85% 0%) under a faint
 * 6px dot texture. Drawn behind the pass content, which keeps its own layout.
 */
const CardFrontArtwork = () => (
  <Svg
    style={StyleSheet.absoluteFill}
    width="100%"
    height="100%"
    pointerEvents="none"
  >
    <Defs>
      <RadialGradient
        id="cardFront"
        cx="0.85"
        cy="0"
        rx="1.2"
        ry="0.8"
        fx="0.85"
        fy="0"
        gradientUnits="objectBoundingBox"
      >
        <Stop offset="0" stopColor={INNER} />
        <Stop offset="0.45" stopColor={MID} />
        <Stop offset="1" stopColor={OUTER} />
      </RadialGradient>
      <Pattern
        id="cardDots"
        width={6}
        height={6}
        patternUnits="userSpaceOnUse"
      >
        <Circle cx={1} cy={1} r={0.9} fill="#FFFFFF" fillOpacity={0.1} />
      </Pattern>
    </Defs>
    <Rect width="100%" height="100%" fill="url(#cardFront)" />
    <Rect width="100%" height="100%" fill="url(#cardDots)" />
  </Svg>
);

export default CardFrontArtwork;
