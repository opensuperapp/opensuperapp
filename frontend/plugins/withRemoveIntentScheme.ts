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
  AndroidConfig,
  ConfigPlugin,
  withAndroidManifest,
} from "@expo/config-plugins";

interface RemoveIntentSchemeProps {
  scheme: string;
}

/**
 * Finds the main activity in the AndroidManifest.xml
 * @param androidManifest The AndroidManifest.xml object
 * @returns The main activity object or null if not found
 */
const getMainActivity = (
  androidManifest: AndroidConfig.Manifest.AndroidManifest
): AndroidConfig.Manifest.ManifestActivity | null => {
  const { application } = androidManifest.manifest;
  if (!application || !Array.isArray(application)) {
    return null;
  }

  const mainApplication = application[0];
  if (!mainApplication.activity || !Array.isArray(mainApplication.activity)) {
    return null;
  }

  // Find the activity with the LAUNCHER intent filter
  const mainActivity = mainApplication.activity.find((activity) =>
    activity["intent-filter"]?.some(
      (intentFilter) =>
        intentFilter.action?.some(
          (action) => action.$["android:name"] === "android.intent.action.MAIN"
        ) &&
        intentFilter.category?.some(
          (category) =>
            category.$["android:name"] === "android.intent.category.LAUNCHER"
        )
    )
  );

  return mainActivity || null;
};

/**
 * A config plugin to remove a specific data scheme from the main activity's intent filters.
 * @param config The Expo config object
 * @param props The properties for the plugin
 * @param props.scheme The scheme to remove
 * @returns The modified Expo config
 */
const withRemoveIntentScheme: ConfigPlugin<RemoveIntentSchemeProps> = (
  config,
  { scheme }
) => {
  if (!scheme || typeof scheme !== "string" || scheme.trim() === "") {
    console.warn("Scheme is required and must be a non-empty string");
    return config;
  }

  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const mainActivity = getMainActivity(androidManifest);

    if (!mainActivity) {
      console.warn(
        "Could not find main activity in AndroidManifest.xml to remove scheme."
      );
      return config;
    }

    if (mainActivity["intent-filter"]) {
      // Iterate over each intent-filter
      mainActivity["intent-filter"].forEach((intentFilter) => {
        if (intentFilter.data) {
          // Filter out the data tag with the specified scheme
          intentFilter.data = intentFilter.data.filter(
            (data) => data.$["android:scheme"] !== scheme
          );
        }
      });
    }

    return config;
  });
};

export default withRemoveIntentScheme;
