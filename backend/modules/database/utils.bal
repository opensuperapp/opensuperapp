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
import ballerina/sql;

# Parse the configuration value from a given `AppConfig` row based on its type.
#
# + row - The configuration setting record that contains the key, raw value, and type.
# + return - The parsed configuration value as a `boolean`, `string`, or `int`, or an `error` if parsing fails.
public isolated function parseConfigValue(AppConfig row) returns boolean|string|int|error {
    if row.'type == "boolean" {
        return row.value == "true";
    } else if row.'type == "int" {
        return int:fromString(row.value.toString());
    } else {
        return row.value;
    }
}

# Generates filter for target roles.
#
# + groups - Array of user groups to match against target_roles
# + return - Generated filter query
isolated function generateTargetRolesFilters(string[] groups) returns sql:ParameterizedQuery {
    sql:ParameterizedQuery filterQuery = `FIND_IN_SET(${groups[0]}, target_roles) > 0`;
    foreach int i in 1 ..< groups.length() {
        filterQuery = sql:queryConcat(filterQuery, ` OR FIND_IN_SET(${groups[i]}, target_roles) > 0`);
    }
    return filterQuery;
}

# Generates filter for target users.
#
# + userId - User UUID to match against target_users
# + return - Generated filter query
isolated function generateTargetUsersFilter(string userId) returns sql:ParameterizedQuery {
    return `FIND_IN_SET(${userId}, target_users) > 0`;
}
