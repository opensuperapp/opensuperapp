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
import { Colors } from "@/constants/Colors";
import { Styles } from "@/constants/Styles";
import { useQrScanner } from "@/context/QrScannerContext";
import Constants from "expo-constants";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { useColorScheme, View } from "react-native";
import Scanner from "../Scanner";
import CloseButton from "../headers/CloseButton";
import { QrScannerScreenProps } from "./QRScanner.ios";

const QrScanner = ({ message }: QrScannerScreenProps) => {
  const { emitQrCode } = useQrScanner();
  const router = useRouter();
  const { message: routeMessage } = useGlobalSearchParams<{
    message?: string;
  }>();
  const colorScheme = useColorScheme();

  const handleMessageScan = (qrCode: string) => {
    emitQrCode(qrCode);
    router.back();
  };

  const displayMessage = message || routeMessage;
  const paddingTop = Constants.statusBarHeight;

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <Scanner onScan={handleMessageScan} message={displayMessage} />
      <CloseButton
        style={{
          position: "absolute",
          top: paddingTop + Styles.Padding.default,
          right: Styles.Padding.default,
          backgroundColor:
            Colors[colorScheme ?? "light"].primaryBackgroundColor,
          borderRadius: Styles.BorderRadius.default,
          padding: 8,
        }}
      />
    </View>
  );
};

export default QrScanner;
