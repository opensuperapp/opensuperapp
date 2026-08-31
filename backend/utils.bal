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
import superapp_mobile_service.authorization;
import superapp_mobile_service.entity;
import superapp_mobile_service.scim;
import superapp_mobile_service.wallet;

import ballerina/cache;
import ballerina/http;
import ballerina/log;

final cache:Cache userInfoCache = new (capacity = 100, evictionFactor = 0.2);

# Retrieves basic employee information for a given email.
#
# + email - Email address of the user
# + return - entity:Employee record if available, or error? if an error occurs or the user is not found
public isolated function getUserInfo(string email) returns entity:Employee|error? {
    if !scim:isInternalUser(email) {
        return ();
    }

    if userInfoCache.hasKey(email) {
        entity:Employee|error loggedInUser = userInfoCache.get(email).ensureType();
        if loggedInUser is error {
            log:printWarn(string `Error occurred while retrieving user data: ${email}!`, loggedInUser);
        } else {
            return loggedInUser;
        }
    }

    entity:Employee|error? employee = entity:fetchEmployeesBasicInfo(email);
    if employee is entity:Employee {
        error? cacheResult = userInfoCache.put(email, employee);
        if cacheResult is error {
            log:printWarn(string `Failed to cache user data for: ${email}`, cacheResult);
        }
    }

    return employee;
}

# Builds the business card of the logged in user from the access token claims.
#
# + userInfo - Claims of the caller, extracted from the access token by the JWT interceptor
# + return - BusinessCard of the caller
public isolated function toBusinessCard(authorization:CustomJwtPayload userInfo) returns BusinessCard => {
    userId: userInfo.userId,
    // The wallet pass contract requires non-null names, so an absent claim becomes an empty string.
    firstName: userInfo.firstName ?: "",
    lastName: userInfo.lastName ?: "",
    workEmail: userInfo.email,
    jobTitle: userInfo.jobTitle,
    mobile: userInfo.mobile,
    thumbnailUrl: toFullResolutionPhotoUrl(userInfo.profileUrl)
};

# Strips the size suffix from a profile picture URL.
#
# The `profile` claim carries a Google photo URL sized down by a trailing `=s<pixels>` suffix
# (`https://lh3.googleusercontent.com/a/XXXX=s100`). Dropping the suffix yields the full
# resolution image, which is what a wallet pass renders. URLs without the suffix are left as is.
#
# + url - Profile picture URL from the `profile` claim, if any
# + return - Full resolution URL, or nil when there is no usable URL
isolated function toFullResolutionPhotoUrl(string? url) returns string? {
    if url is () || url.trim() == "" {
        return ();
    }
    return re `=s\d+$`.replace(url, "");
}

# Maps a business card to the payload the wallet service expects.
#
# + card - Business card of the user
# + return - wallet:WalletCardRequest to POST to the wallet service
isolated function toWalletCardRequest(BusinessCard card) returns wallet:WalletCardRequest {
    wallet:WalletCardRequest cardRequest = {
        serialNumber: card.userId,
        firstName: card.firstName,
        lastName: card.lastName,
        workEmail: card.workEmail
    };

    string? jobTitle = card.jobTitle;
    if jobTitle is string {
        cardRequest.jobTitle = jobTitle;
    }

    string? mobile = card.mobile;
    if mobile is string {
        cardRequest.mobile = mobile;
    }

    string? thumbnailUrl = card.thumbnailUrl;
    if thumbnailUrl is string {
        cardRequest.employeeThumbnail = thumbnailUrl;
    }

    return cardRequest;
}

# Maps a wallet service failure to the response the caller gets.
#
# The upstream status is what makes these distinguishable in the app and in the logs: an
# expired token is the caller's problem (401) and is by far the most common cause, while
# anything else is the wallet service failing on our behalf (502). Collapsing both into a
# blanket 500 is what made this endpoint impossible to triage.
#
# + operation - What was being built, used in the log line
# + userId - User the pass was being built for
# + walletError - Failure returned by the wallet module
# + return - `http:Unauthorized` when the wallet service rejected the token, else `http:BadGateway`
public isolated function walletFailure(string operation, string userId, wallet:WalletError walletError)
    returns http:Unauthorized|http:BadGateway {

    int? statusCode = walletError.detail().statusCode;
    log:printError(string `Error occurred while generating the ${operation}!`, walletError,
            userId = userId, upstreamStatus = statusCode ?: -1, upstreamBody = walletError.detail().body);

    if statusCode == http:STATUS_UNAUTHORIZED || statusCode == http:STATUS_FORBIDDEN {
        return <http:Unauthorized>{
            body: {
                message: string `Not authorized to generate the ${operation}. Sign in again and retry.`
            }
        };
    }

    return <http:BadGateway>{
        body: {
            message: string `The wallet service could not generate the ${operation}.`
        }
    };
}
