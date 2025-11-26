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
import { DOWNLOADED } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { Version } from "@/context/slices/appSlice";
import { DisplayMode } from "@/types/navigation";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import ActionButton from "./ActionButton";
import UpdateOverlay from "./UpdateOverlay";

type ListItemProps = {
  appId: string;
  name: string;
  webViewUri?: string | null;
  clientId?: string | null;
  exchangedToken?: string | null;
  versions: Version[];
  description: string;
  iconUrl: string;
  status: string;
  downloading: boolean;
  downloadProgress?: number;
  onDownload: () => void;
  onRemove: () => void;
  displayMode?: DisplayMode;
  isDefaultApp?: boolean;
};

const ListItem = React.memo(
  ({
    appId,
    name,
    webViewUri,
    clientId,
    exchangedToken,
    versions,
    description,
    iconUrl,
    status,
    downloading,
    downloadProgress,
    onDownload,
    onRemove,
    displayMode,
    isDefaultApp = false,
  }: ListItemProps) => {
    const screenWidth = Dimensions.get("window").width;
    const colorScheme = useColorScheme() ?? "light";
    const styles = createStyles(colorScheme);

    const handlePress = () => {
      router.push({
        pathname: ScreenPaths.MICRO_APP,
        params: {
          webViewUri,
          appName: name,
          clientId,
          exchangedToken,
          appId,
          displayMode,
        },
      });
    };

    return (
      <View style={[styles.container, { width: screenWidth - 24 }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.iconContainer, { maxWidth: screenWidth / 4 }]}
          onPress={handlePress}
          disabled={status !== DOWNLOADED}
        >
          <Image
            style={[styles.image, downloading && styles.imageUpdating]}
            source={iconUrl}
            contentFit="contain"
            transition={1000}
          />
          {downloading && downloadProgress !== undefined && (
            <View style={styles.updateOverlay}>
              <UpdateOverlay
                size={32}
                strokeWidth={3}
                color="#ffffff"
                progress={downloadProgress}
              />
            </View>
          )}
        </TouchableOpacity>
        {/* Info Section */}
        <View style={styles.infoContainer}>
          <View style={styles.textContent}>
            <Text style={styles.nameText} allowFontScaling={false}>
              {name}
            </Text>
            <Text style={styles.descriptionText} allowFontScaling={false}>
              {description}
            </Text>
            <View style={styles.bottomTextContainer}>
              {versions.length > 0 && (
                <Text style={styles.versionText} allowFontScaling={false}>
                  Version {versions[0].version}
                </Text>
              )}
              {downloading && (
                <View style={styles.updatingContainer}>
                  <Text style={styles.updatingText}>
                    {router.canGoBack() ? "Installing..." : "Updating..."}
                  </Text>
                  <Text style={styles.progressText}>
                    {downloadProgress !== undefined
                      ? `${Math.round(downloadProgress)}%`
                      : ""}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        {/* Button Section */}
        <View style={styles.buttonContainer}>
          {!isDefaultApp &&
            (status === DOWNLOADED ? (
              <ActionButton
                label="Remove"
                onPress={onRemove}
                textColor={Colors.removeButtonTextColor}
              />
            ) : (
              <ActionButton
                label="Get"
                onPress={onDownload}
                textColor={Colors.actionButtonTextColor}
                downloading={downloading}
                fixedSize={true}
              />
            ))}
          {isDefaultApp && <Text style={styles.defaultAppText}>Default</Text>}
        </View>
      </View>
    );
  }
);

export default ListItem;

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      marginHorizontal: 12,
      marginTop: 16,
      marginBottom: 16,
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
    },
    iconContainer: {
      backgroundColor:
        colorScheme === "light"
          ? Colors.light.primaryBackgroundColor
          : Colors.dark.secondaryBackgroundColor,
      borderRadius: 12,
      padding: 1,
      justifyContent: "center",
      alignItems: "center",
      height: 66,
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
    infoContainer: {
      marginLeft: 16,
      justifyContent: "center",
      flex: 1,
      height: 66,
    },
    textContent: {
      justifyContent: "space-between",
      height: "100%",
    },
    bottomTextContainer: {
      marginTop: "auto",
    },
    nameText: {
      fontWeight: "700",
      fontSize: 16,
      color: Colors[colorScheme].ternaryTextColor,
    },
    versionText: {
      color: Colors[colorScheme].primaryTextColor,
      fontSize: 10,
    },
    defaultAppText: {
      fontSize: 14,
      color: Colors[colorScheme].defaultAppTextColor,
      fontStyle: "italic",
      paddingHorizontal: 16,
      paddingVertical: 8,
      minWidth: 50,
    },
    descriptionText: {
      fontWeight: "normal",
      color: Colors[colorScheme].ternaryTextColor,
      fontSize: 12,
    },
    buttonContainer: {
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 12,
      height: 66,
    },
    loadingContainer: {
      paddingHorizontal: 24,
      paddingVertical: 8,
      minWidth: 100,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 8,
      backgroundColor: Colors[colorScheme].secondaryBackgroundColor,
    },
    updatingContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },
    updatingText: {
      fontSize: 9,
      color: Colors.companyOrange,
      fontWeight: "500",
      marginRight: 4,
    },
    progressText: {
      fontSize: 9,
      color: Colors.companyOrange,
      fontWeight: "600",
    },
  });
