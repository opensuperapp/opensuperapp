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
import Scanner from "@/components/Scanner";
import { useQrScanner } from "@/context/QrScannerContext";
import {
  useGlobalSearchParams,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React from "react";

interface QrScannerScreenProps {
  message?: string;
}

const QrScannerContent = ({ message }: QrScannerScreenProps) => {
  const { emitQrCode } = useQrScanner();
  const router = useRouter();
  const { message: routeMessage } = useGlobalSearchParams<{
    message?: string;
  }>();

  const handleMessageScan = (qrCode: string) => {
    emitQrCode(qrCode);
    router.back();
  };

  const displayMessage = message || routeMessage;

  return <Scanner onScan={handleMessageScan} message={displayMessage} />;
};

const QrScannerScreen = () => {
  const { message } = useLocalSearchParams<{ message?: string }>();

  return <QrScannerContent message={message} />;
};

export default QrScannerScreen;
