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

# Base JWT payload record.
public type BaseJwtPayload record {|
    # User email
    string email;
    # User groups
    string[] groups?;
|};

# Custom JWT payload record.
public type CustomJwtPayload record {|
    *BaseJwtPayload;
    # User ID
    string userId;
    # First name of the user
    string? firstName;
    # Last name of the user
    string? lastName;
    # Job title of the user
    string? jobTitle;
    # Mobile phone number of the user
    string? mobile;
    # Profile picture URL of the user
    string? profileUrl;
|};

# JWT payload record.
public type JwtPayload record {|
    *BaseJwtPayload;
    # User ID
    string userid;
    // The business-card claims (`given_name`, `family_name`, `jobtitle`, `phone_number`,
    // `profile`) arrive through this rest field and are read with `optionalStringClaim`.
    // Declaring them as typed fields would make `cloneWithType` — and so every authenticated
    // request — fail if the IdP ever emitted one with an unexpected shape.
    json...;
|};
