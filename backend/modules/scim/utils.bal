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

# Gets the user ids of users belonging to a specific group from the SCIM operations service.
#
# + group - Filter used to search users of a group from the SCIM operations service
# + return - An array of email strings, or an error if the operation fails
public isolated function getGroupMemberIds(string group) returns string[]|error {
    User[] users = check searchUsers(group);
    return from User user in users
        select user.id;
}
