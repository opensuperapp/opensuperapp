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
import { Event } from "@/constants/Event";
import { qrScannerEmitter } from "@/utils/eventEmitter";
import { router } from "expo-router";
import React, { createContext, useCallback, useContext } from "react";

interface QrScannerContextValue {
  emitQrCode: (qrCode: string) => void;
  dismiss: () => void;
  isScanning: boolean;
}

const QrScannerContext = createContext<QrScannerContextValue | null>(null);

interface QrScannerProviderProps {
  children: React.ReactNode;
}

const QrScannerProvider = ({ children }: QrScannerProviderProps) => {
  const emitQrCode = useCallback((qrCode: string) => {
    qrScannerEmitter.emit(Event.QrScanned, qrCode);
  }, []);

  const dismiss = useCallback(() => {
    router.back();
  }, []);

  return (
    <QrScannerContext.Provider
      value={{ emitQrCode, dismiss, isScanning: true }}
    >
      {children}
    </QrScannerContext.Provider>
  );
};

const useQrScanner = () => {
  const context = useContext(QrScannerContext);
  if (!context) {
    throw new Error("useQrScanner must be used within a QrScannerProvider");
  }
  return context;
};

export { QrScannerProvider, useQrScanner };
