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
import NotFound from "@/components/NotFound";
import OfflineToast, {
  OFFLINE_TOAST_ANIMATION_MS,
} from "@/components/OfflineToast";
import TextPromptDialog from "@/components/TextPromptDialog";
import { soraFamily, themes } from "@/constants/brand";
import { Colors } from "@/constants/Colors";
import {
  DEVELOPER_APP_ANDROID_DEFAULT_URL,
  DEVELOPER_APP_IOS_DEFAULT_URL,
  FULL_SCREEN_VIEWING_MODE,
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_SCOPES,
  GOOGLE_WEB_CLIENT_ID,
  isAndroid,
  isIos,
} from "@/constants/Constants";
import { Event } from "@/constants/enums/Event";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { openMicroApp } from "@/utils/openMicroApp";
import { RootState } from "@/context/store";
import { useLeaveWhenSessionEnds } from "@/hooks/useLeaveWhenSessionEnds";
import {
  isTokenExpired,
  tokenExchange,
  TokenExchangeResult,
} from "@/services/authService";
import googleAuthenticationService, {
  getGoogleUserInfo,
  isAuthenticatedWithGoogle,
  restoreGoogleDriveBackup,
  uploadToGoogleDrive,
} from "@/services/googleService";
import {
  cancelLocalNotification,
  clearNotifications,
  scheduleSessionNotifications,
} from "@/services/scheduledNotifications";
import {
  BrowserConfig,
  DismissButtonStyle,
  mapToWebBrowserPresentationStyle,
  ScheduledNotificationData,
  ScheduledNotificationIdentifiable,
} from "@/types/microApp.types";
import { MicroAppParams } from "@/types/navigation";
import { injectedJavaScript, TOPIC } from "@/utils/bridge";
import { qrScannerEmitter } from "@/utils/eventEmitter";
import {
  isBootstrapUri,
  isWithinMicroAppBoundary,
  resolveMicroAppBoundary,
} from "@/utils/microAppOrigin";
import { scopeMicroAppStorageKey } from "@/utils/microAppStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as MailComposer from "expo-mail-composer";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import { useDispatch, useSelector } from "react-redux";

WebBrowser.maybeCompleteAuthSession();

type NativeLogLevel = "info" | "warn" | "error";

const TOKEN_UNAVAILABLE = "Could not get a token for this app";

// The offline toast is shown on opening, then gets out of the micro app's way.
const OFFLINE_TOAST_AUTO_HIDE_MS = 4000;

