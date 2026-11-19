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
import BrandIcon, { type BrandIconName } from "@/components/brand/BrandIcon";
import { size } from "@/constants/brand";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

export type TabIconName = BrandIconName | "apps";

const ICON_SIZE = size.tabIcon;
const STROKE = 1.5;
const STROKE_SELECTED = 1.9;
const DOT_STEPS = [5, 12, 19];

/** My Apps: a 3×3 dot grid, outlined at rest and filled when selected. */
const AppsGridIcon = ({
  color,
  filled,
}: {
  color: string;
  filled: boolean;
}) => (
  <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24">
    {DOT_STEPS.map((cy) =>
      DOT_STEPS.map((cx) => (
        <Circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={filled ? 2.1 : 1.9}
          fill={filled ? color : "none"}
          stroke={color}
          strokeWidth={filled ? 0 : 1.4}
        />
      )),
    )}
  </Svg>
);

type TabBarIconProps = {
  name: TabIconName;
  focused: boolean;
  color: string;
};

/** A tab icon; the selected one gets a heavier stroke and the accent bar above it. */
const TabBarIcon = ({ name, focused, color }: TabBarIconProps) => (
  <View style={styles.icon}>
    {focused && <View style={[styles.indicator, { backgroundColor: color }]} />}
    {name === "apps" ? (
      <AppsGridIcon color={color} filled={focused} />
    ) : (
      <BrandIcon
        name={name}
        size={ICON_SIZE}
        color={color}
        strokeWidth={focused ? STROKE_SELECTED : STROKE}
      />
    )}
  </View>
);

export default TabBarIcon;

const styles = StyleSheet.create({
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    overflow: "visible",
  },
  indicator: {
    position: "absolute",
    top: -(size.tabIndicator.gapAboveIcon + size.tabIndicator.height),
    left: (ICON_SIZE - size.tabIndicator.width) / 2,
    width: size.tabIndicator.width,
    height: size.tabIndicator.height,
    borderRadius: size.tabIndicator.height,
  },
});
