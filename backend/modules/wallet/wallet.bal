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

# Builds a signed Apple Wallet pass for the given business card.
#
# + card - Business card fields to render on the pass
# + jwtAssertion - JWT assertion of the caller, forwarded to the wallet service
# + return - The `.pkpass` bytes, or an error if the operation fails
public isolated function getApplePass(WalletCardRequest card, string jwtAssertion) returns byte[]|error {
    byte[] pass = check walletClient->post(APPLE_PASS_PATH, card, {[authorization:JWT_ASSERTION_HEADER]: jwtAssertion});
    return pass;
}

# Builds a Google Wallet save URL for the given business card.
#
# + card - Business card fields to render on the pass
# + jwtAssertion - JWT assertion of the caller, forwarded to the wallet service
# + return - The Google Wallet save URL, or an error if the operation fails
public isolated function getGoogleSaveUrl(WalletCardRequest card, string jwtAssertion) returns GoogleSaveUrl|error {
    GoogleSaveUrl saveUrl = check walletClient->post(GOOGLE_SAVE_URL_PATH, card,
            {[authorization:JWT_ASSERTION_HEADER]: jwtAssertion});
    return saveUrl;
}