const MicroApp = () => {
  const {
    webViewUri,
    appName,
    clientId,
    exchangedToken,
    exchangedIdToken,
    appId,
    displayMode,
    version,
    launchData,
  } = useLocalSearchParams<MicroAppParams>();
  const { bottom: bottomSafeArea } = useSafeAreaInsets();

  const [hasError, setHasError] = useState(false);
  // react-native-webview 14 declares WebView<P = undefined>, which makes every
  // prop `never`; spell the props type argument out (13.x defaulted it to {}).
  const webviewRef = useRef<WebView<object>>(null);
  const dispatch = useDispatch();
  const router = useRouter();
  const [webUri, setWebUri] = useState<string>(
    isIos ? DEVELOPER_APP_IOS_DEFAULT_URL : DEVELOPER_APP_ANDROID_DEFAULT_URL
  );
  const [appUrlDialogVisible, setAppUrlDialogVisible] = useState(false);
  const colorScheme = useColorScheme();
  const apps = useSelector((state: RootState) => state.apps.apps);
  const appScopes = useSelector(
    (state: RootState) => state.appConfig.appScopes
  );
  const isDeveloper: boolean = appId.includes("developer");
  const isTotp: boolean = appId.includes("totp");
  const insets = useSafeAreaInsets();
  const shouldShowHeader: boolean = displayMode !== FULL_SCREEN_VIEWING_MODE;
  const { width, height } = useWindowDimensions();
  const [offlineToastVisible, setOfflineToastVisible] = useState(false);
  const [offlineToastHeight, setOfflineToastHeight] = useState(0);
  const tokenErrorLift = useRef(new Animated.Value(0)).current;

  // The sign-in error and the offline toast are both pinned to the bottom; the error moves
  // up out of the toast's way, and back down once the toast has gone.
  useEffect(() => {
    // The toast already covers the safe area the error sits above.
    const lift = offlineToastVisible
      ? Math.max(0, offlineToastHeight - insets.bottom)
      : 0;
    const animation = Animated.timing(tokenErrorLift, {
      toValue: -lift,
      // The toast's own slide, so the two move together.
      duration: OFFLINE_TOAST_ANIMATION_MS,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [offlineToastVisible, offlineToastHeight, insets.bottom, tokenErrorLift]);

  // Every token it asks for from here on would fail; the sign-in prompt takes over.
  useLeaveWhenSessionEnds(() => router.back());

  // Where the micro app is served from, and the boundary every navigation and
  // bridge message is matched against.
  const microAppUri = isDeveloper
    ? webUri
    : `${Paths.document.uri}${webViewUri}`;
  const microAppBoundary = resolveMicroAppBoundary(microAppUri);

  // Token and ID token states
  const [token, setToken] = useState<string | null>();
  const [idToken, setIdToken] = useState<string | null>();
  const [tokenUnavailable, setTokenUnavailable] = useState(false);
  const [isRetryingToken, setIsRetryingToken] = useState(false);
  // An app with no client id has no token to exchange for, so nothing to retry.
  const showTokenError = tokenUnavailable && Boolean(clientId);

  // Keyboard Listeners
  useEffect(() => {
    const keyboardWillShowSubscription = Keyboard.addListener(
      "keyboardWillShow",
      () => sendResponseToWeb("resolveKeyboardWillShow")
    );
    const keyboardWillHideSubscription = Keyboard.addListener(
      "keyboardWillHide",
      () => sendResponseToWeb("resolveKeyboardWillHide")
    );
    const keyboardDidShowSubscription = Keyboard.addListener(
      "keyboardDidShow",
      () => sendResponseToWeb("resolveKeyboardDidShow")
    );
    const keyboardDidHideSubscription = Keyboard.addListener(
      "keyboardDidHide",
      () => sendResponseToWeb("resolveKeyboardDidHide")
    );

    return () => {
      keyboardWillShowSubscription.remove();
      keyboardWillHideSubscription.remove();
      keyboardDidShowSubscription.remove();
      keyboardDidHideSubscription.remove();
    };
  }, []);

  const pendingTokenRequests = useRef<((token: string) => void)[]>([]);
  const pendingIdTokenRequests = useRef<((idToken: string) => void)[]>([]);
  const tokenExchangePromise =
    useRef<Promise<TokenExchangeResult | null> | null>(null);

  // Function to refresh token(s) if expired
  const refreshTokenIfExpired =
    async (): Promise<TokenExchangeResult | null> => {
      if (tokenExchangePromise.current) {
        return tokenExchangePromise.current;
      }

      tokenExchangePromise.current = (async () => {
        try {
          const result = await tokenExchange(
            dispatch,
            clientId,
            exchangedToken,
            exchangedIdToken,
            appId,
            appScopes
          );
          if (result) {
            if (result.accessToken) setToken(result.accessToken);
            if (result.idToken) setIdToken(result.idToken);
          }
          return result;
        } finally {
          tokenExchangePromise.current = null;
        }
      })();

      return tokenExchangePromise.current;
    };

  // Event listener for QR Code scanned
  useEffect(() => {
    const unsubscribe = qrScannerEmitter.on(
      Event.QrScanned,
      (qrCode: string) => {
        sendQrToWebView(qrCode);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Create styles for the micro app.
   * @param colorScheme - The color scheme of the micro app
   * @param bottomSafeArea - The bottom safe area of the micro app.
   * @returns The styles for the micro app
   */
  const styles = createStyles(
    colorScheme ?? "light",
    shouldShowHeader ? bottomSafeArea : 0
  );

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    scopes: GOOGLE_SCOPES,
  });

  // Function to send response to micro app
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
  }, [response]);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        // Shared with the bridge's token requests, so one made during startup waits on
        // this exchange instead of racing it to a different answer.
        const result = await refreshTokenIfExpired();
        if (!result) throw new Error("Token exchange failed");
        if (result.accessToken) sendTokenToWebView(result.accessToken);
        if (result.idToken) sendIdTokenToWebView(result.idToken);
      } catch (error) {
        console.error("Token exchange error:", error);
        rejectTokenRequest("rejectToken", null);
      }
    };

    fetchToken();
  }, [clientId]);

  const openQrScanner = () => {
    router.navigate({
      pathname: ScreenPaths.QR_SCANNER,
      params: {
        message: isTotp
          ? "We need access to your camera to scan QR codes for generating one-time passwords (TOTP) for secure authentication. This will allow you to easily log in to your accounts."
          : undefined,
      },
    });
  };

  // Function to send token to WebView
  const sendTokenToWebView = (token: string) => {
    if (!token) return;
    setTokenUnavailable(false);
    sendResponseToWeb("resolveToken", token);
    // Resolve any pending token requests
    while (pendingTokenRequests.current.length > 0) {
      const resolve = pendingTokenRequests.current.shift();
      resolve?.(token);
    }
  };

  // Function to send ID token to WebView
  const sendIdTokenToWebView = (idToken: string) => {
    if (!idToken) return;
    sendResponseToWeb("resolveIdToken", idToken);

    while (pendingIdTokenRequests.current.length > 0) {
      const resolve = pendingIdTokenRequests.current.shift();
      resolve?.(idToken);
    }
  };

  // Answers a token request that cannot be filled, so the micro app's promise settles
  // instead of hanging. When the exchange itself failed - as opposed to coming back
  // without an ID token - the user is told too: an expired session closes this screen,
  // so what is left is the connection or the server, and either may come back.
  const rejectTokenRequest = (
    method: "rejectToken" | "rejectIdToken",
    exchange: TokenExchangeResult | null
  ) => {
    sendResponseToWeb(method, TOKEN_UNAVAILABLE);
    if (!exchange) setTokenUnavailable(true);
  };

  const retryToken = async () => {
    setIsRetryingToken(true);
    const result = await refreshTokenIfExpired();
    setIsRetryingToken(false);
    if (result?.accessToken) sendTokenToWebView(result.accessToken);
    if (result?.idToken) sendIdTokenToWebView(result.idToken);
  };

  // Function to send QR string to WebView
  const sendQrToWebView = (qrString: string) => {
    sendResponseToWeb("resolveQrCode", qrString);
  };

  // Function to send safe area insets to WebView
  const sendSafeAreaInsetsToWebView = () => {
    sendResponseToWeb("resolveDeviceSafeAreaInsets", { insets });
  };

  // Function to view alert from parent app
  const handleAlert = async (
    title: string,
    message: string,
    buttonText: string
  ) => {
    Alert.alert(title, message, [{ text: buttonText }], { cancelable: false });
  };

  // Function to get confirmation from parent app
  const handleConfirmAlert = async (
    title: string,
    message: string,
    cancelButtonText: string,
    confirmButtonText: string
  ) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: cancelButtonText,
          style: "cancel",
          onPress: () => sendResponseToWeb("resolveConfirmAlert", "cancel"),
        },
        {
          text: confirmButtonText,
          onPress: () => sendResponseToWeb("resolveConfirmAlert", "confirm"),
        },
      ],
      { cancelable: false }
    );
  };

  /**
   * Function to save data to secure store
   * @param key - The key to save the data to
   * @param value - The value to save to the secure store
   */
  const handleSaveToSecureStore = async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(
        scopeMicroAppStorageKey(appId, key),
        value
      );
      sendResponseToWeb("resolveSecureStorePersistence");
    } catch (error) {
      const errMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error saving to secure store:", errMessage);
      sendResponseToWeb("rejectSecureStorePersistence", errMessage);
    }
  };

  /**
   * Function to get data from secure store
   * @param key - The key to get the data from
   */
  const handleGetFromSecureStore = async (key: string) => {
    try {
      const value = await SecureStore.getItemAsync(
        scopeMicroAppStorageKey(appId, key)
      );
      sendResponseToWeb("resolveSecureStoreRetrieval", { value });
    } catch (error) {
      const errMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error getting from secure store:", errMessage);
      sendResponseToWeb("rejectSecureStoreRetrieval", errMessage);
    }
  };

  /**
   * Function to delete data from secure store
   * @param key - The key to delete the data from
   */
  const handleDeleteFromSecureStore = async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(scopeMicroAppStorageKey(appId, key));
      sendResponseToWeb("resolveSecureStoreDeletion");
    } catch (error) {
      const errMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error deleting from secure store:", errMessage);
      sendResponseToWeb("rejectSecureStoreDeletion", errMessage);
    }
  };

  // Function to save data in device
  const handleSaveLocalData = async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(scopeMicroAppStorageKey(appId, key), value);
      sendResponseToWeb("resolveSaveLocalData");
    } catch (error) {
      const errMessage =
        error instanceof Error ? error.message : "Unknown error";
      sendResponseToWeb("rejectSaveLocalData", errMessage);
    }
  };

  //Function to delete data in device
  const handleDeleteLocalData = async (key: string) => {
    try {
      await AsyncStorage.removeItem(scopeMicroAppStorageKey(appId, key));
      sendResponseToWeb("resolveDeleteLocalData");
    } catch (error) {
      const errMessage =
        error instanceof Error ? error.message : "Unknown error";
      sendResponseToWeb("rejectDeleteLocalData", errMessage);
    }
  };

  // Function to get data from device
  const handleGetLocalData = async (key: string) => {
    try {
      const value = await AsyncStorage.getItem(
        scopeMicroAppStorageKey(appId, key)
      );
      sendResponseToWeb("resolveGetLocalData", { value });
    } catch (error) {
      const errMessage =
        error instanceof Error ? error.message : "Unknown error";
      sendResponseToWeb("rejectGetLocalData", errMessage);
    }
  };

  // Function to migrate TOTP data
  const handleTotpQrMigrationData = () => {
    const mockData = "sample-data-1,sample-data-2";
    sendResponseToWeb("resolveTotpQrMigrationData", { data: mockData });
  };

  // Fucntion to authenticate using google
  const authenticateWithGoogle = async () => {
    promptAsync();
  };

  // Function to upload data to the Google Drive
  const handleUploadToGoogleDrive = async (data: any = {}) => {
    uploadToGoogleDrive(data)
      .then((res) => {
        if (res.id) {
          sendResponseToWeb("resolveUploadToGoogleDrive", res);
        } else {
          sendResponseToWeb("rejectUploadToGoogleDrive", res.error);
        }
      })
      .catch((err) => {
        sendResponseToWeb("rejectUploadToGoogleDrive", err.message);
      });
  };

  // Function to check Google authentication state
  const handleCheckGoogleAuthState = async () => {
    isAuthenticatedWithGoogle()
      .then((res) => {
        if (res) {
          sendResponseToWeb("resolveGoogleAuthState", res);
        } else {
          sendResponseToWeb("rejectGoogleAuthState", "Not authenticated");
        }
      })
      .catch((err) => {
        sendResponseToWeb("rejectGoogleAuthState", err.message);
      });
  };

  // Function to restore the latest backup from Google Drive
  const restoreLatestFromGoogleDrive = async () => {
    restoreGoogleDriveBackup()
      .then((res) => {
        if (res) {
          sendResponseToWeb("resolveRestoreGoogleDriveBackup", res.data);
        } else {
          sendResponseToWeb("rejectRestoreGoogleDriveBackup", res.error);
        }
      })
      .catch((err) => {
        sendResponseToWeb("rejectRestoreGoogleDriveBackup", err.message);
      });
  };

  // Function to get Google user info
  const handleGetGoogleUserInfo = async () => {
    try {
      getGoogleUserInfo()
        .then((res) => {
          if (res) {
            sendResponseToWeb("resolveGoogleUserInfo", res);
          } else {
            sendResponseToWeb("rejectGoogleUserInfo", "No user info found");
          }
        })
        .catch((err) => {
          sendResponseToWeb("rejectGoogleUserInfo", err.message);
        });
    } catch (error) {
      console.error("Error getting Google user info:", error);
      sendResponseToWeb("rejectGoogleUserInfo", "Failed to get user info");
    }
  };

  // Function to open a URL using the browser
  const handleOpenUrlInBrowser = async (config: BrowserConfig) => {
    try {
      if (!config) {
        console.error("Missing Required WebBrowser configuration.");
        sendResponseToWeb("rejectOpenUrl", "Browser configuration is missing.");
        return;
      }

      const webPresentationStyle = mapToWebBrowserPresentationStyle(
        config.presentationStyle
      );

      const result = await WebBrowser.openBrowserAsync(config.url, {
        presentationStyle: webPresentationStyle,
        enableBarCollapsing: config.enableBarCollapsing ?? false,
        dismissButtonStyle:
          config.dismissButtonStyle ?? DismissButtonStyle.Close,
        showTitle: config.showTitle ?? true,
        showInRecents: config.showInRecents ?? false,
        readerMode: config.readerMode ?? false,
      });

      if (result.type === "opened" || result.type === "cancel") {
        sendResponseToWeb("resolveOpenUrl");
      } else {
        sendResponseToWeb("rejectOpenUrl", "Failed to open URL");
      }
    } catch (error) {
      const errMessage =
        error instanceof Error ? error.message : "Failed to open URL";
      sendResponseToWeb("rejectOpenUrl", errMessage);
    }
  };

  // Function to schedule a local notification
  const handleScheduleLocalNotification = async (
    data: ScheduledNotificationData
  ) => {
    try {
      await scheduleSessionNotifications(data);
      sendResponseToWeb("resolveSchedulingLocalNotification");
    } catch (error) {
      console.error("Error scheduling local notification:", error);
      sendResponseToWeb(
        "rejectSchedulingLocalNotification",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  // Function to cancel a local notification
  const handleCancelLocalNotification = async (
    data: ScheduledNotificationIdentifiable
  ) => {
    try {
      cancelLocalNotification(data);
      sendResponseToWeb("resolveCancellingLocalNotification");
    } catch (error) {
      console.error("Error canceling local notification:", error);
      sendResponseToWeb(
        "rejectCancellingLocalNotification",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  // Function to clear all local notifications
  const handleClearAllLocalNotifications = async () => {
    try {
      clearNotifications();
      sendResponseToWeb("resolveClearingAllLocalNotifications");
    } catch (error) {
      console.error("Error clearing all local notifications:", error);
      sendResponseToWeb(
        "rejectClearingAllLocalNotifications",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  // Function to get device screen size
  const handleDeviceScreenSize = async () => {
    const screenSize = { width: width, height: height };
    sendResponseToWeb("resolveDeviceScreenSize", screenSize);
  };

  // The micro app only asks for the screen size once; tell it again whenever
  // the window resizes (fold/unfold, rotation, split view). Skip the first
  // render, which is what a request would already have reported.
  const lastScreenSize = useRef({ width, height });
  useEffect(() => {
    const last = lastScreenSize.current;
    if (last.width === width && last.height === height) return;
    lastScreenSize.current = { width, height };
    sendResponseToWeb("resolveDeviceScreenSize", { width, height });
    // sendResponseToWeb only reads the webview ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  // Function to get micro app version
  const handleMicroAppVersion = async () => {
    sendResponseToWeb("resolveMicroAppVersion", version || "unknown");
  };
  // Function to compose an email
  const handleComposeEmail = async (
    config?: MailComposer.MailComposerOptions
  ) => {
    try {
      if (!config) {
        sendResponseToWeb(
          "rejectComposeEmail",
          "Mail configuration is missing."
        );
        return;
      }

      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        throw new Error("Mail services are not available on this device");
      }

      if (config.attachments?.length) {
        for (const attachment of config.attachments) {
          const attachmentFile = new File(attachment);
          if (!attachmentFile.exists) {
            throw new Error(`Attachment not found: ${attachment}`);
          }
        }
      }

      const result = await MailComposer.composeAsync(config);
      sendResponseToWeb("resolveComposeEmail", result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to compose email";
      sendResponseToWeb("rejectComposeEmail", message);
    }
  };

  // Function to open another micro app
  const handleOpenMicroApp = async (targetAppId: string, data: any) => {
    const opened = openMicroApp({
      router,
      apps,
      appId: targetAppId,
      launchData: JSON.stringify(data),
      dismissAll: true,
    });

    if (!opened) {
      Alert.alert(
        "App not installed",
        "Would you like to install it?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Install",
            onPress: () => {
              router.back();
              router.navigate(ScreenPaths.STORE);
            },
          },
        ],
        { cancelable: false }
      );
    }
  };

  // Function to get launch data passed to the micro app
  const handleGetLaunchData = async () => {
    if (!launchData) {
      sendResponseToWeb("resolveGetLaunchData", null);
      return;
    }

    try {
      sendResponseToWeb("resolveGetLaunchData", JSON.parse(launchData));
    } catch {
      sendResponseToWeb("resolveGetLaunchData", launchData);
    }
  };

  const handleGetIdToken = async () => {
    if (idToken) {
      sendResponseToWeb("resolveIdToken", idToken);
    } else {
      sendResponseToWeb("rejectIdToken", "No exchanged ID token available");
    }
  };

  // Function to pick a document from device storage
  const handlePickDocument = async (
    config?: DocumentPicker.DocumentPickerOptions,
  ) => {
    try {
      if (!config) {
        console.error("Missing Required DocumentPicker configuration.");
        sendResponseToWeb(
          "rejectPickDocument",
          "Document picker configuration is missing.",
        );
        return;
      }

      const result = await DocumentPicker.getDocumentAsync(config);
      if (result.canceled) {
        sendResponseToWeb(
          "rejectPickDocument",
          "Document pick canceled by user.",
        );
        return;
      }
      sendResponseToWeb("resolvePickDocument", result);
    } catch (error) {
      const errMessage =
        error instanceof Error ? error.message : "Failed to pick document";
      console.error("Error picking document:", errMessage);
      sendResponseToWeb("rejectPickDocument", errMessage);
    }
  };

  // Handle messages from WebView
  const onMessage = async (event: WebViewMessageEvent) => {
    try {
      if (!isWithinMicroAppBoundary(event.nativeEvent.url, microAppBoundary)) {
        console.warn(
          "Ignored a bridge message from outside the micro app:",
          event.nativeEvent.url
        );
        return;
      }
      const { topic, data } = JSON.parse(event.nativeEvent.data);
      if (!topic) throw new Error("Invalid message format: Missing topic");
      switch (topic) {
        case TOPIC.TOKEN:
          if (token && !isTokenExpired(token)) {
            sendTokenToWebView(token);
          } else {
            refreshTokenIfExpired().then((result) => {
              if (result?.accessToken) {
                sendTokenToWebView(result.accessToken);
              } else {
                rejectTokenRequest("rejectToken", result);
              }
            });
          }
          break;
        case TOPIC.ID_TOKEN:
          if (idToken && !isTokenExpired(idToken)) {
            sendIdTokenToWebView(idToken);
          } else {
            refreshTokenIfExpired().then((result) => {
              if (result?.idToken) {
                sendIdTokenToWebView(result.idToken);
              } else {
                rejectTokenRequest("rejectIdToken", result);
              }
            });
          }
          break;
        case TOPIC.QR_REQUEST:
          openQrScanner();
          break;
        case TOPIC.SAVE_LOCAL_DATA:
          await handleSaveLocalData(data.key, data.value);
          break;
        case TOPIC.DELETE_LOCAL_DATA:
          await handleDeleteLocalData(data.key);
          break;
        case TOPIC.GET_LOCAL_DATA:
          await handleGetLocalData(data.key);
          break;
        case TOPIC.TOTP:
          handleTotpQrMigrationData();
          break;
        case TOPIC.ALERT:
          handleAlert(data.title, data.message, data.buttonText);
          break;
        case TOPIC.CONFIRM_ALERT:
          handleConfirmAlert(
            data.title,
            data.message,
            data.cancelButtonText,
            data.confirmButtonText
          );
          break;
        case TOPIC.GOOGLE_LOGIN:
          authenticateWithGoogle();
          break;
        case TOPIC.UPLOAD_TO_GOOGLE_DRIVE:
          handleUploadToGoogleDrive(data);
          break;
        case TOPIC.RESTORE_GOOGLE_DRIVE_BACKUP:
          restoreLatestFromGoogleDrive();
          break;
        case TOPIC.CHECK_GOOGLE_AUTH_STATE:
          handleCheckGoogleAuthState();
          break;
        case TOPIC.GOOGLE_USER_INFO:
          handleGetGoogleUserInfo();
          break;
        case TOPIC.OPEN_URL:
          await handleOpenUrlInBrowser(data.config);
          break;
        case TOPIC.CLOSE_WEBVIEW_FROM_MICROAPP:
          router.back();
          break;
        case TOPIC.NATIVE_LOG:
          handleNativeLog(data);
          break;
        case TOPIC.DEVICE_SAFE_AREA_INSETS:
          sendSafeAreaInsetsToWebView();
          break;
        case TOPIC.SAVE_TO_SECURE_STORE:
          await handleSaveToSecureStore(data.key, data.value);
          break;
        case TOPIC.GET_FROM_SECURE_STORE:
          await handleGetFromSecureStore(data.key);
          break;
        case TOPIC.DELETE_FROM_SECURE_STORE:
          await handleDeleteFromSecureStore(data.key);
          break;
        case TOPIC.SCHEDULE_LOCAL_NOTIFICATION:
          await handleScheduleLocalNotification(data);
          break;
        case TOPIC.CANCEL_LOCAL_NOTIFICATION:
          await handleCancelLocalNotification(data);
          break;
        case TOPIC.CLEAR_ALL_LOCAL_NOTIFICATIONS:
          await handleClearAllLocalNotifications();
          break;
        case TOPIC.DEVICE_SCREEN_SIZE:
          handleDeviceScreenSize();
          break;
        case TOPIC.MICRO_APP_VERSION:
          handleMicroAppVersion();
          break;
        case TOPIC.PICK_DOCUMENT:
          await handlePickDocument(data?.config);
          break;
        case TOPIC.COMPOSE_EMAIL:
          await handleComposeEmail(data?.config);
          break;
        case TOPIC.OPEN_MICRO_APP:
          await handleOpenMicroApp(data.appId, data.data);
          break;
        case TOPIC.GET_LAUNCH_DATA:
          await handleGetLaunchData();
          break;
        default:
          console.error("Unknown topic:", topic);
      }
    } catch (error) {
      console.error("Error handling WebView message:", error);
    }
  };

  /**
   * Display microapp logs in the console
   * @param data - The data to display
   */
  const handleNativeLog = (data: any) => {
    if (!__DEV__) return;
    const level = data.level as NativeLogLevel;
    const message = data.message;
    const injectedData = data.data;

    switch (level) {
      case "info":
        console.info(
          `[Micro App] ${message}.`,
          injectedData !== undefined ? injectedData : ""
        );
        break;
      case "warn":
        console.warn(
          `[Micro App] ${message}.`,
          injectedData !== undefined ? injectedData : ""
        );
        break;
      case "error":
        console.error(
          `[Micro App] ${message}.`,
          injectedData !== undefined ? injectedData : ""
        );
        break;
    }
  };

  // Keeps the injected bridge inside the micro app's own bundle by handing any
  // other document to the browser instead of loading it in the WebView
  const handleShouldStartLoadWithRequest = (request: ShouldStartLoadRequest) => {
    if (
      isBootstrapUri(request.url) ||
      isWithinMicroAppBoundary(request.url, microAppBoundary)
    ) {
      return true;
    }

    console.warn("Blocked a navigation outside the micro app:", request.url);
    if (request.isTopFrame !== false && /^https?:\/\//i.test(request.url)) {
      WebBrowser.openBrowserAsync(request.url).catch((error) => {
        console.error("Error opening a URL outside the micro app:", error);
      });
    }
    return false;
  };

  const handleError = (syntheticEvent: any) => {
    setHasError(true);
    console.error("WebView error:", syntheticEvent.nativeEvent);
  };

  const reloadWebView = () => {
    setHasError(false);
    webviewRef.current?.reload();
  };

  const renderWebView = (webViewUri: string) => {
    // Check if web view uri is available
    if (!webViewUri) {
      Alert.alert("Error", "React app not found. Please unzip the file first.");
      return <NotFound />;
    }

    return (
      <View style={{ flex: 1 }}>
        {hasError ? (
          isDeveloper ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Failed to load the app</Text>
              <Text style={styles.errorMessage}>
                Please check if your development server is running on{" "}
                <Text style={styles.bold}>{webViewUri}</Text>, or click the
                header <Text style={styles.bold}>App URL</Text> section to enter
                a valid development server URL.
              </Text>
              <TouchableOpacity
                onPress={reloadWebView}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Something went wrong</Text>
              <Text style={styles.errorMessage}>
                We encountered an issue while loading the app. Please try again
                later.
              </Text>
            </View>
          )
        ) : (
          <WebView<object>
            ref={webviewRef}
            originWhitelist={["*"]}
            source={{ uri: microAppUri }}
            allowFileAccess
            allowUniversalAccessFromFileURLs
            allowingReadAccessToURL={
              isDeveloper
                ? undefined
                : microAppUri.slice(0, microAppUri.lastIndexOf("/") + 1)
            }
            style={{ flex: 1 }}
            onMessage={onMessage}
            onError={handleError}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            domStorageEnabled
            webviewDebuggingEnabled={isDeveloper}
            injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
          />
        )}
      </View>
    );
  };

  return (
    <>
      {!shouldShowHeader && (
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      )}
      <Stack.Screen
        options={{
          title: shouldShowHeader ? appName : "",
          headerShown: shouldShowHeader,
          // Only set when there is a button: iOS 26+ draws any headerRight as a glass
          // button, an empty one when it renders nothing.
          headerRight:
            isDeveloper && shouldShowHeader
              ? () => (
                  <TouchableOpacity
                    onPressIn={() => setAppUrlDialogVisible(true)}
                    hitSlop={20}
                  >
                    <Text style={styles.headerText}>App URL</Text>
                  </TouchableOpacity>
                )
              : undefined,
        }}
      />
      <View style={styles.container}>
        <View style={styles.webViewContainer}>
          {renderWebView(isDeveloper ? webUri : webViewUri)}
        </View>
        {showTokenError && (
          <Animated.View
            style={[
              styles.tokenError,
              {
                bottom: insets.bottom + 16,
                transform: [{ translateY: tokenErrorLift }],
              },
            ]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.tokenErrorText}>
              Couldn&apos;t sign in to {appName}. Try again in a moment.
            </Text>
            <TouchableOpacity
              onPress={retryToken}
              disabled={isRetryingToken}
              style={styles.retryButton}
              accessibilityRole="button"
              accessibilityLabel="Try again"
              accessibilityState={{ busy: isRetryingToken }}
            >
              {isRetryingToken ? (
                <ActivityIndicator
                  size="small"
                  color={themes[colorScheme ?? "light"].primaryText}
                />
              ) : (
                <Text style={styles.retryText}>Try again</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}
        <OfflineToast
          bottom={0}
          bottomInset={insets.bottom}
          autoHideMs={OFFLINE_TOAST_AUTO_HIDE_MS}
          onHeight={setOfflineToastHeight}
          onVisibleChange={setOfflineToastVisible}
        />
      </View>
      <TextPromptDialog
        visible={appUrlDialogVisible}
        title="App URL"
        message="Enter App URL"
        defaultValue={webUri}
        onConfirm={setWebUri}
        onClose={() => setAppUrlDialogVisible(false)}
      />
    </>
  );
};

export default MicroApp;

const createStyles = (colorScheme: "light" | "dark", bottomSafeArea: number) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    webViewContainer: {
      flex: 1,
      opacity: 1,
      pointerEvents: "auto",
      paddingBottom: isAndroid ? bottomSafeArea : 0,
    },
    headerText: {
      fontFamily: soraFamily[500],
      fontSize: 16,
      color: themes[colorScheme].accent,
    },
    errorContainer: {
      flex: 1,
      padding: 24,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
    },
    errorTitle: {
      fontFamily: soraFamily[600],
      fontSize: 18,
      marginBottom: 15,
      color: themes[colorScheme].text,
    },
    errorMessage: {
      fontFamily: soraFamily[400],
      fontSize: 14,
      color: Colors[colorScheme].primaryTextColor,
      textAlign: "center",
      marginBottom: 25,
      paddingHorizontal: 20,
    },
    bold: {
      fontFamily: soraFamily[600],
    },
    tokenError: {
      position: "absolute",
      left: 16,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: Colors[colorScheme].borderColor,
      backgroundColor: Colors[colorScheme].secondaryBackgroundColor,
    },
    tokenErrorText: {
      flex: 1,
      fontFamily: soraFamily[400],
      fontSize: 14,
      color: Colors[colorScheme].text,
    },
    retryButton: {
      paddingVertical: 10,
      paddingHorizontal: 25,
      backgroundColor: themes[colorScheme].primaryFill,
      borderRadius: 12,
    },
    retryText: {
      fontFamily: soraFamily[600],
      fontSize: 16,
      lineHeight: 20,
      color: themes[colorScheme].primaryText,
    },
  });
