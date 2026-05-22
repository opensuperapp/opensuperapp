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
const {
  withAndroidManifest,
  AndroidConfig,
} = require("@expo/config-plugins");

interface RemoveIntentSchemeProps {
  scheme: string;
}

/**
 * Finds the main activity in the AndroidManifest.xml
 * @param androidManifest The AndroidManifest.xml object
 * @returns The main activity object or null if not found
 */
const getMainActivity = (androidManifest: any): any => {
  const { application } = androidManifest.manifest;
  if (!application || !Array.isArray(application)) {
    return null;
  }

  const mainApplication = application[0];
  if (!mainApplication.activity || !Array.isArray(mainApplication.activity)) {
    return null;
  }

  // Find the activity with the LAUNCHER intent filter
  const mainActivity = mainApplication.activity.find((activity: any) =>
    activity["intent-filter"]?.some(
      (intentFilter: any) =>
        intentFilter.action?.some(
          (action: any) =>
            action.$["android:name"] === "android.intent.action.MAIN"
        ) &&
        intentFilter.category?.some(
          (category: any) =>
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
 */
const withRemoveIntentScheme = (
  config: any,
  { scheme }: RemoveIntentSchemeProps
) => {
  if (!scheme || typeof scheme !== "string" || scheme.trim() === "") {
    console.warn("Scheme is required and must be a non-empty string");
    return config;
  }

  return withAndroidManifest(config, (config: any) => {
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
      mainActivity["intent-filter"].forEach((intentFilter: any) => {
        if (intentFilter.data) {
          // Filter out the data tag with the specified scheme
          intentFilter.data = intentFilter.data.filter(
            (data: any) => data.$["android:scheme"] !== scheme
          );
        }
      });
    }

    return config;
  });
};

module.exports = withRemoveIntentScheme;
