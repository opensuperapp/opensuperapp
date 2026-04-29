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
import ballerina/sql;

public configurable string defaultMicroAppsGroup = ?; // Default micro apps group name

const DEFAULT_CONFIG_KEY = "superapp.apps.list"; // Default config key for user app list

# Get list of all MicroApp IDs for given groups.
#
# + groups - User's groups
# + return - Array of MicroApp IDs or an error
public isolated function getMicroAppIdsByGroups(string[] groups) returns string[]|error {
    string[] effectiveGroups = groups;
    effectiveGroups.push(defaultMicroAppsGroup);
    stream<MicroAppId, sql:Error?> appIdStream = databaseClient->query(getMicroAppIdsByGroupsQuery(effectiveGroups));

    string[] appIds = check from MicroAppId microAppId in appIdStream
        select microAppId.appId;

    if appIds.length() == 0 {
        log:printWarn(string `No Micro Apps found for the given groups : ${groups.toString()}`);
        return [];
    }
    return appIds;
}

# Get list of all MicroApps with latest versions for given groups.
#
# + groups - User's groups
# + return - Array of MicroApps or an error
public isolated function getMicroApps(string[] groups) returns MicroApp[]|error {
    string[] appIds = check getMicroAppIdsByGroups(groups);
    if appIds.length() == 0 {
        return [];
    }

    stream<MicroApp, sql:Error?> appStream = databaseClient->query(getMicroAppsByAppIdsQuery(appIds));
    MicroApp[] microApps = check from MicroApp microApp in appStream
        order by microApp.name ascending
        select microApp;
    if microApps.length() == 0 {
        return [];
    }

    foreach MicroApp microApp in microApps {
        stream<MicroAppVersion, sql:Error?> versionStream =
            databaseClient->query(getAllMicroAppVersionsQuery(microApp.appId));
        MicroAppVersion[] versions = check from MicroAppVersion version in versionStream
            select version;
        microApp.versions = versions;
    }
    return microApps;
}

# Get MicroApp by ID.
#
# + groups - User groups
# + appId - ID of the MicroApp
# + return - MicroApp, nil or an error
public isolated function getMicroAppById(string appId, string[] groups) returns MicroApp?|error {
    string[] appIds = check getMicroAppIdsByGroups(groups);
    if appIds.indexOf(appId) == () {
        return;
    }

    MicroApp|error microApp = databaseClient->queryRow(getMicroAppByAppIdQuery(appId));
    if microApp is sql:NoRowsError {
        return;
    }
    if microApp is error {
        return microApp;
    }

    stream<MicroAppVersion, sql:Error?> versionStream =
        databaseClient->query(getAllMicroAppVersionsQuery(microApp.appId));
    MicroAppVersion[] versions = check from MicroAppVersion microAppVersion in versionStream
        select microAppVersion;

    microApp.versions = versions;
    return microApp;
}

# Get all the versions of the SuperApp for a given platform.
#
# + platform - Platform ios|android
# + return - Array of Super App versions or an error
public isolated function getVersionsByPlatform(string platform) returns Version[]|error {
    stream<Version, sql:Error?> versionStream =
        databaseClient->query(getVersionsByPlatformQuery(platform));
    return from Version version in versionStream
        select version;
}

# Get all the user configurations for a given user UUID.
#
# + uuid - UUID of the user
# + return - Array of app configurations or else an error
public isolated function getUserConfigs(string uuid) returns UserConfig[]|error {
    stream<UserConfig, sql:Error?> configStream =
        databaseClient->query(getUserConfigsQuery(uuid));
    UserConfig[] userConfigs = check from UserConfig userConfig in configStream
        select userConfig;

    if userConfigs.length() == 0 {
        UserConfig userConfig = check addDefaultUserConfig(uuid, []);
        userConfigs.push(userConfig);
        return userConfigs;
    }
    foreach UserConfig config in userConfigs {
        string[] configValues = check config.configValue.fromJsonWithType();
        UserConfig userConfig = check addDefaultUserConfig(uuid, configValues);
        config.configValue = userConfig.configValue;
    }
    return userConfigs;
}

# Insert or update user configurations using UUID.
#
# + uuid - UUID of the user
# + userConfig - User configurations to be inserted or updated
# + return - Insert or update result, or an error
public isolated function updateUserConfigs(string uuid, UserConfig userConfig)
    returns ExecutionSuccessResult|error {

    sql:ParameterizedQuery query = updateUserConfigsQuery(
            uuid,
            userConfig.configKey,
            userConfig.configValue.toJsonString(),
            userConfig.isActive);
    sql:ExecutionResult result = check databaseClient->execute(query);
    return result.cloneWithType(ExecutionSuccessResult);
}

