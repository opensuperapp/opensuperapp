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

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface NotificationState {
    deviceToken: string | null;
    permissionGranted: boolean;
    isRegistered: boolean;
    lastNotification: any | null;
}

const initialState: NotificationState = {
    deviceToken: null,
    permissionGranted: false,
    isRegistered: false,
    lastNotification: null,
};

const notificationSlice = createSlice({
    name: "notification",
    initialState,
    reducers: {
        setDeviceToken: (state, action: PayloadAction<string | null>) => {
            state.deviceToken = action.payload;
        },
        setPermissionGranted: (state, action: PayloadAction<boolean>) => {
            state.permissionGranted = action.payload;
        },
        setIsRegistered: (state, action: PayloadAction<boolean>) => {
            state.isRegistered = action.payload;
        },
        setLastNotification: (state, action: PayloadAction<any>) => {
            state.lastNotification = action.payload;
        },
        resetNotificationState: (state) => {
            state.deviceToken = null;
            state.permissionGranted = false;
            state.isRegistered = false;
            state.lastNotification = null;
        },
    },
});

export const {
    setDeviceToken,
    setPermissionGranted,
    setIsRegistered,
    setLastNotification,
    resetNotificationState,
} = notificationSlice.actions;

export default notificationSlice.reducer;
