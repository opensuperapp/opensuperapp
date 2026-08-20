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
import Avatar from "@/components/Avatar";
import ProfileListItem from "@/components/ProfileListItem";
import SignInMessage from "@/components/SignInMessage";
import { Colors } from "@/constants/Colors";
import { SUPER_APP_DEVELOPER_GROUP } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { disableFCMToken } from "@/context/slices/deviceSlice";
import { getUserInfo } from "@/context/slices/userInfoSlice";
import { AppDispatch, RootState } from "@/context/store";
import { useTrackActiveScreen } from "@/hooks/useTrackActiveScreen";
import { logout } from "@/services/authService";
import { BasicUserInfo } from "@/types/basicUserInfo.types";
import { DecodedAccessToken } from "@/types/decodeAccessToken.types";
import { performLogout } from "@/utils/performLogout";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { jwtDecode } from "jwt-decode";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";

/**
 * Settings screen displays user profile information when authenticated,
 * otherwise prompts user to sign in. Also allows user to log out.
 */
const SettingsScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const { userInfo } = useSelector((state: RootState) => state.userInfo);
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme ?? "light");
  const version = Constants.expoConfig?.version;
  const [basicUserInfo, setBasicUserInfo] = useState<BasicUserInfo>({
    firstName: "",
    lastName: "",
    workEmail: "",
    avatarUri: "",
  });

  useTrackActiveScreen(ScreenPaths.PROFILE);

  const isSuperAppDeveloper = useMemo(() => {
    if (!accessToken || !SUPER_APP_DEVELOPER_GROUP) return false;
    try {
      const decoded = jwtDecode<DecodedAccessToken>(accessToken);
      return decoded.groups?.includes(SUPER_APP_DEVELOPER_GROUP) ?? false;
    } catch {
      return false;
    }
  }, [accessToken]);

  useEffect(() => {
    if (userInfo) {
      const qualityEmployeeThumbnail = userInfo.employeeThumbnail
        ? userInfo.employeeThumbnail.split("=s100")[0]
        : "";
      setBasicUserInfo({
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        workEmail: userInfo.workEmail,
        avatarUri: qualityEmployeeThumbnail,
      });
    }
  }, [userInfo]);

  useEffect(() => {
    if (accessToken && !userInfo) {
      dispatch(getUserInfo(logout));

      try {
        const decoded = jwtDecode<DecodedAccessToken>(accessToken);
        setBasicUserInfo({
          firstName: decoded.given_name || "",
          lastName: decoded.family_name || "",
          workEmail: decoded.email || "",
          avatarUri: "",
        });
      } catch (error) {
        console.error("Error decoding token", error);
      }
    }
  }, [accessToken, dispatch]);

  /**
   * Handles user sign out with confirmation dialog.
   */
  const handleLogout = useCallback(() => {
    Alert.alert(
      "Confirm Sign Out",
      "Are you sure you want to sign out from this app?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await dispatch(disableFCMToken());
            await dispatch(performLogout());
          },
        },
      ]
    );
  }, [dispatch]);

  /**
   * Dev-only: fires the same onLogout callback that refreshAccessToken()/
   * apiRequest() invoke when a refresh-token exchange comes back 400, or an
   * API call still 401's after a refresh retry (see services/authService.ts,
   * utils/requestHandler.ts). Lets us verify the silent-logout UI reacts
   * correctly without waiting for a real token to expire.
   */
  const handleSimulateSilentLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error simulating silent logout:", error);
    }
  }, []);

  if (!accessToken) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.signInContainer}>
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <SignInMessage />
            </View>
          </View>
          <View style={styles.bottomContainer}>
            <View style={styles.versionContainer}>
              <Text style={styles.versionText}>version {version}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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

        {__DEV__ && isSuperAppDeveloper && (
          <TouchableOpacity
            activeOpacity={0.5}
            style={styles.debugLogoutButton}
            onPress={handleSimulateSilentLogout}
          >
            <Text style={styles.debugLogoutText}>
              DEV: Simulate Silent Logout (401)
            </Text>
          </TouchableOpacity>
        )}
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
    signInContainer: {
      flex: 1,
      justifyContent: "space-between",
    },
    overlay: {
      flex: 1,
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
      justifyContent: "center",
      alignItems: "center",
    },
    modal: {
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
      padding: 30,
      borderRadius: 16,
      width: "90%",
      alignItems: "center",
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
    debugLogoutButton: {
      marginHorizontal: 60,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors[colorScheme].borderColor,
      alignItems: "center",
      justifyContent: "center",
    },
    debugLogoutText: {
      fontSize: 13,
      lineHeight: 18,
      color: Colors[colorScheme].mutedTextColor,
      fontWeight: "600",
    },
  });