# Get FCM tokens for a list of UUIDs with pagination.
#
# + uuids - Array of user UUIDs to retrieve tokens for
# + startIndex - Start index for pagination
# + itemsPerPage - Items per page
# + return - FCMTokenResponse with tokens and pagination info, or an error.
public isolated function getFcmTokens(string[] uuids, int startIndex, int itemsPerPage = 'limit) 
    returns FcmTokenResponse|error {
    FcmTokenCount countRecord = check databaseClient->queryRow(countFcmTokensQuery(uuids));

    if startIndex < 0 || startIndex >= countRecord.count {
        return error(string `Invalid start index: ${startIndex}. Total results: ${countRecord.count}`);
    }

    stream<FcmToken, sql:Error?> tokenStream = databaseClient->query(getFcmTokensQuery(uuids, startIndex, itemsPerPage));
    string[] tokens = check from FcmToken tokenRecord in tokenStream
        where tokenRecord.fcmToken != ""
        select tokenRecord.fcmToken;

    return {
        fcmTokens: tokens,
        totalResults: countRecord.count,
        startIndex,
        itemsPerPage: countRecord.count > itemsPerPage ? itemsPerPage : countRecord.count
    };
}

# Inserts an FCM token into the `device_token` table for the given UUID.
#
# + uuid - The user UUID
# + fcmToken - The FCM token to be stored
# + return - `ExecutionSuccessResult` if the insertion succeeds, or `error` if it fails
public isolated function addFcmToken(string uuid, string fcmToken) returns ExecutionSuccessResult|error {
    sql:ExecutionResult result = check databaseClient->execute(addFcmTokenQuery(uuid, fcmToken));
    if result.affectedRowCount == 0 {
        return error("Failed to add FCM token.");
    }

    return result.cloneWithType(ExecutionSuccessResult);
}

# Delete an FCM token from the database.
#
# + fcmToken - The FCM token to be deleted
# + return - `ExecutionSuccessResult` if the deletion is successful, or `error` if the operation fails
public isolated function deleteFcmToken(string fcmToken) returns ExecutionSuccessResult|error {
    sql:ExecutionResult result = check databaseClient->execute(deleteFcmTokenQuery(fcmToken));
    if result.affectedRowCount == 0 {
        return error("No matching FCM token found to delete.");
    }

    return result.cloneWithType(ExecutionSuccessResult);
}

# Retrieve all application configurations from the database.
#
# + return - An array of `AppConfig`,or `error` if the configs cannot be retrieved
public isolated function getAppConfigs() returns AppConfig[]|error {
    stream<AppConfig, sql:Error?> resultStream = databaseClient->query(getAppConfigsQuery());
    AppConfig[] rows = check from var row in resultStream
        select row;
    AppConfig[] results = [];

    foreach var row in rows {
        var value = check parseConfigValue(row);
        results.push({configKey: row.configKey, value});
    }
    return results;
}

# Add default user configuration for a new user using UUID.
#
# + uuid - UUID of the user
# + configValues - Initial configuration values
# + return - UserConfig with default settings, or an error if the operation fails
public isolated function addDefaultUserConfig(string uuid, string[] configValues) returns UserConfig|error {
    string[] defaultMicroAppIds = check getMicroAppIdsByGroups([]);
    configValues.push(...defaultMicroAppIds);
    return {
        uuid,
        configKey: DEFAULT_CONFIG_KEY,
        configValue: configValues.toJson(),
        isActive: 1
    };
}

# Get notifications filtered by user groups.
#
# + groups - Array of user groups
# + startIndex - Start index for pagination
# + itemsPerPage - Items per page
# + return - Array of Notification or error
public isolated function getNotifications(string[] groups, int startIndex, int itemsPerPage)
    returns NotificationResponse|error? {

    NotificationsCount countRecord = check databaseClient->queryRow(getNotificationsCountQuery(groups));

    if startIndex < 0 || startIndex >= countRecord.count {
        log:printDebug("Invalid start index", startIndex = startIndex, totalResults = countRecord.count);
        return;
    }

    stream<DbNotification, sql:Error?> result =
        databaseClient->query(getNotificationsQuery(groups, startIndex, itemsPerPage));

    Notification[] notifications = check from DbNotification notification in result
        select {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            createdAt: notification.createdAt
        };

    return {
        notifications,
        totalResults: countRecord.count,
        startIndex,
        itemsPerPage: startIndex == 1
            ? (countRecord.count < itemsPerPage ? countRecord.count : itemsPerPage)
            : notifications.length()
    };
}
