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
import { ICON_PATHS } from "@/constants/brand";
import Svg, { Path } from "react-native-svg";

export type BrandIconName = keyof typeof ICON_PATHS;

interface BrandIconProps {
  name: BrandIconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

/** Choreo Labs UI icon: 24×24 outline, round caps and joins. */
export default function BrandIcon({ name, size = 24, color, strokeWidth = 1.6 }: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {ICON_PATHS[name].map((d, i) => (
        <Path
          key={i}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
