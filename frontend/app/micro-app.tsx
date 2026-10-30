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
import { Colors } from "@/constants/Colors";
import {
  DEVELOPER_APP_ANDROID_DEFAULT_URL,
  DEVELOPER_APP_IOS_DEFAULT_URL,
  DOWNLOADED,
  FULL_SCREEN_VIEWING_MODE,
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_SCOPES,
  GOOGLE_WEB_CLIENT_ID,
  isAndroid,
  isIos,
  LOCATION_BUFFER_MAX_FIXES,
  LOCATION_KEEP_AWAKE_TAG,
  LOCATION_PERMISSION,
} from "@/constants/Constants";
import { Event } from "@/constants/enums/Event";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { RootState } from "@/context/store";
import { useLeaveWhenSessionEnds } from "@/hooks/useLeaveWhenSessionEnds";
import {
  isTokenExpired,
  tokenExchange,
  TokenExchangeResult,
} from "@/services/authService";
import {
  ensureLocationPermissions,
  startBackgroundLocationUpdates,
  startForegroundLocationStream,
  stopBackgroundLocationUpdates,
} from "@/services/locationService";
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
  LocationFix,
  LocationRejectReason,
  LocationRequestOptions,
  mapToWebBrowserPresentationStyle,
  ScheduledNotificationData,
  ScheduledNotificationIdentifiable,
} from "@/types/microApp.types";
import { MicroAppParams } from "@/types/navigation";
import { injectedJavaScript, TOPIC } from "@/utils/bridge";
import {
  clearLocationBuffer,
  drainLocationBuffer,
} from "@/utils/locationBuffer";
import { fetchDevServerPermissions } from "@/utils/microAppManifest";
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
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { LocationSubscription } from "expo-location";
import * as MailComposer from "expo-mail-composer";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import { useDispatch, useSelector } from "react-redux";

WebBrowser.maybeCompleteAuthSession();

type NativeLogLevel = "info" | "warn" | "error";

const TOKEN_UNAVAILABLE = "Could not get a token for this app";

// The offline toast is shown on opening, then gets out of the micro app's way.
const OFFLINE_TOAST_AUTO_HIDE_MS = 4000;

// Starting and stopping a stream are asynchronous and can overlap: a stop, an unmount,
// or a second start can land while the first is still awaiting a permission dialog or
// the OS opening the watch. Running them through one chain means each sees the finished
// state of the last, so a watch or a foreground service can never be created after the
// teardown that was meant to cancel it. The chain is module-level, not per screen, because
// the background task and its buffer are process-wide: opening another micro app unmounts
// this screen, and its teardown must finish before the next app starts.
let locationQueue: Promise<unknown> = Promise.resolve();

