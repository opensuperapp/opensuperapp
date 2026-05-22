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

import { useEffect, useState, useCallback } from "react";
import { Alert } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/context/store";
import { getUserInfo } from "@/context/slices/userInfoSlice";
import { logout } from "@/services/authService";
import { jwtDecode } from "jwt-decode";
import { DecodedAccessToken } from "@/types/decodeAccessToken.types";
import { BasicUserInfo } from "@/types/basicUserInfo.types";
import { performLogout } from "@/utils/performLogout";

/**
 * Hook for managing profile/user authentication state
 */
export const useProfile = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const { userInfo } = useSelector((state: RootState) => state.userInfo);
  
  const [basicUserInfo, setBasicUserInfo] = useState<BasicUserInfo>({
    firstName: "",
    lastName: "",
    workEmail: "",
    avatarUri: "",
  });

  useEffect(() => {
    if (userInfo) {
      const qualityUserThumbnail = userInfo.userThumbnail
        ? userInfo.userThumbnail.split("=s100")[0]
        : "";
      setBasicUserInfo({
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        workEmail: userInfo.workEmail,
        avatarUri: qualityUserThumbnail,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, dispatch]);

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
            await dispatch(performLogout());
          },
        },
      ]
    );
  }, [dispatch]);

  return {
    basicUserInfo,
    handleLogout,
  };
};
