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
  TAB_VISIBILITY_RULES_KEY,
  WALLET_PASS_ENABLED_KEY,
} from "@/constants/RemoteConfigDefaults";
import {
  DEFAULT_TAB_CONFIG,
  DEFAULT_WALLET_PASS_CONFIG,
} from "@/types/remoteConfig.types";

/**
 * Fallbacks used when remote values are unavailable (offline, fetch failure, or
 * before the first activation). Serialized as JSON because Firebase Remote
 * Config stores every value as a string.
 */
export const REMOTE_CONFIG_INITIAL_VALUES = {
  [TAB_VISIBILITY_RULES_KEY]: JSON.stringify(DEFAULT_TAB_CONFIG),
  [WALLET_PASS_ENABLED_KEY]: JSON.stringify(DEFAULT_WALLET_PASS_CONFIG),
};
