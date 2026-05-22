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
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useSelector } from "react-redux";
import { RootState } from "@/context/store";

const UpdateScreen = () => {
  const colorScheme = useColorScheme();
  const { versions } = useSelector((state: RootState) => state.version);

  const handleUpdatePress = () => {
    // Open Play Store or App Store link
    Linking.openURL(versions[0].downloadUrl);
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={{
        flex: 1,
        backgroundColor: Colors[colorScheme ?? "light"].primaryBackgroundColor,
      }}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          marginHorizontal: 40,
        }}
      >
        {/* Update Icon */}
        <Ionicons
          style={{ margin: 20 }}
          name="rocket-sharp"
          size={70}
          color={Colors.companyOrange}
        />

        {/* Title */}
        <Text
          style={{
            fontSize: 24,
            lineHeight: 32,
            fontWeight: 700,
            textAlign: "center",
            color: colorScheme === "dark" ? "#e5e7eb" : "#1f2937",
          }}
          allowFontScaling={false}
        >
          Update Required
        </Text>

        {/* Description */}
        <Text
          style={{
            textAlign: "center",
            color: colorScheme === "dark" ? "#9ca3af" : "#4b5563",
            marginTop: 16,
          }}
          allowFontScaling={false}
        >
          A new version of the app is available. Please update to continue using
          all features.
        </Text>

        {/* Update Button */}
        <TouchableOpacity
          style={{
            backgroundColor: "#2564eb",
            width: "100%",
            paddingVertical: 13,
            paddingHorizontal: 20,
            borderRadius: 16,
            marginTop: 30,
          }}
          onPress={handleUpdatePress}
        >
          <Text
            style={{
              color: colorScheme === "dark" ? "#d1d5db" : "#f9fafb",
              textAlign: "center",
              fontWeight: 600,
              fontSize: 15,
            }}
            allowFontScaling={false}
          >
            Update Now
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default UpdateScreen;
