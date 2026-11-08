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
import WheelLoader from "@/components/brand/WheelLoader";
import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

interface UpdateOverlayProps {
  size?: number;
  strokeWidth?: number;
  color?: string;
  progress?: number;
}

const UpdateOverlay = ({
  size = 32,
  strokeWidth = 3,
  color = "#ffffff",
  progress,
}: UpdateOverlayProps) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [currentProgress, setCurrentProgress] = React.useState(0);
  const radius = (size - strokeWidth) / 2;

  useEffect(() => {
    if (typeof progress !== "number") {
      return;
    }
    Animated.timing(animatedValue, {
      toValue: progress / 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [animatedValue, progress]);

  // Listen to animated value changes
  useEffect(() => {
    const listener = animatedValue.addListener(({ value }) => {
      setCurrentProgress(value);
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [animatedValue]);

  // Function to create arc path for filled circular progress
  const createArcPath = (percentage: number) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const angle = (percentage * 360 - 90) * (Math.PI / 180);
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    const largeArcFlag = percentage > 0.5 ? 1 : 0;

    if (percentage === 0) return "";
    if (percentage >= 1) {
      return `M ${centerX} ${centerY - radius} A ${radius} ${radius} 0 1 1 ${
        centerX - 0.01
      } ${centerY - radius} Z`;
    }

    return `M ${centerX} ${centerY} L ${centerX} ${
      centerY - radius
    } A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x} ${y} Z`;
  };

  // No progress to show yet: the standard loader stands in for the pie.
  if (typeof progress !== "number") {
    return <WheelLoader size={size} color={color} />;
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Path d={createArcPath(currentProgress)} fill={color} />
      </Svg>
    </View>
  );
};

export default UpdateOverlay;
