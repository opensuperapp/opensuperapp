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

# [Configurable] OAuth2 entity application configuration.
type Oauth2Config record {|
    # The URL of the token endpoint
    string tokenUrl;
    # The client ID of the application
    string clientId;
    # The client secret of the application
    string clientSecret;
    # The scopes of the application
    string[] scopes;
|};

# User search result.
public type UserSearchResult record {|
    # Total number of users
    int totalResults;
    # Starting index of the response
    int startIndex;
    # Number of users returned in the response
    int itemsPerPage;
    # List of group details
    User[] Resources = [];
    json...;
|};

# User.
public type User record {|
    # User ID
    string id;
    json...;
|};
