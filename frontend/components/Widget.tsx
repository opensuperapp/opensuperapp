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
import { ScreenPaths } from "@/constants/ScreenPaths";
import { DisplayMode } from "@/types/navigation";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

/**
 * Widget component to render a tappable micro app icon and name.
 * Navigates to the micro app screen with required parameters on press.
 */
type WidgetProps = {
  iconUrl: string;
  name: string;
  webViewUri?: string | null;
  appName: string;
  clientId: string;
  exchangedToken: string;
  appId: string;
  displayMode?: DisplayMode;
};

const Widget = React.memo(
  ({
    iconUrl,
    name,
    webViewUri,
    appName,
    clientId,
    exchangedToken,
    appId,
    displayMode,
  }: WidgetProps) => {
    const colorScheme = useColorScheme();
    const styles = createStyles(colorScheme ?? "light");

    const handlePress = () => {
      router.push({
        pathname: ScreenPaths.MICRO_APP,
        params: {
          webViewUri,
          appName,
          clientId,
          exchangedToken,
          appId,
          displayMode,
        },
      });
    };

    return (
      <TouchableOpacity
        activeOpacity={0.5}
        style={styles.container}
        onPress={handlePress}
      >
        <View style={styles.iconContainer}>
          <Image
            style={styles.image}
            source={iconUrl.trim()}
            contentFit="contain"
            transition={1000}
          />
        </View>
        <Text
          style={styles.appName}
          numberOfLines={1}
          ellipsizeMode="tail"
          allowFontScaling={false}
        >
          {name}
        </Text>
      </TouchableOpacity>
    );
  }
);

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      width: "25%",
      marginBottom: 24,
      alignItems: "center",
      paddingHorizontal: 4,
    },
    iconContainer: {
      width: 66,
      height: 66,
      borderRadius: 12,
      padding: 1,
      backgroundColor:
        colorScheme === "light"
          ? Colors.light.primaryBackgroundColor
          : Colors.dark.secondaryBackgroundColor,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 0.5,
      borderColor:
        colorScheme === "light"
          ? Colors.light.secondaryBackgroundColor
          : "transparent",
    },
    image: {
      width: 65,
      height: 65,
      borderRadius: 10,
    },
    appName: {
      marginTop: 8,
      textAlign: "center",
      fontSize: 12,
      lineHeight: 16,
      color: Colors[colorScheme].ternaryTextColor,
      paddingHorizontal: 4,
    },
  });

export default Widget;
