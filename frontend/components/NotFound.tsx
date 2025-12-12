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
import { Text, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Colors } from "@/constants/Colors";

const NotFound = () => {
  const colorScheme = useColorScheme();

  return (
    <>
      <SafeAreaView
        edges={['top', 'bottom', 'left', 'right']}
        style={{
          backgroundColor:
            Colors[colorScheme ?? "light"].primaryBackgroundColor,
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Text
          style={{
            color: Colors[colorScheme ?? "light"].text,
            fontSize: 30,
            lineHeight: 36,
            fontWeight: 700,
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
              fontSize: 20,
              lineHeight: 28,
              color: Colors[colorScheme ?? "light"].text,
            }}
          >
            Go to home screen!
          </Text>
        </Link>
      </SafeAreaView>
    </>
  );
};

export default NotFound;
