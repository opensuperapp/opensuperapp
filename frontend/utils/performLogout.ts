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
import { APPS, USER_INFO } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { resetAll } from "@/context/slices/authSlice";
import {
  clearDeviceState,
  clearLastSentFcmToken,
} from "@/context/slices/deviceSlice";
import { persistor } from "@/context/store";
import { logout } from "@/services/authService";
import { clearNotifications } from "@/services/scheduledNotifications";
import { clearAuthDataFromSecureStore } from "@/utils/authTokenStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { router } from "expo-router";
import { deleteItemAsync } from "expo-secure-store";
import { Alert } from "react-native";

// Logout user
export const performLogout = createAsyncThunk(
  "auth/logout",
  async (_, { dispatch }) => {
    try {
      await logout(); // Call Asgardeo logout
      await clearAuthDataFromSecureStore();
      await persistor.purge(); // Clear redux-persist storage
      dispatch(resetAll()); // Reset Redux state completely
      dispatch(clearDeviceState()); // Reset device state
      dispatch(clearLastSentFcmToken()); // Clear last sent FCM token

      await AsyncStorage.removeItem(APPS);
      await deleteItemAsync(USER_INFO);
      // Clear all scheduled notifications and stored notification data
      await clearNotifications();

      Alert.alert(
        "Logout Successful",
        "You have been logged out successfully.",
        [
          {
            text: "OK",
            onPress: () => router.navigate(ScreenPaths.FEED),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error("Logout error:", error);
    }
  }
);
