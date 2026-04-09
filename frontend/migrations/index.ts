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
import { migrateToSecureStore } from "./1_move_auth_to_secure_store";
import { recoverTokenRefreshState } from "./2_recover_token_refresh_state";

// Migrations registry
export const migrations: Record<number, () => Promise<void>> = {
  1: migrateToSecureStore,
  2: recoverTokenRefreshState,
};
