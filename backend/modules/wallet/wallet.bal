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
import superapp_mobile_service.authorization;

import ballerina/http;
import ballerina/log;

# Longest wallet service error body kept in a log line
const int MAX_LOGGED_BODY_LENGTH = 512;

# Builds a signed Apple Wallet pass for the given business card.
#
# + card - Business card fields to render on the pass
# + userToken - Access token of the caller, forwarded to the wallet service
# + return - The `.pkpass` bytes, or a `WalletError` carrying the upstream status and body
public isolated function getApplePass(WalletCardRequest card, string userToken) returns byte[]|WalletError {
    http:Response response = check post(APPLE_PASS_PATH, card, userToken);
    byte[]|error pass = response.getBinaryPayload();
    if pass is error {
        return error WalletError("Wallet service returned an unreadable pass payload", pass,
                statusCode = response.statusCode, body = pass.message());
    }

    log:printDebug("Wallet service returned an Apple Wallet pass", path = APPLE_PASS_PATH,
            serialNumber = card.serialNumber, passBytes = pass.length());
    return pass;
}

# Builds a Google Wallet save URL for the given business card.
#
# + card - Business card fields to render on the pass
# + userToken - Access token of the caller, forwarded to the wallet service
# + return - The Google Wallet save URL, or a `WalletError` carrying the upstream status and body
public isolated function getGoogleSaveUrl(WalletCardRequest card, string userToken)
    returns GoogleSaveUrl|WalletError {

    http:Response response = check post(GOOGLE_SAVE_URL_PATH, card, userToken);
    json|error payload = response.getJsonPayload();
    if payload is error {
        return error WalletError("Wallet service returned a non-JSON save URL response", payload,
                statusCode = response.statusCode, body = payload.message());
    }

    GoogleSaveUrl|error saveUrl = payload.cloneWithType();
    if saveUrl is error {
        return error WalletError("Wallet service returned an unexpected save URL shape", saveUrl,
                statusCode = response.statusCode, body = truncate(payload.toJsonString()));
    }

    log:printDebug("Wallet service returned a Google Wallet save URL", path = GOOGLE_SAVE_URL_PATH,
            serialNumber = card.serialNumber);
    return saveUrl;
}

# POSTs a business card to the wallet service and rejects any non-2xx response.
#
# The response is taken as an `http:Response` rather than bound to a payload type so that a
# failure keeps its status code and body; binding discards both and yields a bare
# "Unauthorized"-style message that says nothing about which credential was rejected.
#
# + path - Wallet service path to call
# + card - Business card fields to render on the pass
# + userToken - Access token of the caller
# + return - The successful response, or a `WalletError` describing the failure
isolated function post(string path, WalletCardRequest card, string userToken)
    returns http:Response|WalletError {

    log:printDebug("Calling the wallet service", path = path, serialNumber = card.serialNumber,
            hasJobTitle = card.hasKey("jobTitle"), hasMobile = card.hasKey("mobile"),
            hasThumbnail = card.hasKey("employeeThumbnail"));

    http:Response|error response = walletClient->post(path, card, headers(userToken));
    if response is error {
        // No response at all: DNS, TLS, connect timeout, or an unreachable wallet service.
        log:printError("Could not reach the wallet service", response, path = path);
        return error WalletError("Could not reach the wallet service", response,
                statusCode = (), body = response.message());
    }

    if response.statusCode >= 200 && response.statusCode < 300 {
        return response;
    }

    string body = errorBody(response);
    log:printError("Wallet service rejected the request", path = path,
            statusCode = response.statusCode, responseBody = body);
    return error WalletError(string `Wallet service responded with ${response.statusCode}`,
            statusCode = response.statusCode, body = body);
}

# Builds the headers forwarded to the wallet service.
#
# The wallet service authenticates on `Authorization` alone -- it ignores `x-jwt-assertion`,
# and an application (client credentials) token is rejected as well, so this has to be the
# caller's own user access token. `x-jwt-assertion` is still sent because the service reads
# claims from it where present.
#
# + userToken - Access token of the caller
# + return - Headers to send with the wallet service request
isolated function headers(string userToken) returns map<string> => {
    [AUTHORIZATION_HEADER]: BEARER_PREFIX + userToken,
    [authorization:JWT_ASSERTION_HEADER]: userToken
};

# Reads the body of a failed wallet service response for logging.
#
# + response - Failed wallet service response
# + return - The body text, or a placeholder when it cannot be read
isolated function errorBody(http:Response response) returns string {
    string|error body = response.getTextPayload();
    return body is string ? truncate(body) : "<unreadable body>";
}

# Caps a string at `MAX_LOGGED_BODY_LENGTH` so one upstream failure cannot flood the log.
#
# + text - Text to cap
# + return - The text, truncated with an ellipsis when it is too long
isolated function truncate(string text) returns string =>
    text.length() <= MAX_LOGGED_BODY_LENGTH ? text : text.substring(0, MAX_LOGGED_BODY_LENGTH) + "...";
