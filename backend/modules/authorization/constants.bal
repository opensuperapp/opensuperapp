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

# Authorization Constants.
public const JWT_ASSERTION_HEADER = "x-jwt-assertion";

# Header carrying the caller's raw access token.
#
# An API gateway in front of this service overwrites `x-jwt-assertion` with a JWT it mints
# itself, so that header cannot be replayed against another gateway-fronted API. This one is
# passed through untouched, which is why the chat agent already uses it for the same purpose.
public const USER_ASSERTION_HEADER = "x-user-assertion";

# Header carrying the caller's bearer token, used as a fallback source of the access token.
public const AUTHORIZATION_HEADER = "Authorization";

# Scheme prefix of the `Authorization` header value.
public const BEARER_PREFIX = "Bearer ";
public const HEADER_USER_INFO = "user-info";

# Business card claims carried by the access token.
const CLAIM_GIVEN_NAME = "given_name";
const CLAIM_FAMILY_NAME = "family_name";
const CLAIM_JOB_TITLE = "jobtitle";
const CLAIM_PHONE_NUMBER = "phone_number";
const CLAIM_PROFILE = "profile";
