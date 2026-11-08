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
import { MARK_E, MARK_VIEWBOX } from "@/constants/brand";
import Svg, { Ellipse } from "react-native-svg";

export const MARK_ASPECT = 1402 / 1375;

interface ChoreoMarkProps {
  width: number;
  color?: string;
}

/** Static Choreo mark. Also the reduce-motion stand-in for the Wheel and Wave. */
export default function ChoreoMark({ width, color = "#FFFFFF" }: ChoreoMarkProps) {
  return (
    <Svg
      width={width}
      height={width * MARK_ASPECT}
      viewBox={MARK_VIEWBOX}
      accessibilityLabel="Choreo Labs"
    >
      {MARK_E.map(([cx, cy, rx, ry], i) => (
        <Ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={color} />
      ))}
    </Svg>
  );
}
