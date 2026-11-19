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
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useEffect, useRef } from "react";
import { Animated } from "react-native";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  style?: object;
  borderRadius?: number;
}

export const Skeleton = ({
  width,
  height,
  circle,
  style,
  borderRadius,
}: SkeletonProps) => {
  const { colors } = useBrandTheme();
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Bones are card2 so they read on both card and screen backgrounds; the pulse is opacity only.
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ? borderRadius : circle ? 100 : 4,
          backgroundColor: colors.card2,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
};
