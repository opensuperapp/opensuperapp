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
import { wave } from "@/constants/brand";
import BrandLottie from "./BrandLottie";
import { MARK_ASPECT } from "./ChoreoMark";

const SOURCE = require("@/assets/brand/lottie/wave.json");

interface WaveMarkProps {
  size: number;
  color: string;
}

/** The Choreo Labs AI animation. AI features only, never a generic loader. */
export default function WaveMark({ size, color }: WaveMarkProps) {
  return (
    <BrandLottie
      source={SOURCE}
      width={size}
      aspect={MARK_ASPECT}
      color={color}
      intro={{ durationMs: wave.introMs, fromScaleX: wave.introFromScaleX }}
    />
  );
}
