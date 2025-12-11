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
  TouchableOpacity,
  useColorScheme,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import Constants from "expo-constants";
import ProfileListItem from "@/components/ProfileListItem";
import Avatar from "@/components/Avatar";
import { useTrackActiveScreen } from "@/hooks/useTrackActiveScreen";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { useProfile } from "@/hooks/useProfile";

/**
 * Settings screen displays user profile information when authenticated,
 * otherwise prompts user to sign in. Also allows user to log out.
 */
const SettingsScreen = () => {
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme ?? "light");
  const version = Constants.expoConfig?.version;

  useTrackActiveScreen(ScreenPaths.PROFILE);

  const { basicUserInfo, handleLogout } = useProfile();

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* User info */}
      <View style={styles.topContainer}>
        <View style={styles.avatarWrapper}>
          {basicUserInfo.avatarUri ? (
            <Image
              source={{ uri: basicUserInfo.avatarUri }}
              style={styles.avatar}
            />
          ) : (
            <Avatar
              initials={`${basicUserInfo.firstName?.charAt(
                0
              )}${basicUserInfo.lastName?.charAt(0)}`}
              size={180}
            />
          )}
        </View>

        <ProfileListItem
          icon="person-outline"
          title="Name"
          value={`${basicUserInfo.firstName} ${basicUserInfo.lastName}`}
        />

        <ProfileListItem
          icon="mail-outline"
          title="Email"
          value={basicUserInfo.workEmail}
        />
      </View>

      <View style={styles.bottomContainer}>
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>version {version}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.5}
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <View style={styles.logoutRow}>
            <Ionicons
              name="log-out-outline"
              size={20}
              color={Colors[colorScheme ?? "light"].primaryBackgroundColor}
              style={styles.logoutIcon}
            />
            <Text style={styles.logoutText}>Sign Out</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
      justifyContent: "space-between",
    },
    topContainer: {
      marginLeft: 10,
      marginTop: 15,
    },
    avatarWrapper: {
      alignItems: "center",
      marginTop: 24,
      marginBottom: 12,
    },
    avatar: {
      width: 160,
      height: 160,
      borderRadius: 100,
      backgroundColor: Colors[colorScheme].libraryCardBackgroundColor,
    },
    bottomContainer: {
      marginBottom: 80,
    },
    versionContainer: {
      alignItems: "center",
    },
    versionText: {
      color: Colors[colorScheme].text,
    },
    logoutButton: {
      marginVertical: 20,
      marginHorizontal: 60,
      paddingVertical: 12,
      backgroundColor: Colors.companyOrange,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    logoutRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    logoutIcon: {
      marginRight: 8,
    },
    logoutText: {
      fontSize: 16,
      lineHeight: 20,
      color: Colors[colorScheme].primaryBackgroundColor,
      fontWeight: "600",
    },
  });
