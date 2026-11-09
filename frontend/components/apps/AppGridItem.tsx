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
import UpdateOverlay from "@/components/UpdateOverlay";
import {
  press,
  radius,
  size as sizes,
  soraFamily,
  textStyle,
  themes,
  type,
} from "@/constants/brand";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { DisplayMode } from "@/types/navigation";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AppTile from "./AppTile";

type AppGridItemProps = {
  name: string;
  webViewUri?: string | null;
  clientId: string;
  exchangedToken: string;
  exchangedIdToken: string;
  appId: string;
  iconUrl?: string;
  displayMode?: DisplayMode;
  version?: string;
  isUpdating?: boolean;
  downloadProgress?: number;
  width: number;
};

const TILE = sizes.tile.grid;

/** My Apps grid cell: app tile and label; opens the micro app on press. */
const AppGridItem = React.memo(function AppGridItem({
  name,
  webViewUri,
  clientId,
  exchangedToken,
  exchangedIdToken,
  appId,
  iconUrl,
  displayMode,
  version,
  isUpdating = false,
  downloadProgress,
  width,
}: AppGridItemProps) {
  const { colors } = useBrandTheme();

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
        version,
      },
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { width },
        pressed && { transform: [{ scale: press.icon[1] }] },
      ]}
      onPress={handlePress}
      disabled={isUpdating}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      <View style={isUpdating && styles.tileUpdating}>
        <AppTile name={name} appId={appId} iconUrl={iconUrl} size={TILE} />
      </View>
      {isUpdating && (
        <View
          style={[styles.updateOverlay, { backgroundColor: colors.backdrop }]}
        >
          <UpdateOverlay
            size={32}
            strokeWidth={3}
            color={themes.dark.text}
            progress={downloadProgress}
          />
        </View>
      )}
      <Text
        style={[styles.label, { color: colors.text }]}
        numberOfLines={1}
        ellipsizeMode="tail"
        allowFontScaling={false}
      >
        {name}
      </Text>
      {isUpdating && (
        <Text
          style={[styles.updating, { color: colors.accent }]}
          allowFontScaling={false}
        >
          Updating...{" "}
          {downloadProgress !== undefined
            ? `${Math.round(downloadProgress)}%`
            : ""}
        </Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
  },
  tileUpdating: {
    opacity: 0.4,
  },
  updateOverlay: {
    position: "absolute",
    top: 0,
    width: TILE,
    height: TILE,
    borderRadius: TILE * radius.appTileRatio,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    ...textStyle(type.gridAppLabel),
    maxWidth: "100%",
    textAlign: "center",
  },
  updating: {
    fontFamily: soraFamily[500],
    fontSize: 10,
    marginTop: -6,
  },
});

export default AppGridItem;
