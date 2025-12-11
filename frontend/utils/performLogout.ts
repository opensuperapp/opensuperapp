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
import { APPS, AUTH_DATA, USER_INFO } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { resetAll } from "@/context/slices/authSlice";
import { persistor } from "@/context/store";
import { logout } from "@/services/authService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SecureStorage from "@/utils/secureStorage";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { router } from "expo-router";
import { Alert } from "react-native";
import { recordAuthLogout } from "@/telemetry/metrics";

// Logout user
export const performLogout = createAsyncThunk(
  "auth/logout",
  async (_, { dispatch }) => {
    try {
      await logout(); // Call Asgardeo logout
      recordAuthLogout(); // Record logout metric
      await persistor.purge(); // Clear redux-persist storage
      dispatch(resetAll()); // Reset Redux state completely

      await SecureStorage.removeItem(AUTH_DATA);
      await AsyncStorage.removeItem(USER_INFO);
      await AsyncStorage.removeItem(APPS);

      Alert.alert(
        "Logout Successful",
        "You have been logged out successfully.",
        [
          {
            text: "OK",
            onPress: () => router.navigate(ScreenPaths.LOGIN),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error("Logout error:", error);
    }
  }
);
