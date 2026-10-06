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
import { DecodedAccessToken } from "@/types/decodeAccessToken.types";
import { jwtDecode } from "jwt-decode";

interface ChatAuthIdentity {
  userId?: string | null;
  accessToken?: string | null;
}

/**
 * Resolves the current chat owner id from auth state or the access token claim.
 *
 * @param {ChatAuthIdentity} auth - Auth user id and access token.
 * @returns {string | null} User id for chat scoping, or null when unavailable.
 */
export const resolveChatUserId = ({
  userId,
  accessToken,
}: ChatAuthIdentity): string | null => {
  if (userId) {
    return userId;
  }

  if (!accessToken) {
    return null;
  }

  try {
    const decoded = jwtDecode<DecodedAccessToken>(accessToken);
    return decoded.userid ?? null;
  } catch {
    return null;
  }
};