// The chain orders operations by when they were queued, not by which screen they belong
// to, so a screen's unmount teardown can still run after the next screen has started.
// Recording which screen holds the background task lets a teardown leave it alone once
// another screen has taken it, instead of stopping that screen's background updates and
// discarding its buffered fixes.
let backgroundLocationOwner: number | null = null;
let nextLocationScreenId = 0;

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
  const webviewRef = useRef<WebView>(null);
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
  // Read from the store rather than a route param: this is what the installed
  // microapp.json declared, and route params cannot carry an array reliably.
  const requiredPermissions = useSelector(
    (state: RootState) =>
      state.apps.apps.find((app) => app.appId === appId)?.requiredPermissions
  );
  const locationSub = useRef<LocationSubscription | null>(null);
  // Timestamps already delivered, so a fix that arrives live and is also buffered is
  // not sent twice. Bounded alongside the buffer it guards.
  const deliveredFixTimestamps = useRef<Set<string>>(new Set());
  // Denial is sticky for the lifetime of the screen: re-prompting on every request
  // turns one "no" into a permission dialog loop.
  const locationPermissionDenied = useRef(false);
  // What the Developer app's dev server declares in its microapp.json. Held as a promise
  // so a request sent while the manifest is still loading waits for it instead of being
  // rejected as undeclared.
  const devServerPermissions = useRef<Promise<string[]>>(Promise.resolve([]));
  // Bumped whenever the Developer app's URL changes. A start requested by the previous
  // page, or a fix from the stream it opened, must not reach the page that replaced it.
  const devServerGeneration = useRef(0);
  const [locationScreenId] = useState(() => nextLocationScreenId++);
  // Per screen: a shared tag would let one screen's teardown release another's wake lock.
  const keepAwakeTag = `${LOCATION_KEEP_AWAKE_TAG}:${locationScreenId}`;
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
  const sendResponseToWeb = useCallback((method: string, data?: any) => {
    webviewRef.current?.injectJavaScript(
      `window.nativebridge.${method}(${JSON.stringify(data)});`
    );
  }, []);

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
  }, [response, sendResponseToWeb]);

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
    const targetApp = apps.find((app) => app.appId === targetAppId);

    if (targetApp?.status === DOWNLOADED) {
      router.dismissAll();
      router.push({
        pathname: ScreenPaths.MICRO_APP,
        params: {
          webViewUri: targetApp.webViewUri,
          appName: targetApp.name,
          clientId: targetApp.clientId,
          exchangedToken: targetApp.exchangedToken,
          exchangedIdToken: targetApp.exchangedIdToken,
          appId: targetApp.appId,
          displayMode: targetApp.displayMode,
          launchData: JSON.stringify(data),
        },
      });
    } else {
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

  /**
   * Sends one fix to the micro app, dropping any timestamp already delivered.
   *
   * A fix can reach us twice: once live and once from the background buffer if the
   * app changed state mid-flight. The consumer treats fixes as a track, so a
   * duplicate reads as a stationary sample and skews anything derived from it.
   * @param fix - The fix to deliver
   */
  const deliverLocationFix = useCallback(
    (fix: LocationFix) => {
      // The foreground watch can still emit for a moment after the app leaves the
      // foreground, but injectJavaScript into a suspended WebView is discarded.
      // Marking such a fix delivered would make the dedup below swallow the buffered
      // copy too, losing it outright - so leave it to the background buffer.
      if (!fix.buffered && AppState.currentState !== "active") return;

      if (deliveredFixTimestamps.current.has(fix.ts)) return;

      deliveredFixTimestamps.current.add(fix.ts);
      if (deliveredFixTimestamps.current.size > LOCATION_BUFFER_MAX_FIXES) {
        // A Set iterates in insertion order, so this keeps the most recent half.
        deliveredFixTimestamps.current = new Set(
          Array.from(deliveredFixTimestamps.current).slice(
            -LOCATION_BUFFER_MAX_FIXES / 2
          )
        );
      }

      sendResponseToWeb("resolveLocationUpdate", fix);
    },
    [sendResponseToWeb]
  );

  /**
   * Releases every resource this screen's location stream holds, and the background task
   * and buffer unless another screen holds them. A task nobody holds is left over from an
   * earlier JS run, with no screen to deliver its fixes to, so it is stopped too.
   * Safe to call when no stream is running.
   * @throws When the background task could not be stopped. The foreground watch and the
   * keep-awake are released first, and the owner and buffer are left as they were: a
   * task still recording must not look released to the caller.
   */
  const teardownLocationStream = useCallback(async () => {
    locationSub.current?.remove();
    locationSub.current = null;

    try {
      // deactivateKeepAwake() is async and rejects when the tag was never activated,
      // which is the normal case for a non-fullscreen micro app. Without the await the
      // catch never sees it and every teardown raises an unhandled rejection instead.
      await deactivateKeepAwake(keepAwakeTag);
    } catch {
      // Not activated - nothing to release.
    }

    if (
      backgroundLocationOwner === null ||
      backgroundLocationOwner === locationScreenId
    ) {
      await stopBackgroundLocationUpdates();
      backgroundLocationOwner = null;
      await clearLocationBuffer();
    }
  }, [keepAwakeTag, locationScreenId]);

  /**
   * Handles a teardown nobody is waiting on, which has no page to report to. A task that
   * would not stop has no screen left to deliver its fixes, so it is handed to nobody:
   * no screen drains its buffer, and the next teardown of any screen stops it again.
   * @param error - Why the task could not be stopped
   */
  const releaseUnstoppedTask = useCallback(
    (error: unknown) => {
      console.error("Failed to stop background location updates:", error);
      if (backgroundLocationOwner === locationScreenId) {
        backgroundLocationOwner = null;
      }
    },
    [locationScreenId]
  );

  /**
   * Opens a position stream for the micro app.
   * @param requested - Stream options supplied by the micro app
   * @param generation - The Developer app URL generation the start was requested in
   */
  const startLocationUpdates = useCallback(
    async (
      requested: LocationRequestOptions | null | undefined,
      generation: number
    ) => {
      // requestLocationUpdates() may be called with nothing, or with null.
      const options: LocationRequestOptions = requested ?? {};
      // The Developer app's URL changed while this start waited: the page that asked
      // is gone, so the start is dropped without answering the page that replaced it.
      const isStale = () => generation !== devServerGeneration.current;

      // A host-level OS permission must not become an implicit grant to every micro
      // app: only an app that declared the capability may open a stream. The Developer
      // app has no installed manifest, so its dev server's stands in for it.
      const declaredPermissions = isDeveloper
        ? await devServerPermissions.current
        : requiredPermissions;
      if (isStale()) return;
      if (!declaredPermissions?.includes(LOCATION_PERMISSION)) {
        sendResponseToWeb(
          "rejectLocationUpdates",
          "not_declared" as LocationRejectReason
        );
        return;
      }

      if (locationPermissionDenied.current) {
        sendResponseToWeb(
          "rejectLocationUpdates",
          "permission_denied" as LocationRejectReason
        );
        return;
      }

      const wantsBackground = options.background === true;
      const failure = await ensureLocationPermissions(wantsBackground);
      if (isStale()) return;
      if (failure) {
        if (failure === "permission_denied") {
          locationPermissionDenied.current = true;
        }
        sendResponseToWeb("rejectLocationUpdates", failure);
        return;
      }

      // Starting twice replaces the stream rather than stacking two watches. If the
      // previous one's background task cannot be stopped it is still recording, and a
      // new stream must not start as though it were not.
      try {
        await teardownLocationStream();
      } catch (error) {
        console.error("Failed to release the previous location stream:", error);
        if (isStale()) return;
        sendResponseToWeb(
          "rejectLocationUpdates",
          "unavailable" as LocationRejectReason
        );
        return;
      }
      if (isStale()) return;

      try {
        locationSub.current = await startForegroundLocationStream(
          options,
          // A fix from a stream opened for the previous page is discarded; the stop the
          // URL change queued closes the stream itself.
          (fix) => {
            if (!isStale()) deliverLocationFix(fix);
          }
        );

        if (wantsBackground) {
          // Only one background task exists, and this screen's own was released above.
          // One still running is another screen's or left over from an earlier JS run:
          // take it over, discarding its buffered fixes rather than delivering them here.
          // If it cannot be stopped, the stop throws before the buffer or the owner is
          // touched and this start fails: the task would otherwise keep running with
          // the other stream's options and notification.
          await stopBackgroundLocationUpdates();
          await clearLocationBuffer();
          backgroundLocationOwner = locationScreenId;
          await startBackgroundLocationUpdates(options, appName);
        }

        // A fullscreen app is the whole screen the driver is looking at; letting the
        // display sleep mid-route is indistinguishable from the app having crashed.
        if (!shouldShowHeader) {
          await activateKeepAwakeAsync(keepAwakeTag);
        }
      } catch (error) {
        console.error("Failed to start location updates:", error);
        try {
          await teardownLocationStream();
        } catch (teardownError) {
          // The start is already being rejected; there is nothing more to tell the page.
          console.error("Failed to clean up after the start:", teardownError);
        }
        if (isStale()) return;
        sendResponseToWeb(
          "rejectLocationUpdates",
          "unavailable" as LocationRejectReason
        );
      }
    },
    [
      appName,
      deliverLocationFix,
      isDeveloper,
      keepAwakeTag,
      locationScreenId,
      requiredPermissions,
      sendResponseToWeb,
      shouldShowHeader,
      teardownLocationStream,
    ]
  );

  /**
   * Closes the position stream and forgets the delivered-timestamp history.
   * @throws When the background task could not be stopped
   */
  const stopLocationUpdates = useCallback(async () => {
    try {
      await teardownLocationStream();
    } finally {
      deliveredFixTimestamps.current.clear();
    }
  }, [teardownLocationStream]);

  /**
   * Runs a location stream operation once every operation queued before it has settled.
   * @param task - The operation to run
   * @returns What the operation resolved to
   */
  const enqueueLocationTask = useCallback(
    <T,>(task: () => Promise<T>): Promise<T> => {
      const next = locationQueue.then(task, task);
      // Swallow the failure on the chain only: one rejected operation must not block
      // every operation queued after it, but the caller still sees its own rejection.
      locationQueue = next.catch(() => undefined);
      return next;
    },
    []
  );

  // Flush fixes recorded while the WebView's JS was suspended. Each carries the
  // timestamp it was taken at, so the consumer can order them against live fixes.
  // Only the screen holding the background task drains the buffer: the fixes in it are
  // that screen's stream, and a drain is destructive.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (state) => {
      if (state !== "active" || backgroundLocationOwner !== locationScreenId) {
        return;
      }

      const buffered = await drainLocationBuffer();
      buffered.forEach((fix) => deliverLocationFix({ ...fix, buffered: true }));
    });

    return () => subscription.remove();
  }, [deliverLocationFix, locationScreenId]);

  // A watch that outlives the screen drains the battery invisibly - nothing on screen
  // says it is still running - so tear it down when the micro app is navigated away from.
  useEffect(() => {
    return () => {
      enqueueLocationTask(teardownLocationStream).catch(releaseUnstoppedTask);
    };
  }, [enqueueLocationTask, releaseUnstoppedTask, teardownLocationStream]);

  // A new Developer app URL is a new app: re-read what it declares, drop any start the
  // previous page requested, and close the stream it opened. The teardown releases the
  // background task only if this screen holds it, so another screen's is left running.
  useEffect(() => {
    if (!isDeveloper) return;

    devServerGeneration.current += 1;
    devServerPermissions.current = fetchDevServerPermissions(webUri);
    enqueueLocationTask(stopLocationUpdates).catch(releaseUnstoppedTask);
  }, [
    enqueueLocationTask,
    isDeveloper,
    releaseUnstoppedTask,
    stopLocationUpdates,
    webUri,
  ]);

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
        case TOPIC.LOCATION_START: {
          // Read on receipt, not when the queued start runs: the URL can change between.
          const generation = devServerGeneration.current;
          await enqueueLocationTask(() =>
            startLocationUpdates(data, generation)
          );
          break;
        }
        case TOPIC.LOCATION_STOP:
          try {
            await enqueueLocationTask(stopLocationUpdates);
          } catch (error) {
            // The page asked for tracking to end and it may not have: say so.
            console.error("Failed to stop location updates:", error);
            sendResponseToWeb(
              "rejectLocationUpdates",
              "unavailable" as LocationRejectReason
            );
          }
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
          <WebView
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
          headerRight: () =>
            isDeveloper &&
            shouldShowHeader && (
              <TouchableOpacity
                onPressIn={() => setAppUrlDialogVisible(true)}
                hitSlop={20}
              >
                <Text style={styles.headerText}>App URL</Text>
              </TouchableOpacity>
            ),
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
                  color={Colors[colorScheme ?? "light"].primaryBackgroundColor}
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
      fontWeight: "600",
      color: Colors[colorScheme].primaryTextColor,
    },
    errorContainer: {
      flex: 1,
      padding: 24,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: Colors[colorScheme].primaryBackgroundColor,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 15,
      color: Colors.companyOrange,
    },
    errorMessage: {
      fontSize: 14,
      color: Colors[colorScheme].primaryTextColor,
      textAlign: "center",
      marginBottom: 25,
      paddingHorizontal: 20,
    },
    bold: {
      fontWeight: "bold",
    },
    tokenError: {
      position: "absolute",
      left: 16,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: Colors[colorScheme].borderColor,
      backgroundColor: Colors[colorScheme].secondaryBackgroundColor,
    },
    tokenErrorText: {
      flex: 1,
      fontSize: 14,
      color: Colors[colorScheme].text,
    },
    retryButton: {
      paddingVertical: 10,
      paddingHorizontal: 25,
      backgroundColor: Colors.companyOrange,
      borderRadius: 8,
    },
    retryText: {
      fontSize: 16,
      lineHeight: 20,
      color: Colors[colorScheme].primaryBackgroundColor,
      fontWeight: "600",
    },
  });
