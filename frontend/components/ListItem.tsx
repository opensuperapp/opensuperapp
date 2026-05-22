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
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  useColorScheme,
  TouchableOpacity,
} from "react-native";
import { Image } from "expo-image";
import { Colors } from "@/constants/Colors";
import { Version } from "@/context/slices/appSlice";
import { DEFAULT_VIEWING_MODE, DOWNLOADED, FULL_SCREEN_VIEWING_MODE } from "@/constants/Constants";
import React from "react";
import ActionButton from "./ActionButton";
import { router } from "expo-router";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { DisplayMode } from "@/types/navigation";


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
  onDownload: () => void;
  onRemove: () => void;
  displayMode?: DisplayMode;
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
    onDownload,
    onRemove,
    displayMode,
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
            style={styles.image}
            source={iconUrl.trim()}
            contentFit="contain"
            transition={1000}
          />
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
              <Text style={styles.versionText} allowFontScaling={false}>
                Version {versions[0].version}
              </Text>
            </View>
          </View>
        </View>
        {/* Button Section */}
        <View style={styles.buttonContainer}>
          {status === DOWNLOADED ? (
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
          )}
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
  });
