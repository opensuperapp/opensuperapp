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
import BrandLottie from "./BrandLottie";

const SOURCE = require("@/assets/brand/lottie/hero-mark.json");
// Hero viewBox is wider than the mark ("-120 0 1575 1402") to leave room for the sway.
const HERO_ASPECT = 1402 / 1575;

interface HeroMarkProps {
  width: number;
  color?: string;
}

/** Feed hero mark: the ovals sway gently. */
export default function HeroMark({ width, color = "#FFFFFF" }: HeroMarkProps) {
  return (
    <BrandLottie
      source={SOURCE}
      width={width}
      aspect={HERO_ASPECT}
      color={color}
      intro={{ durationMs: 0, fromScaleX: 1 }}
    />
  );
}
