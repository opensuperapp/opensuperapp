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
import Constants from "expo-constants";
import {
  applyEmailDisplayRules,
  EmailDisplayRules,
  NO_EMAIL_DISPLAY_RULES,
} from "@/utils/emailDisplayRules";

// Built into the app by app.config.ts from EMAIL_DOMAIN_REPLACE_* and
// EMAIL_ALIASES_FILE, so changing them needs a new build or an EAS Update.
const rules: EmailDisplayRules =
  (Constants.expoConfig?.extra?.emailDisplay as EmailDisplayRules | undefined) ??
  NO_EMAIL_DISPLAY_RULES;

/**
 * The address to show for a work email. Display only: never pass the result
 * back as an identity, a lookup key or an API argument.
 * @param email - The address the IdP or directory issued
 * @returns The address to display
 */
export const displayEmail = (email: string): string =>
  applyEmailDisplayRules(email, rules);
