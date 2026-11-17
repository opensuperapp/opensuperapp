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
import { isIos } from "@/constants/Constants";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { OfflineStatusProvider } from "@/context/OfflineStatusContext";
import { QrScannerProvider } from "@/context/QrScannerContext";
import React from "react";
import { KeyboardProvider } from "react-native-keyboard-controller";

type AppProvidersProps = {
  children: React.ReactNode;
};

const AppProviders = ({ children }: AppProvidersProps) => {
  const providers = (
    <NotificationsProvider>
      <QrScannerProvider>
        <OfflineStatusProvider>{children}</OfflineStatusProvider>
      </QrScannerProvider>
    </NotificationsProvider>
  );
  // The chat composer follows the keyboard with it. On Android, enabling the provider
  // stops the window resizing for the keyboard (which every other screen relies on), so
  // it starts off and the chat screen switches it on only while it is focused.
  return <KeyboardProvider enabled={isIos}>{providers}</KeyboardProvider>;
};

export default AppProviders;
