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

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import * as Google from "expo-auth-session/providers/google";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokenExchange } from "@/services/authService";
import { logout } from "@/services/authService";
import googleAuthenticationService from "@/services/googleService";
import {
  getBridgeHandler,
  getResolveMethod,
  getRejectMethod,
} from "@/utils/bridgeRegistry";
import { BridgeContext } from "@/types/bridge.types";
import { BRIDGE_FUNCTION as QR_REQUEST_BRIDGE_FUNCTION } from "@/utils/bridgeHandlers/qrRequest";
import { RootState } from "@/context/store";
import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_SCOPES,
  DEVELOPER_APP_DEFAULT_URL,
  ALLOWED_BRIDGE_METHODS_CONFIG_KEY,
} from "@/constants/Constants";
import {
  recordMicroAppLoad,
  recordMicroAppLoadDuration,
  recordMicroAppError,
} from "@/telemetry/metrics";

interface MicroAppParams {
  webViewUri: string;
  appName: string;
  clientId: string;
  exchangedToken: string;
  appId: string;
  displayMode?: string;
  notificationData?: string;
}

/**
 * Hook for managing MicroApp WebView bridge and state
 */
export const useMicroApp = (params: MicroAppParams) => {
  const { clientId, exchangedToken, appId, notificationData } = params;

  const dispatch = useDispatch();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Get allowed bridge methods from Redux store configs
  const allowedBridgeMethods = useSelector((state: RootState) => {
    const app = state.apps.apps.find((app) => app.appId === appId);
    if (!app?.configs) return undefined;
    const bridgeMethodsConfig = app.configs.find(
      (config) => config.configKey === ALLOWED_BRIDGE_METHODS_CONFIG_KEY
    );

    return bridgeMethodsConfig?.configValue as string[] | undefined;
  });

  const [isScannerVisible, setScannerVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [token, setToken] = useState<string | null>();
  const [webUri, setWebUri] = useState<string>(DEVELOPER_APP_DEFAULT_URL);

  const webviewRef = useRef<WebView>(null);
  const pendingTokenRequestsRef = useRef<((token: string) => void)[]>([]);
  const qrScanCallbackRef = useRef<((qrCode: string) => void) | null>(null);
  const loadStartTimeRef = useRef<number | null>(null);

  const isDeveloper: boolean = appId.includes("developer");
  const isTotp: boolean = appId.includes("totp");

  // Google Auth
  const [, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    scopes: GOOGLE_SCOPES,
  });

  // Send response to micro app
  const sendResponseToWeb = (method: string, data?: any) => {
    webviewRef.current?.injectJavaScript(
      `window.nativebridge.${method}(${JSON.stringify(data)});`
    );
  };

  // Handle Google authentication response
  useEffect(() => {
    if (response) {
      googleAuthenticationService(response)
        .then((res) => {
          if (res.status) {
            sendResponseToWeb("resolveGoogleLogin", res.userInfo);
          } else {
            sendResponseToWeb("rejectGoogleLogin", res.error);
          }
        })
        .catch((err) => {
          console.error("Google authentication error:", err);
          sendResponseToWeb("rejectGoogleLogin", err.message);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const sendTokenToWebView = (token: string) => {
    if (!token) return;
    sendResponseToWeb("resolveToken", token);

    while (pendingTokenRequestsRef.current.length > 0) {
      const resolve = pendingTokenRequestsRef.current.shift();
      resolve?.(token);
    }
  };

  // Token exchange and refresh logic
  const fetchAndSetToken = async () => {
    try {
      const newToken = await tokenExchange(
        dispatch,
        clientId,
        exchangedToken,
        appId,
        logout
      );
      if (!newToken) throw new Error("Token exchange failed");
      setToken(newToken);
      sendTokenToWebView(newToken);
    } catch (error) {
      console.error("Token exchange error:", error);
    }
  };

  // Initial token exchange
  useEffect(() => {
    fetchAndSetToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // Inject notification data if available
  useEffect(() => {
    if (notificationData) {
      try {
        const parsedData = JSON.parse(notificationData);
        // Wait a bit for the webview to be ready, or just send it.
        // Ideally the web app should request it, but pushing it is also fine if the bridge is ready.
        // Since we don't know if the bridge is ready, we might want to retry or let the app pull it.
        // For now, we push it.
        setTimeout(() => {
          sendResponseToWeb("resolveNotificationData", parsedData);
        }, 1000);
      } catch (e) {
        console.error("Failed to parse notification data", e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationData]);

  const isBridgeMethodAllowed = (topic: string): boolean => {
    // If allowedBridgeMethods is undefined or null, block all methods (restrictive by default)
    if (!allowedBridgeMethods) return false;

    // If it's an empty array, block all methods
    if (allowedBridgeMethods.length === 0) return false;

    // Check if topic is in the allowed list
    return allowedBridgeMethods.includes(topic);
  };

  // Handle WebView messages
  const onMessage = async (event: WebViewMessageEvent) => {
    try {
      const { topic, data, requestId } = JSON.parse(event.nativeEvent.data);
      if (!topic) throw new Error("Invalid message format: Missing topic");

      // Check if bridge method is allowed
      if (!isBridgeMethodAllowed(topic)) {
        console.error("Bridge method not allowed:", topic);
        return;
      }

      const handler = getBridgeHandler(topic);
      if (!handler) {
        console.error("Unknown topic:", topic);
        return;
      }

      const bridgeContext: BridgeContext = {
        topic,
        appID: appId as string,
        token: token || null,
        setScannerVisible,
        sendResponseToWeb: (method: string, data?: any, reqId?: string) => {
          const idToUse = reqId || requestId;
          webviewRef.current?.injectJavaScript(
            `window.nativebridge.${method}(${JSON.stringify(
              data
            )}, "${idToUse}");`
          );
        },
        pendingTokenRequests: pendingTokenRequestsRef.current,
        refreshToken: fetchAndSetToken,
        resolve: (data?: any, reqId?: string) => {
          const methodName = getResolveMethod(topic);
          const idToUse = reqId || requestId;
          webviewRef.current?.injectJavaScript(
            `window.nativebridge.${methodName}(${JSON.stringify(
              data
            )}, "${idToUse}");`
          );
        },
        reject: (error: string, reqId?: string) => {
          const methodName = getRejectMethod(topic);
          const idToUse = reqId || requestId;
          webviewRef.current?.injectJavaScript(
            `window.nativebridge.${methodName}("${error}", "${idToUse}");`
          );
        },
        promptAsync,
        router,
        insets: {
          top: insets.top,
          bottom: insets.bottom,
          left: insets.left,
          right: insets.right,
        },
        qrScanCallback: qrScanCallbackRef.current || undefined,
        notificationData: notificationData ? JSON.parse(notificationData) : undefined,
      };

      await handler(data, bridgeContext);

      if (topic === QR_REQUEST_BRIDGE_FUNCTION.topic) {
        qrScanCallbackRef.current = bridgeContext.qrScanCallback || null;
      }
    } catch (error) {
      console.error("Error handling WebView message:", error);
    }
  };

  const handleError = (syntheticEvent: any) => {
    setHasError(true);
    const error = syntheticEvent.nativeEvent;
    console.error("WebView error:", error);
    recordMicroAppError(appId, error?.description || "unknown");
  };

  const handleLoadStart = () => {
    loadStartTimeRef.current = Date.now();
    recordMicroAppLoad(appId);
  };

  const handleLoadEnd = () => {
    if (loadStartTimeRef.current) {
      const duration = Date.now() - loadStartTimeRef.current;
      recordMicroAppLoadDuration(duration, appId);
      loadStartTimeRef.current = null;
    }
  };

  const reloadWebView = () => {
    setHasError(false);
    webviewRef.current?.reload();
  };

  const handleQRScan = (qrCode: string) => {
    if (qrScanCallbackRef.current) {
      qrScanCallbackRef.current(qrCode);
    }
    setScannerVisible(false);
  };

  const handleChangeWebUri = (value: string | undefined) => {
    if (value) {
      setWebUri(value);
    }
  };

  return {
    // State
    isScannerVisible,
    hasError,
    webUri,
    isDeveloper,
    isTotp,
    insets,

    // Refs
    webviewRef,

    // Handlers
    onMessage,
    handleError,
    handleLoadStart,
    handleLoadEnd,
    reloadWebView,
    handleQRScan,
    handleChangeWebUri,
    setWebUri,
  };
};
