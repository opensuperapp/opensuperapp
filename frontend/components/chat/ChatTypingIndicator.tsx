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

import { ChatThemePalette } from "@/constants/ChatTheme";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

export interface ChatTypingIndicatorProps {
  theme: ChatThemePalette;
}

/**
 * Animated three-dot typing indicator for assistant responses.
 *
 * @param {ChatTypingIndicatorProps} props - Theme palette.
 * @returns {JSX.Element} Typing dots UI.
 */
const ChatTypingIndicator = ({
  theme,
}: ChatTypingIndicatorProps): JSX.Element => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 320,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = animateDot(dot1, 0);
    const a2 = animateDot(dot2, 160);
    const a3 = animateDot(dot3, 320);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const renderDot = (opacity: Animated.Value) => (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: theme.accent, opacity },
      ]}
    />
  );

  return (
    <View style={styles.row}>
      {renderDot(dot1)}
      {renderDot(dot2)}
      {renderDot(dot3)}
    </View>
  );
};

export default ChatTypingIndicator;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
