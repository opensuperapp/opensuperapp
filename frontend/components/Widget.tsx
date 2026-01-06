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
import UpdateOverlay from "./UpdateOverlay";

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
  version?: string;
  isUpdating?: boolean;
  downloadProgress?: number;
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
    version,
    isUpdating = false,
    downloadProgress,
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
          version,
        },
      });
    };

    return (
      <TouchableOpacity
        activeOpacity={0.5}
        style={styles.container}
        onPress={handlePress}
        disabled={isUpdating}
      >
        <View style={styles.iconContainer}>
          <Image
            style={[styles.image, isUpdating && styles.imageUpdating]}
            source={iconUrl}
            contentFit="contain"
            transition={1000}
          />
          {isUpdating && (
            <View style={styles.updateOverlay}>
              <UpdateOverlay
                size={32}
                strokeWidth={3}
                color="#ffffff"
                progress={downloadProgress}
              />
            </View>
          )}
        </View>
        <Text
          style={styles.appName}
          numberOfLines={1}
          ellipsizeMode="tail"
          allowFontScaling={false}
        >
          {name}
        </Text>
        {isUpdating && (
          <View style={styles.updatingContainer}>
            <Text style={styles.updatingText}>Updating...</Text>
            <Text style={styles.progressText}>
              {downloadProgress !== undefined
                ? `${Math.round(downloadProgress)}%`
                : ""}
            </Text>
          </View>
        )}
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
    imageUpdating: {
      opacity: 0.4,
    },
    updateOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(128, 128, 128, 0.7)",
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
    updatingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      paddingHorizontal: 4,
    },
    updatingText: {
      textAlign: "center",
      fontSize: 10,
      color: Colors.companyOrange,
      fontWeight: "500",
      marginRight: 4,
    },
    progressText: {
      textAlign: "center",
      fontSize: 10,
      color: Colors.companyOrange,
      fontWeight: "600",
    },
  });

export default Widget;
