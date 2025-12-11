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
import { ExpoConfig } from "expo/config";
import fs from "fs";
import path from "path";

// The Firebase plugins to add to the Expo config.
const FIREBASE_PLUGINS = [
  "@react-native-firebase/app",
  "@react-native-firebase/messaging",
];

/**
 * Configures the Expo config to use Firebase for iOS and Android.
 * @param config - The Expo config to configure.
 * @returns The configured Expo config.
 */
export const withFirebase = (config: ExpoConfig) => {
  /**
   * Resolves the path to the given files.
   * @param p - The path to resolve.
   * @returns The resolved path.
   */
  const here = (...p: string[]) => path.resolve(__dirname, ...p);

  /**
   * Checks if the file exists.
   * @param p - The path to check.
   * @returns The path if the file exists, otherwise undefined.
   */
  const fileIfExists = (p: string) => (fs.existsSync(p) ? p : undefined);

  // Android and iOS google services files.
  const iosPlist = fileIfExists(
    here("../../google-services/GoogleService-Info.plist")
  );
  const androidJson = fileIfExists(
    here("../../google-services/google-services.json")
  );

  // Adds the Firebase plugins to the Expo config.
  if (config.plugins) {
    config.plugins.push(...FIREBASE_PLUGINS);
  }

  // Add the iOS google services file to the config and set the packages build properties to static.
  if (config.ios) {
    config.ios.googleServicesFile = iosPlist;
    const buildPropertiesPlugin = config.plugins?.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === "expo-build-properties"
    );
    if (buildPropertiesPlugin && Array.isArray(buildPropertiesPlugin)) {
      buildPropertiesPlugin[1] = {
        ...buildPropertiesPlugin[1],
        ios: {
          ...(buildPropertiesPlugin[1] as any).ios,
          useFrameworks: "static",
        },
      };
    }
  }

  // Add the Android google services file to the config.
  if (config.android) {
    config.android.googleServicesFile = androidJson;
  }
  return config;
};
