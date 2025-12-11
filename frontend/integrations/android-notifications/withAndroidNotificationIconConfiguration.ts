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
import { ConfigPlugin, withDangerousMod } from "@expo/config-plugins";
import fs from "fs";
import path from "path";

const withAndroidNotificationIconConfiguration: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      if (!platformProjectRoot) {
        throw new Error(
          "The platform project root is not defined. This indicates a problem with the prebuild process."
        );
      }

      const drawableDir = path.join(
        platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "drawable"
      );

      if (!fs.existsSync(drawableDir)) {
        fs.mkdirSync(drawableDir, { recursive: true });
      }

      // Copy notification icon to drawable folder
      const sourceIconPath = path.join(
        config.modRequest.projectRoot,
        "assets/images/notification-icon.png"
      );
      if (!fs.existsSync(sourceIconPath)) {
        throw new Error(
          `Notification icon not found at "${sourceIconPath}". Please ensure the file exists before running this configuration.`
        );
      }
      fs.copyFileSync(
        sourceIconPath,
        path.join(drawableDir, "ic_notification.png")
      );

      return config;
    },
  ]);
};

export default withAndroidNotificationIconConfiguration;
