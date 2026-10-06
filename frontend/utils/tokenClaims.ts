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

// Asgardeo can be configured to issue opaque access tokens, so failing to
// decode is expected rather than an error; the caller falls back to the other
// token.
export const decodeClaims = (
  token: string | null | undefined,
  source: string
): DecodedAccessToken | null => {
  if (!token) {
    return null;
  }
  try {
    return jwtDecode<DecodedAccessToken>(token);
  } catch (error) {
    console.warn(`[claims] ${source} is not a decodable JWT`, error);
    return null;
  }
};

// Merged field by field rather than picking one token wholesale: Asgardeo puts
// `jobtitle` and `phone_number` in whichever token the OIDC app's claim config
// names, and that differs per app and can move between releases.
export const mergeClaims = (
  sources: (DecodedAccessToken | null)[]
): DecodedAccessToken | null => {
  const present = sources.filter((claims): claims is DecodedAccessToken =>
    Boolean(claims)
  );
  if (present.length === 0) {
    return null;
  }

  const pick = (key: keyof DecodedAccessToken): string | undefined => {
    for (const claims of present) {
      const value = claims[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
    return undefined;
  };

  return {
    email: pick("email"),
    given_name: pick("given_name"),
    family_name: pick("family_name"),
    userid: pick("userid"),
    jobtitle: pick("jobtitle"),
    phone_number: pick("phone_number"),
    profile: pick("profile"),
  };
};
