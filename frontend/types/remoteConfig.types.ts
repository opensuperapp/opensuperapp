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

export interface TabVisibilityConfig {
  version: number;
  tabs: Record<string, TabRule>;
}

export interface TabRule {
  mode: "public" | "auth_required" | "domain_specific";
  domains?: string[];
  requiresAuth?: boolean;
  visibleForGuests?: boolean;
  defaultVisible?: boolean;
  order?: number;
  labelOverride?: string;
}

export const DEFAULT_TAB_CONFIG: TabVisibilityConfig = {
  version: 1,
  tabs: {
    index: {
      mode: "public",
      requiresAuth: false,
      visibleForGuests: true,
      defaultVisible: true,
    },
    library: {
      mode: "public",
      requiresAuth: false,
      visibleForGuests: true,
      defaultVisible: true,
    },
    apps: {
      mode: "auth_required",
      requiresAuth: true,
      visibleForGuests: false,
      defaultVisible: true,
    },
    chat: {
      mode: "domain_specific",
      domains: ["wso2.com"],
      requiresAuth: true,
      visibleForGuests: false,
      defaultVisible: false,
    },
    profile: {
      mode: "public",
      requiresAuth: false,
      visibleForGuests: true,
      defaultVisible: true,
    },
  },
};
