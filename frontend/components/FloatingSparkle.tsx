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
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { router } from "expo-router";
import { ScreenPaths } from "@/constants/ScreenPaths";

const SPARKLE_COUNT = 1;

const generateSparkle = () => ({
  id: Math.random().toString(),
  top: Math.random() * 10 + 5,
  left: Math.random() * 10 + 8,
  fontSize: 10 + Math.random() * 10,
  duration: 3000 + Math.random() * 1000,
  delay: Math.random() * 50,
  rotation: Math.random() * 30 - 15,
});

const SparkleIcon = () => {
  const sparkles = Array.from({ length: SPARKLE_COUNT }, generateSparkle);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Ionicons
          name="storefront-outline"
          size={24}
          color={Colors.companyOrange}
          style={{ marginRight: 16 }}
          onPress={() => router.push(ScreenPaths.STORE)}
        />
        {sparkles.map((sparkle) => (
          <FloatingSparkle key={sparkle.id} sparkle={sparkle} />
        ))}
      </View>
    </View>
  );
};

const FloatingSparkle = ({ sparkle }: { sparkle: any }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const animate = () => {
    opacity.setValue(0.2);
    scale.setValue(0.3);
    translateX.setValue(0);
    translateY.setValue(0);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: sparkle.duration / 2,
        delay: sparkle.delay,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1.5,
        duration: sparkle.duration,
        delay: sparkle.delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: Math.random() * 10 - 15,
        duration: sparkle.duration,
        delay: sparkle.delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: Math.random() * 10 - 15,
        duration: sparkle.duration,
        delay: sparkle.delay,
        useNativeDriver: true,
      }),
    ]).start(() => animate());
  };

  useEffect(() => {
    animate();
  }, []);

  return (
    <Animated.Text
      style={[
        styles.sparkle,
        {
          fontSize: sparkle.fontSize,
          top: sparkle.top,
          left: sparkle.left,
          transform: [
            { translateX },
            { translateY },
            { scale },
            { rotate: `${sparkle.rotation}deg` },
          ],
          opacity,
        },
      ]}
    >
      ✨
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapper: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  sparkle: {
    position: "absolute",
  },
});

export default SparkleIcon;
