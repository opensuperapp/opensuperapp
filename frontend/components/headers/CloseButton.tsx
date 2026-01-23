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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, useColorScheme } from "react-native";

type CloseButtonProps = {
  onPress?: () => void;
};

const CloseButton = ({ onPress }: CloseButtonProps) => {
  const colorScheme = useColorScheme() ?? "light";

  return (
    <Pressable
      onPress={() => {
        onPress ? onPress() : router.back();
      }}
    >
      <Ionicons name="close" size={24} color={Colors[colorScheme].text} />
    </Pressable>
  );
};

export default CloseButton;
