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

# Business card payload sent to the wallet service.
#
# The wallet service keys a pass by `serialNumber`, which is the user id under a different
# name. That rename is the reason this record exists rather than posting a `BusinessCard`
# directly. Fields the card does not carry (`department`, `workPhone`, `organization`,
# `website`, `address`) are simply not sent; the wallet service treats them as absent.
public type WalletCardRequest record {|
    # User id of the employee, the serial number of the pass
    string serialNumber;
    # First name of the employee
    string firstName;
    # Last name of the employee
    string lastName;
    # Work email of the employee
    string workEmail;
    # Job title of the employee
    string jobTitle?;
    # Mobile phone number of the employee
    string mobile?;
    # Profile picture URL of the employee, rendered on the pass
    string employeeThumbnail?;
|};

# Google Wallet save URL returned by the wallet service.
public type GoogleSaveUrl record {|
    # URL that adds the pass to the user's Google Wallet
    string saveUrl;
|};

# Failure returned by the wallet service, carrying enough of the upstream response to be
# actionable in a log line: a bare `error` from the HTTP client hides the status code and
# body behind a generic message, which is what made the previous 500s undiagnosable.
public type WalletErrorDetail record {|
    # HTTP status the wallet service responded with, or `()` when the call never got a response
    int? statusCode;
    # Response body of the wallet service, truncated to keep log lines readable
    string body;
|};

# Error type raised when the wallet service does not return a pass.
public type WalletError distinct error<WalletErrorDetail>;
