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
export interface BridgeFunction {
  topic: string;
  handler: (params: any, context: BridgeContext) => Promise<void> | void;
}

export interface BridgeContext {
  topic: string;
  appID: string;
  token: string | null;
  setScannerVisible: (visible: boolean) => void;
  sendResponseToWeb: (method: string, data?: any, requestId?: string) => void;

  pendingTokenRequests: ((token: string) => void)[];
  refreshToken?: () => Promise<void>;
  resolve: (data?: any, requestId?: string) => void;
  reject: (error: string, requestId?: string) => void;

  // Google authentication
  promptAsync?: () => Promise<any>;

  // Navigation
  router?: {
    back: () => void;
  };

  // Device info
  insets?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };

  // QR scanner callback storage
  qrScanCallback?: (qrCode: string) => void;

  // Notification data
  notificationData?: any;
}
