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
import PrimaryButton from "@/components/brand/PrimaryButton";
import { soraFamily, textStyle, type } from "@/constants/brand";
import { RootState } from "@/context/store";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { Linking, SafeAreaView, Text, View } from "react-native";
import { useSelector } from "react-redux";

const UpdateScreen = () => {
  const { colors } = useBrandTheme();
  const { versions } = useSelector((state: RootState) => state.version);

  const handleUpdatePress = () => {
    // Open Play Store or App Store link
    if (versions.length === 0) {
      console.warn("No version data available");
      return;
    }
    Linking.openURL(versions[0].downloadUrl);
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.bg,
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
        <View style={{ margin: 20 }}>
          <BrandIcon
            name="download"
            size={64}
            color={colors.accent}
            strokeWidth={1.4}
          />
        </View>

        {/* Title */}
        <Text
          style={{
            ...textStyle(type.articleTitle),
            textAlign: "center",
            color: colors.text,
          }}
          allowFontScaling={false}
        >
          Update Required
        </Text>

        {/* Description */}
        <Text
          style={{
            fontFamily: soraFamily[400],
            fontSize: 15,
            lineHeight: 23,
            textAlign: "center",
            color: colors.text2,
            marginTop: 16,
          }}
          allowFontScaling={false}
        >
          A new version of the app is available. Please update to continue using
          all features.
        </Text>

        {/* Update Button */}
        <PrimaryButton
          title="Update Now"
          onPress={handleUpdatePress}
          style={{ width: "100%", marginTop: 30 }}
        />
      </View>
    </SafeAreaView>
  );
};

export default UpdateScreen;
