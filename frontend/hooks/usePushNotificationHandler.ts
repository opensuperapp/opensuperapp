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
import { ENABLE_FIREBASE } from "@/constants/Constants";
import {
  loadLastSentFCMToken,
  pushFcmToken,
} from "@/context/slices/deviceSlice"; // The async thunk
import { AppDispatch, RootState } from "@/context/store";
import {
  getPushToken,
  requestNotificationPermission,
  setupTokenRefreshListener,
} from "@/utils/push-notification";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

/**
 * A custom hook to manage the FCM push notification token lifecycle.
 * Automatically requests permission, gets the token, and sends it to the backend
 * as soon as the user is authenticated. It also handles token refreshes.
 */
export const usePushNotificationHandler = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { accessToken } = useSelector((state: RootState) => state.auth);
  const { lastSentFCMToken } = useSelector((state: RootState) => state.device);

  useEffect(() => {
    if (!ENABLE_FIREBASE) return;
    dispatch(loadLastSentFCMToken());

    if (accessToken) {
      const getAndPushToken = async () => {
        try {
          await requestNotificationPermission();

          const pushToken = await getPushToken();

          if (pushToken && pushToken.token !== lastSentFCMToken) {
            dispatch(pushFcmToken(pushToken));
          } else {
            console.warn(
              "No FCM token received or token is the same as the last sent token."
            );
          }
        } catch (error) {
          console.error("Error occurred during FCM token setup:", error);
        }
      };

      getAndPushToken();

      const unsubscribe = setupTokenRefreshListener((refreshedToken) => {
        if (refreshedToken.token !== lastSentFCMToken) {
          dispatch(pushFcmToken(refreshedToken));
        } else {
          console.warn(
            "Refreshed token is the same as the last sent token."
          );
        }
      });

      return () => {
        unsubscribe();
      };
    } else {
      console.warn("No accessToken — push notification setup skipped.");
    }
  }, [accessToken, dispatch, lastSentFCMToken]);
};
