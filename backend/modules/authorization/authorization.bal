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
import ballerina/http;
import ballerina/jwt;
import ballerina/log;

# To handle authorization for each resource function invocation.
public isolated service class JwtInterceptor {

    *http:RequestInterceptor;
    isolated resource function default [string... path](http:RequestContext ctx, http:Request req)
        returns http:NextService|http:InternalServerError|error? {

        string|error idToken = req.getHeader(JWT_ASSERTION_HEADER);
        if idToken is error {
            string errorMsg = "Missing invoker info header!";
            log:printError(errorMsg, idToken);
            return <http:InternalServerError>{
                body: {
                    message: errorMsg
                }
            };
        }

        [jwt:Header, jwt:Payload]|jwt:Error result = jwt:decode(idToken);
        if result is jwt:Error {
            string errorMsg = "Error while reading the Invoker info!";
            log:printError(errorMsg, result);
            return <http:InternalServerError>{body: {message: errorMsg}};
        }

        JwtPayload|error userInfo = result[1].cloneWithType(JwtPayload);
        if userInfo is error {
            string errorMsg = "Malformed Invoker info object!";
            log:printError(errorMsg, userInfo);
            return <http:InternalServerError>{body: {message: errorMsg}};
        }

        CustomJwtPayload customUserInfo = {
            userId: userInfo.userid,
            email: userInfo.email,
            groups: userInfo.groups ?: [],
            firstName: optionalStringClaim(userInfo, CLAIM_GIVEN_NAME),
            lastName: optionalStringClaim(userInfo, CLAIM_FAMILY_NAME),
            jobTitle: optionalStringClaim(userInfo, CLAIM_JOB_TITLE),
            mobile: optionalStringClaim(userInfo, CLAIM_PHONE_NUMBER),
            profileUrl: optionalStringClaim(userInfo, CLAIM_PROFILE)
        };

        ctx.set(HEADER_USER_INFO, customUserInfo);
        return ctx.next();
    }
}

# Reads an optional string claim from the decoded JWT payload.
#
# The business-card claims are cosmetic, so a claim that is absent or carries an unexpected
# shape yields nil rather than failing the request.
#
# + payload - Decoded JWT payload
# + claim - Name of the claim to read
# + return - The claim value, or nil if it is absent or not a string
isolated function optionalStringClaim(JwtPayload payload, string claim) returns string? {
    json value = payload[claim];
    return value is string ? value : ();
}
