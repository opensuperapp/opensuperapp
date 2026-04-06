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
import { ENABLE_FIREBASE } from "@/constants/Constants";
import { TAB_VISIBILITY_RULES_KEY } from "@/constants/RemoteConfigDefaults";
import {
  getRemoteConfigValueAsJson,
  getRemoteConfigValueAsString,
} from "@/services/remoteConfig";
import { DEFAULT_TAB_CONFIG, TabVisibilityConfig } from "@/types/remoteConfig.types";
import { useCallback, useEffect, useMemo, useState } from "react";

export const useRemoteConfig = <T>(
  key: string,
  defaultValue: T
): {
  loading: boolean;
  value: T;
  error: Error | null;
} => {
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState<T>(defaultValue);
  const [error, setError] = useState<Error | null>(null);

  const fetchValue = useCallback(async () => {
    if (!ENABLE_FIREBASE) {
      setValue(defaultValue);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      const result = await getRemoteConfigValueAsString(key);
      setValue((result || defaultValue) as T);
      setError(null);
    } catch (err) {
      console.error(`Error fetching remote config for key "${key}":`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setValue(defaultValue);
    } finally {
      setLoading(false);
    }
  }, [key, defaultValue]);

  useEffect(() => {
    fetchValue();
  }, [fetchValue]);

  return useMemo(
    () => ({
      loading,
      value,
      error,
    }),
    [loading, value, error]
  );
};

export const useTabVisibilityRules = (): {
  loading: boolean;
  rules: TabVisibilityConfig;
  error: Error | null;
} => {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<TabVisibilityConfig>(DEFAULT_TAB_CONFIG);
  const [error, setError] = useState<Error | null>(null);

  const fetchRules = useCallback(async () => {
    if (!ENABLE_FIREBASE) {
      setRules(DEFAULT_TAB_CONFIG);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      const result = await getRemoteConfigValueAsJson<TabVisibilityConfig>(TAB_VISIBILITY_RULES_KEY);
      setRules(result);
      setError(null);
    } catch (err) {
      console.error("Error fetching tab visibility rules:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setRules(DEFAULT_TAB_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  return useMemo(
    () => ({
      loading,
      rules,
      error,
    }),
    [loading, rules, error]
  );
};
