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
import Scanner from "@/components/Scanner";
import { Colors } from "@/constants/Colors";
import {
  FULL_SCREEN_VIEWING_MODE,
  isIos,
} from "@/constants/Constants";
import { MicroAppParams } from "@/types/navigation";
import { injectedJavaScript } from "@/utils/bridge";
import { documentDirectory } from "expo-file-system";
import { Stack, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import prompt from "react-native-prompt-android";
import { WebView } from "react-native-webview";
import { useMicroApp } from "@/hooks/useMicroApp";

WebBrowser.maybeCompleteAuthSession();

const MicroApp = () => {
  const params = useLocalSearchParams<MicroAppParams>();
  const { webViewUri, appName, displayMode } = params;
  
  const colorScheme = useColorScheme();
  const styles = createStyles(colorScheme ?? "light");
  const shouldShowHeader: boolean = displayMode !== FULL_SCREEN_VIEWING_MODE;

  const {
    isScannerVisible,
    hasError,
    webUri,
    isDeveloper,
    isTotp,
    insets,
    webviewRef,
    onMessage,
    handleError,
    handleLoadStart,
    handleLoadEnd,
    reloadWebView,
    handleQRScan,
    handleChangeWebUri,
  } = useMicroApp(params);

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
          <View style={{ flex: 1, paddingBottom: insets.bottom }}>
            <WebView
              ref={webviewRef}
              originWhitelist={["*"]}
              source={{
                uri: isDeveloper
                  ? webViewUri
                  : `${documentDirectory}${webViewUri}`,
              }}
              allowFileAccess
              allowUniversalAccessFromFileURLs
              allowingReadAccessToURL="file:///"
              style={{ flex: 1 }}
              onMessage={onMessage}
              onError={handleError}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onShouldStartLoadWithRequest={() => true}
              domStorageEnabled
              webviewDebuggingEnabled={isDeveloper}
              injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
            />
          </View>
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
            isDeveloper && shouldShowHeader ? (
              <TouchableOpacity
                onPressIn={() => {
                  if (isIos) {
                    Alert.prompt(
                      "App URL",
                      "Enter App URL",
                      [
                        {
                          text: "Cancel",
                          style: "cancel",
                        },
                        {
                          text: "OK",
                          onPress: (value) => {
                            handleChangeWebUri(value);
                          },
                        },
                      ],
                      "plain-text",
                      webUri
                    );
                  } else {
                    prompt(
                      "App URL",
                      "Enter App URL",
                      [
                        {
                          text: "Cancel",
                          onPress: () => console.log("Cancel Pressed"),
                          style: "cancel",
                        },
                        {
                          text: "OK",
                          onPress: (value) => {
                            handleChangeWebUri(value);
                          },
                          style: "default",
                        },
                      ],
                      {
                        type: "plain-text",
                        cancelable: false,
                        defaultValue: webUri,
                      }
                    );
                  }
                }}
                hitSlop={20}
              >
                <Text style={styles.headerText}>App URL</Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <View style={styles.container}>
        {isScannerVisible && (
          <View style={styles.scannerOverlay}>
            <Scanner
              onScan={handleQRScan}
              message={
                isTotp
                  ? "We need access to your camera to scan QR codes for generating one-time passwords (TOTP) for secure authentication. This will allow you to easily log in to your accounts."
                  : undefined
              }
            />
          </View>
        )}

        {!shouldShowHeader ? (
          <View
            style={[
              styles.webViewContainer,
              isScannerVisible && styles.webViewHidden,
              { paddingTop: insets.top },
            ]}
          >
            {renderWebView(isDeveloper ? webUri : webViewUri)}
          </View>
        ) : (
          <View
            style={[
              styles.webViewContainer,
              isScannerVisible && styles.webViewHidden,
            ]}
          >
            {renderWebView(isDeveloper ? webUri : webViewUri)}
          </View>
        )}
      </View>
    </>
  );
};

export default MicroApp;

const createStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scannerOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    webViewContainer: {
      flex: 1,
      opacity: 1,
      pointerEvents: "auto",
    },
    webViewHidden: {
      opacity: 0,
      pointerEvents: "none",
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
