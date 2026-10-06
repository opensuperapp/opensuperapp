// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
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
  ConfigPlugin,
  withAndroidManifest,
  withExpoPlist,
} from "@expo/config-plugins";

const ANDROID_META_DATA_NAME =
  "expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY";

/**
 * Adds the expo-channel-name request header to AndroidManifest.xml and iOS
 * Expo.plist so expo-updates knows which EAS Update channel to pull from.
 * For EAS cloud builds this is injected automatically; this plugin handles
 * locally built APKs/IPAs where the channel would otherwise be missing.
 */
const withUpdatesChannel: ConfigPlugin<{ channel: string }> = (
  config,
  { channel }
) => {
  // Android: write channel to AndroidManifest.xml as a JSON request header
  config = withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (!application) return mod;

    if (!application["meta-data"]) {
      application["meta-data"] = [];
    }

    // Remove any existing entry to avoid duplicates on repeated prebuild runs.
    application["meta-data"] = application["meta-data"].filter(
      (item) => item.$?.["android:name"] !== ANDROID_META_DATA_NAME
    );

    application["meta-data"].push({
      $: {
        "android:name": ANDROID_META_DATA_NAME,
        "android:value": JSON.stringify({ "expo-channel-name": channel }),
      },
    });

    return mod;
  });

  // iOS: write channel to Expo.plist as EXUpdatesRequestHeaders dict
  config = withExpoPlist(config, (mod) => {
    mod.modResults["EXUpdatesRequestHeaders"] = {
      "expo-channel-name": channel,
    };
    return mod;
  });

  return config;
};

export default withUpdatesChannel;
