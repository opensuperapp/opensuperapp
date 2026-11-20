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
import BrandIcon from "@/components/brand/BrandIcon";
import ChoreoLabsLogo from "@/components/brand/ChoreoLabsLogo";
import BusinessCardSheet from "@/components/BusinessCardSheet";
import BusinessCardHeaderButton from "@/components/headers/BusinessCardHeaderButton";
import ProfileListItem from "@/components/ProfileListItem";
import SignInArtwork from "@/components/signIn/SignInArtwork";
import SignInMessage from "@/components/SignInMessage";
import {
  brand,
  radius,
  size,
  soraFamily,
  spacing,
  textStyle,
  themes,
  type,
} from "@/constants/brand";
import { SUPER_APP_DEVELOPER_GROUP } from "@/constants/Constants";
import { Event } from "@/constants/enums/Event";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { selectIsSignedIn } from "@/context/slices/authSlice";
import { getUserInfo } from "@/context/slices/userInfoSlice";
import { AppDispatch, RootState } from "@/context/store";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useTrackActiveScreen } from "@/hooks/useTrackActiveScreen";
import { useWalletPassConfig } from "@/hooks/useWalletPassConfig";
import { BasicUserInfo } from "@/types/basicUserInfo.types";
import { DecodedAccessToken } from "@/types/decodeAccessToken.types";
import { authEmitter } from "@/utils/eventEmitter";
import { signOut } from "@/utils/signOut";
import Constants from "expo-constants";
import { useNavigation } from "expo-router";
import { jwtDecode } from "jwt-decode";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

const AVATAR_SIZE = size.avatar.profile;
const RING = size.profileAvatarRing;

/**
 * Settings screen displays user profile information when authenticated,
 * otherwise prompts user to sign in. Also allows user to log out.
 */
const SettingsScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const isSignedIn = useSelector(selectIsSignedIn);
  const { userInfo } = useSelector((state: RootState) => state.userInfo);
  const { colors } = useBrandTheme();
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version;
  const [basicUserInfo, setBasicUserInfo] = useState<BasicUserInfo>({
    firstName: "",
    lastName: "",
    workEmail: "",
    avatarUri: "",
  });
  const [cardVisible, setCardVisible] = useState(false);
  const { cardEnabled } = useWalletPassConfig();

  useTrackActiveScreen(ScreenPaths.PROFILE);

  // One setOptions call: the signed-out artwork is full bleed and drawn in the dark
  // tokens, so the native bar (and its large title) only shows once signed in.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: isSignedIn,
      headerRight: () =>
        isSignedIn && cardEnabled ? (
          <BusinessCardHeaderButton onPress={() => setCardVisible(true)} />
        ) : null,
    });
  }, [navigation, isSignedIn, cardEnabled]);

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
      dispatch(getUserInfo());

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
          onPress: () => signOut(dispatch),
        },
      ]
    );
  }, [dispatch]);

  /**
   * Dev-only: reports the same signal tokenRefresh emits when the server rejects
   * the refresh token with invalid_grant, so the expired-session path can be
   * checked without waiting for a real token to die.
   */
  const handleSimulateSilentLogout = useCallback(() => {
    authEmitter.emit(Event.AuthSession, {
      status: "expired",
      rotationLost: false,
    });
  }, []);

  if (!isSignedIn) {
    return (
      <SignInArtwork
        style={[styles.signIn, { paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.signInLogo}>
          <ChoreoLabsLogo width={200} color="#FFFFFF" />
        </View>
        <View style={styles.signInFoot}>
          <SignInMessage onArtwork />
          <Text style={[styles.versionText, { color: themes.dark.text3 }]}>
            version {version}
          </Text>
        </View>
      </SignInArtwork>
    );
  }

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {/* User info */}
        <View
          style={[
            styles.avatarRing,
            { backgroundColor: colors.card, borderColor: colors.line },
          ]}
        >
          {basicUserInfo.avatarUri ? (
            <Image
              source={{ uri: basicUserInfo.avatarUri }}
              style={[styles.avatar, { backgroundColor: colors.card2 }]}
            />
          ) : (
            <Avatar
              initials={`${basicUserInfo.firstName?.charAt(
                0
              )}${basicUserInfo.lastName?.charAt(0)}`}
              size={AVATAR_SIZE}
            />
          )}
        </View>

        <View style={[styles.listCard, { backgroundColor: colors.card }]}>
          <ProfileListItem
            icon="user"
            title="Name"
            value={`${basicUserInfo.firstName} ${basicUserInfo.lastName}`}
          />
          <View style={[styles.divider, { backgroundColor: colors.line }]} />
          <ProfileListItem
            icon="mail"
            title="Email"
            value={basicUserInfo.workEmail}
          />
        </View>

        <View style={styles.foot}>
          <Text style={[styles.versionText, { color: colors.text3 }]}>
            version {version}
          </Text>

          {/* The prototype's .btn with a leading icon, which PrimaryButton
              doesn't take: Signal fill, Ink label, Flare while pressed. */}
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              {
                backgroundColor: pressed ? brand.flare : colors.primaryFill,
              },
            ]}
            onPress={handleLogout}
            accessibilityRole="button"
          >
            <BrandIcon
              name="logout"
              size={22}
              strokeWidth={1.8}
              color={colors.primaryText}
            />
            <Text style={[styles.logoutText, { color: colors.primaryText }]}>
              Sign Out
            </Text>
          </Pressable>

          {__DEV__ && isSuperAppDeveloper && (
            <TouchableOpacity
              activeOpacity={0.5}
              style={[styles.debugLogoutButton, { borderColor: colors.line2 }]}
              onPress={handleSimulateSilentLogout}
            >
              <Text style={[styles.debugLogoutText, { color: colors.text2 }]}>
                DEV: Simulate Silent Logout (invalid_grant)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <BusinessCardSheet
        visible={cardVisible}
        onClose={() => setCardVisible(false)}
      />
    </>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  // flexGrow so the foot's marginTop: "auto" still pins Sign Out to the bottom
  // when the content is shorter than the screen.
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: 16,
    paddingBottom: 24,
  },
  signIn: {
    flex: 1,
    paddingHorizontal: 24,
  },
  signInLogo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  signInFoot: {
    alignItems: "center",
    gap: 14,
  },
  avatarRing: {
    alignSelf: "center",
    marginTop: 24 - RING,
    marginBottom: 32 - RING,
    padding: RING,
    borderRadius: (AVATAR_SIZE + RING * 2) / 2,
    // The prototype's outer 1px line hairline around the card-coloured ring.
    borderWidth: 1,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  listCard: {
    borderRadius: radius.card,
    paddingHorizontal: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  foot: {
    marginTop: "auto",
    paddingTop: 32,
    alignItems: "center",
    gap: 14,
  },
  versionText: {
    ...textStyle({ size: 13, weight: 400, tracking: 0.02 }),
  },
  logoutButton: {
    alignSelf: "stretch",
    height: size.buttonPrimaryHeight,
    borderRadius: radius.buttonPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  logoutText: {
    ...textStyle({ ...type.storeRowName, tracking: -0.01 }),
  },
  debugLogoutButton: {
    alignSelf: "stretch",
    paddingVertical: 12,
    borderRadius: radius.buttonSmall,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  debugLogoutText: {
    fontFamily: soraFamily[600],
    fontSize: 13,
    lineHeight: 18,
  },
});
