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
import { DEFAULT_TAB_CONFIG, TabVisibilityConfig, TabRule } from "@/types/remoteConfig.types";

const extractDomain = (email: string | undefined): string | null => {
  if (!email) return null;

  const trimmedEmail = email.trim();

  if (trimmedEmail.indexOf("@") === -1) {
    return null;
  }

  const domain = trimmedEmail.split("@")[1]?.toLowerCase().trim();

  return domain || null;
};

const evaluateRule = (
  rule: TabRule,
  email: string | null | undefined,
  isAuthenticated: boolean
): boolean => {
  const userDomain = extractDomain(email ?? undefined);

  switch (rule.mode) {
    case "public":
      return true;

    case "auth_required":
      if (rule.requiresAuth && !isAuthenticated) {
        return false;
      }

      if (rule.visibleForGuests !== undefined) {
        return isAuthenticated ? true : rule.visibleForGuests;
      }

      return isAuthenticated;

    case "domain_specific": {
      if (!isAuthenticated) {
        return false;
      }

      if (!rule.domains?.length) {
        return rule.defaultVisible ?? true;
      }

      if (!userDomain) {
        return rule.defaultVisible ?? false;
      }

      const allowedDomains = rule.domains.map((d) =>
        d.toLowerCase().trim()
      );

      return allowedDomains.includes(userDomain);
    }

    default:
      return rule.defaultVisible ?? true;
  }
};

export const shouldShowTab = (
  tabName: string,
  email: string | null | undefined,
  isAuthenticated: boolean,
  rules: TabVisibilityConfig | null | undefined
): boolean => {
  const effectiveRules = rules ?? DEFAULT_TAB_CONFIG;
  const rule = effectiveRules.tabs[tabName] ?? DEFAULT_TAB_CONFIG.tabs[tabName];

  if (!rule) {
    return true;
  }

  return evaluateRule(rule, email, isAuthenticated);
};
