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
import AppTile from "@/components/apps/AppTile";
import {
  radius,
  size as sizes,
  soraFamily,
  textStyle,
  themes,
  type,
  type ThemeColors,
} from "@/constants/brand";
import { DOWNLOADED } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { Version } from "@/context/slices/appSlice";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { DisplayMode } from "@/types/navigation";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ActionButton from "./ActionButton";
import UpdateOverlay from "./UpdateOverlay";

type ListItemProps = {
  appId: string;
  name: string;
  webViewUri?: string | null;
  clientId?: string | null;
  exchangedToken?: string | null;
  exchangedIdToken?: string | null;
  versions: Version[];
  description: string;
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
    exchangedIdToken,
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
    const { colors } = useBrandTheme();
    const styles = createStyles(colors);

    const handlePress = () => {
      router.push({
        pathname: ScreenPaths.MICRO_APP,
        params: {
          webViewUri,
          appName: name,
          clientId,
          exchangedToken,
          exchangedIdToken,
          appId,
          displayMode,
        },
      });
    };

    return (
      <View style={styles.container}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePress}
          disabled={status !== DOWNLOADED}
        >
          <View style={downloading && styles.tileUpdating}>
            <AppTile name={name} appId={appId} iconUrl={iconUrl} size={TILE} />
          </View>
          {downloading && downloadProgress !== undefined && (
            <View style={styles.updateOverlay}>
              <UpdateOverlay
                size={28}
                strokeWidth={3}
                color={themes.dark.text}
                progress={downloadProgress}
              />
            </View>
          )}
        </TouchableOpacity>
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
              <Text style={styles.updatingText} allowFontScaling={false}>
                {router.canGoBack() ? "Installing..." : "Updating..."}{" "}
                {downloadProgress !== undefined
                  ? `${Math.round(downloadProgress)}%`
                  : ""}
              </Text>
            )}
          </View>
        </View>
        {!isDefaultApp &&
          (status === DOWNLOADED ? (
            <ActionButton
              label="Remove"
              onPress={onRemove}
              textColor={colors.error}
            />
          ) : (
            <ActionButton
              label="Get"
              onPress={onDownload}
              textColor={colors.cobalt}
              downloading={downloading}
              fixedSize={true}
            />
          ))}
        {isDefaultApp && <Text style={styles.defaultAppText}>Default</Text>}
      </View>
    );
  }
);

export default ListItem;

const TILE = sizes.tile.storeRow;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 16,
    },
    tileUpdating: {
      opacity: 0.4,
    },
    updateOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.backdrop,
      borderRadius: TILE * radius.appTileRatio,
    },
    textContent: {
      flex: 1,
      minWidth: 0,
    },
    bottomTextContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
    },
    nameText: {
      ...textStyle(type.storeRowName),
      lineHeight: 21,
      color: colors.text,
    },
    descriptionText: {
      fontFamily: soraFamily[400],
      fontSize: 13,
      lineHeight: 18,
      marginTop: 2,
      color: colors.text2,
    },
    versionText: {
      fontFamily: soraFamily[400],
      fontSize: 12,
      letterSpacing: 0.12,
      color: colors.text3,
    },
    defaultAppText: {
      fontFamily: soraFamily[400],
      fontSize: 13,
      fontStyle: "italic",
      minWidth: 84,
      textAlign: "center",
      color: colors.text3,
    },
    updatingText: {
      fontFamily: soraFamily[500],
      fontSize: 12,
      color: colors.accent,
    },
  });
