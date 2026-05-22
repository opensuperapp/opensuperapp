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
import { Colors } from "@/constants/Colors";
import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Skeleton } from "./Skeleton";

interface AvatarProps {
  initials: string;
  size?: number;
}

const Avatar = React.memo(({ initials, size = 64 }: AvatarProps) => {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme ?? "light");

  return (
    <>
      {initials ? (
        <View
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size / 2.2 }]}>
            {initials}
          </Text>
        </View>
      ) : (
        <Skeleton width={160} height={160} circle />
      )}
    </>
  );
});

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    avatar: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors[colorScheme].profileBackgroundColor,
    },
    initials: {
      color: Colors[colorScheme].profileFontColor,
      fontWeight: "600",
    },
  });

export default Avatar;
