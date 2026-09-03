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

# Email domains allowed to use the business-card feature.
#
# An operator-configured empty list denies every domain -- it is not treated as "no
# restriction".
configurable string[] businessCardAllowedDomains = ["wso2.com"];

# Groups allowed to use the business-card feature; membership in any one is sufficient.
#
# An operator-configured empty list denies every user -- it is not treated as "no
# restriction".
configurable string[] businessCardAllowedGroups = ["wso2-employees"];

# Checks whether a user is allowed to use the business-card feature.
#
# Access is granted only when both hold:
# 1. The user's email domain (the segment after the last `@`) matches, case-insensitively,
#    an entry in `businessCardAllowedDomains`.
# 2. At least one of the user's groups matches, case-insensitively, an entry in
#    `businessCardAllowedGroups`.
#
# A missing or empty email, or a user with no groups, is denied.
#
# + userInfo - The authenticated user's JWT payload
# + return - `true` if the user satisfies both conditions, `false` otherwise
public isolated function hasBusinessCardAccess(CustomJwtPayload userInfo) returns boolean {
    string email = userInfo.email.trim();
    int? atIndex = email.lastIndexOf("@");
    if atIndex is () {
        return false;
    }

    string domain = email.substring(atIndex + 1).trim();
    if domain == "" || !containsIgnoreCase(businessCardAllowedDomains, domain) {
        return false;
    }

    foreach string 'group in userInfo.groups ?: [] {
        if containsIgnoreCase(businessCardAllowedGroups, 'group) {
            return true;
        }
    }
    return false;
}

# Checks whether `values` contains `target`, ignoring case and surrounding whitespace.
#
# + values - Candidate values to search
# + target - Value to look for
# + return - `true` if a case-insensitive, trimmed match is found
isolated function containsIgnoreCase(string[] values, string target) returns boolean {
    string normalizedTarget = target.trim().toLowerAscii();
    foreach string value in values {
        if value.trim().toLowerAscii() == normalizedTarget {
            return true;
        }
    }
    return false;
}
