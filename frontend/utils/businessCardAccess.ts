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
  BUSINESS_CARD_ALLOWED_DOMAINS,
  BUSINESS_CARD_ALLOWED_GROUPS,
} from "@/constants/Constants";

// Both conditions must hold — this is an AND on top of whatever other gates
// (remote config, the build-time wallet-pass flag) already decide the card's
// visibility, never a substitute for them.
export const hasBusinessCardAccess = (
  email: string | undefined,
  groups: string[] | undefined
): boolean => {
  if (!email) {
    return false;
  }
  // `lastIndexOf` returns -1 with no `@`, which would hand the whole string
  // back as the domain and let a bare "wso2.com" through.
  const atIndex = email.lastIndexOf("@");
  if (atIndex < 0) {
    return false;
  }

  const domain = email.slice(atIndex + 1).trim().toLowerCase();
  if (!domain || !BUSINESS_CARD_ALLOWED_DOMAINS.includes(domain)) {
    return false;
  }

  if (!groups || groups.length === 0) {
    return false;
  }

  const normalizedGroups = groups
    .map((group) => group.trim().toLowerCase())
    .filter((group) => group.length > 0);

  return normalizedGroups.some((group) =>
    BUSINESS_CARD_ALLOWED_GROUPS.includes(group)
  );
};
