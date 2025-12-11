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
import { CLIENT_ID, REDIRECT_URI, TOKEN_URL, AUTHORIZATION_URL, REVOCATION_URL, ISSUER } from "@/constants/Constants";

const BASE_CONFIG = {
  clientId: CLIENT_ID,
  redirectUrl: REDIRECT_URI,
  scopes: ["openid", "profile", "email", "groups"],
  postLogoutRedirectUrl: REDIRECT_URI,
  iosPrefersEphemeralSession: true,
} as const;

// Prefer explicit serviceConfiguration when endpoints are provided via env
export const AUTH_CONFIG = AUTHORIZATION_URL && TOKEN_URL
  ? {
      ...BASE_CONFIG,
      serviceConfiguration: {
        authorizationEndpoint: AUTHORIZATION_URL,
        tokenEndpoint: TOKEN_URL,
        ...(REVOCATION_URL ? { revocationEndpoint: REVOCATION_URL } : {}),
      },
    }
  : ISSUER
  ? {
      ...BASE_CONFIG,
      issuer: ISSUER,
    }
  : {
      // Fallback to previous behavior to avoid breaking existing setups
      ...BASE_CONFIG,
      issuer: TOKEN_URL,
    };
