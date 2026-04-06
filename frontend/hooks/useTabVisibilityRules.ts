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
  ENABLE_FIREBASE,
  TAB_VISIBILITY_RULES_REMOTE_CONFIG_KEY,
  TAB_VISIBILITY_RC_DEFAULTS_RESOURCE_NAME,
} from "@/constants/Constants";
import defaultRulesJson from "@/integrations/firebase/tab_visibility_rules.default.json";
import { parseTabVisibilityRules } from "@/utils/tabVisibilityControl";
import { type TabVisibilityRules } from "@/types/tabVisibility.types";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

const bundledDefaultsString = JSON.stringify(defaultRulesJson);

/**
 * Loads tab visibility rules from Firebase Remote Config when enabled, otherwise
 * uses bundled JSON defaults. Native default XML/plist are applied on iOS/Android
 * during prebuild so values exist before the first fetch.
 * @returns {{ rules: TabVisibilityRules; ready: boolean }} Parsed rules and whether the initial Remote Config pass finished (always true when Firebase is disabled or on web).
 */
export function useTabVisibilityRules(): {
  rules: TabVisibilityRules;
  ready: boolean;
} {
  const [rules, setRules] = useState<TabVisibilityRules>(() =>
    parseTabVisibilityRules(bundledDefaultsString),
  );
  const [ready, setReady] = useState(
    () => !ENABLE_FIREBASE || Platform.OS === "web",
  );

  useEffect(() => {
    if (!ENABLE_FIREBASE || Platform.OS === "web") {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const {
          fetchAndActivate,
          getRemoteConfig,
          getString,
          setConfigSettings,
          setDefaultsFromResource,
        } = require("@react-native-firebase/remote-config") as typeof import("@react-native-firebase/remote-config");

        const rc = getRemoteConfig();
        await setConfigSettings(rc, {
          minimumFetchIntervalMillis: __DEV__ ? 0 : 60 * 60 * 1000,
        });
        await setDefaultsFromResource(rc, TAB_VISIBILITY_RC_DEFAULTS_RESOURCE_NAME);

        const readRules = () => {
          const raw = getString(rc, TAB_VISIBILITY_RULES_REMOTE_CONFIG_KEY);
          const effective = raw.trim() ? raw : bundledDefaultsString;
          return parseTabVisibilityRules(effective);
        };

        if (!cancelled) {
          setRules(readRules());
          setReady(true);
        }

        await fetchAndActivate(rc);

        if (!cancelled) {
          setRules(readRules());
        }
      } catch (e) {
        console.warn("Tab visibility Remote Config unavailable, using bundled defaults:", e);
        if (!cancelled) {
          setRules(parseTabVisibilityRules(bundledDefaultsString));
          setReady(true);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { rules, ready };
}
