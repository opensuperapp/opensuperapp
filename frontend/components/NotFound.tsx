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
import { soraFamily, textStyle, type } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { Link } from "expo-router";
import { SafeAreaView, Text } from "react-native";

const NotFound = () => {
  const { colors } = useBrandTheme();

  return (
    <>
      <SafeAreaView
        style={{
          backgroundColor: colors.bg,
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Text
          style={{
            ...textStyle(type.articleTitle),
            color: colors.text,
            textAlign: "center",
          }}
        >
          This screen doesn't exist.
        </Text>
        <Link
          href="/"
          style={{ marginTop: 16, paddingTop: 16, paddingBottom: 16 }}
        >
          <Text
            style={{
              fontFamily: soraFamily[500],
              fontSize: 16,
              color: colors.accent,
            }}
          >
            Go to home screen →
          </Text>
        </Link>
      </SafeAreaView>
    </>
  );
};

export default NotFound;
