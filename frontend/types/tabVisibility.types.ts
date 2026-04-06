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

import { TAB_VISIBILITY_RULES_SCHEMA_VERSION } from "@/constants/Constants";

export enum TabVisibilityMode {
  PUBLIC = "public",
  AUTH_REQUIRED = "auth_required",
  DOMAIN_SPECIFIC = "domain_specific",
}

/**
 * Per-tab visibility rule from Remote Config (merged with app defaults).
 */
export type TabVisibilityRule = {
  mode: TabVisibilityMode;
  order?: number;
  domains?: string[];
  requiresAuth?: boolean;
};

/**
 * Parsed `tab_visibility_rules` payload.
 */
export type TabVisibilityRules = {
  version: typeof TAB_VISIBILITY_RULES_SCHEMA_VERSION;
  tabs: Record<string, TabVisibilityRule>;
};

export type TabVisibilityEvaluationContext = {
  isSignedIn: boolean;
  email: string;
  tabRequiresAuth?: boolean;
};
