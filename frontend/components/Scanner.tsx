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
import BrandIcon from "@/components/brand/BrandIcon";
import { soraFamily } from "@/constants/brand";
import { Colors } from "@/constants/Colors";
import { isAndroid } from "@/constants/Constants";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  AppState,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import CameraPermission from "./CameraPermission";

type ScannerProps = {
  onScan: (qrCode: string) => void;
  message?: string;
  style?: StyleProp<ViewStyle>;
};

const Scanner = ({ onScan, message, style }: ScannerProps) => {
  const qrLock = useRef(false);
  const appState = useRef(AppState.currentState);
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const { width, height } = useWindowDimensions();
  // 320 on a portrait phone; shrinks (keeping a 35pt margin each side) only
  // on short landscape / split windows.
  const viewfinderSize = Math.min(320, Math.min(width, height) - 2 * 35);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current?.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        qrLock.current = false;
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <CameraPermission handlePress={requestPermission} message={message} />
    );
  }

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {isAndroid ? <StatusBar hidden /> : null}
      <CameraView
        style={[StyleSheet.absoluteFill, style]}
        facing={facing}
        onBarcodeScanned={({ data }) => {
          if (data && !qrLock.current) {
            qrLock.current = true;
            onScan(data); // Send scan result back to MicroApp
          }
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            backgroundColor: "transparent",
            margin: 64,
          }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              alignSelf: "flex-end",
              gap: 8,
              minHeight: 44,
            }}
            onPress={toggleCameraFacing}
          >
            <BrandIcon name="flip" size={22} color="white" />
            <Text
              style={{
                fontFamily: soraFamily[600],
                fontSize: 17,
                lineHeight: 24,
                color: "white",
              }}
            >
              Flip Camera
            </Text>
          </TouchableOpacity>
        </View>
      </CameraView>

      <View style={{ width: viewfinderSize, height: viewfinderSize }}>
        <View
          style={{
            width: 64,
            height: 64,
            position: "absolute",
            borderWidth: 4,
            borderColor: Colors.light.primaryBackgroundColor,
            borderRightWidth: 0,
            borderRadius: 6,
            borderBottomWidth: 0,
            top: 0,
            left: 0,
          }}
        />
        <View
          style={{
            width: 64,
            height: 64,
            position: "absolute",
            borderWidth: 4,
            borderColor: Colors.light.primaryBackgroundColor,
            borderLeftWidth: 0,
            borderRadius: 6,
            borderBottomWidth: 0,
            top: 0,
            right: 0,
          }}
        />
        <View
          style={{
            width: 64,
            height: 64,
            position: "absolute",
            borderWidth: 4,
            borderColor: Colors.light.primaryBackgroundColor,
            borderRightWidth: 0,
            borderRadius: 6,
            borderTopWidth: 0,
            bottom: 0,
            left: 0,
          }}
        />
        <View
          style={{
            width: 64,
            height: 64,
            position: "absolute",
            borderWidth: 4,
            borderColor: Colors.light.primaryBackgroundColor,
            borderLeftWidth: 0,
            borderRadius: 6,
            borderTopWidth: 0,
            bottom: 0,
            right: 0,
          }}
        />
      </View>
    </View>
  );
};

export default Scanner;
