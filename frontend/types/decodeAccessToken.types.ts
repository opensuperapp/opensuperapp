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

// Wire claim names, looked up by the exact key the token carries — `jobtitle`
// and `userid` are Asgardeo's own spellings, not OIDC standard ones, so do not
// camelCase them.
export type DecodedAccessToken = {
  email?: string;
  given_name?: string;
  family_name?: string;
  userid?: string;
  jobtitle?: string;
  /** E.164. HR exposes no work number, so the card renders this as the mobile. */
  phone_number?: string;
  /** Avatar URL; Google photos carry an `=s100` suffix that callers strip. */
  profile?: string;
};
