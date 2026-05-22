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
import { Modal, Platform, useColorScheme, View } from "react-native";
import LottieView from "lottie-react-native";
import { Colors } from "@/constants/Colors";
import { StatusBar } from "expo-status-bar";

const SplashModal = ({
  loading,
  animationType,
}: {
  loading: boolean;
  animationType?: "fade" | "none" | "slide" | undefined;
}) => {
  const colorScheme = useColorScheme();

  return (
    <Modal
      visible={loading}
      transparent={false}
      animationType={animationType}
      presentationStyle="fullScreen"
      statusBarTranslucent={Platform.OS === "android"}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor:
            Colors[colorScheme ?? "light"].primaryBackgroundColor,
        }}
      >
        {/* Hide status bar while splash is visible to avoid top bar flicker */}
        <StatusBar hidden />
        <LottieView
          source={
            colorScheme === "dark"
              ? require("../assets/animation/animation-dark.json")
              : require("../assets/animation/animation-light.json")
          }
          autoPlay
          loop
          resizeMode="contain"
          style={{ width: "50%", height: 500 }}
        />
      </View>
    </Modal>
  );
};

export default SplashModal;
