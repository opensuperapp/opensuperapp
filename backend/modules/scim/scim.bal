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
import ballerina/log;

# Searches for users belonging to a specific group from the SCIM operations service.
# 
# + group - Filter used to search users of a group from the SCIM operations service
# + return - An array of User records, or an error if the operation fails
public isolated function searchUsers(string group) returns User[]|error {
    boolean moreUsersExists = true;
    User[] users = [];
    int startIndex = 1;
    while moreUsersExists {
        UserSearchResult usersResult = check scimClient->/organizations/internal/users/search.post({
            domain: "DEFAULT",
            attributes: ["userName"],
            filter: string `groups eq ${group}`,
            startIndex
        });
        users.push(...usersResult.Resources);
        moreUsersExists = (startIndex + usersResult.itemsPerPage - 1) < usersResult.totalResults;
        startIndex += usersResult.itemsPerPage;
        log:printDebug(string `Fetched ${startIndex - 1} users successfully`);
    }
    return users;
}

# Searches for Internal users by email from the SCIM operations service.
#
# + email - Email of the user to search for
# + return - An array of User records, or an error if the operation fails
public isolated function getInternalUserIdByEmail(string email) returns User[]|error {
    User[] users = [];
    UserSearchResult usersResult = check scimClient->/organizations/internal/users/search.post({
        domain: "DEFAULT",
        attributes: ["userName", "id"],
        filter: string `userName eq ${email}`
    });

    users.push(...usersResult.Resources);
    return users;
}

# Searches for External users by email from the SCIM operations service.
#
# + email - Email of the user to search for
# + return - An array of User records, or an error if the operation fails
public isolated function getExternalUserIdByEmail(string email) returns User[]|error {
    User[] users = [];
    UserSearchResult usersResult = check scimClient->/organizations/'external/users/search.post({
        domain: "DEFAULT",
        attributes: ["userName", "id"],
        filter: string `userName eq ${email}`
    });

    users.push(...usersResult.Resources);
    return users;
}
