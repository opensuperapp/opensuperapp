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

configurable int 'limit = 100;

# Query to retrieve distinct micro app IDs allowed for the given user groups.
#
# + groups - An array of user groups used to filter allowed micro apps
# + return - sql:ParameterizedQuery to retrieve the list of allowed micro app IDs
isolated function getMicroAppIdsByGroupsQuery(string[] groups) returns sql:ParameterizedQuery => sql:queryConcat(`
    SELECT DISTINCT
        micro_app_id as appId
    FROM
        micro_app_role
    WHERE
        active = 1
    AND role IN (`, sql:arrayFlattenQuery(groups), `)
`);

# Query to get all MicroApps allowed for given groups.
#
# + appIds - MicroApp Ids
# + return - Generated Query to get all MicroApps
isolated function getMicroAppsByAppIdsQuery(string[] appIds) returns sql:ParameterizedQuery => sql:queryConcat(`
    SELECT
        name,
        description,
        promo_text,
        micro_app_id,
        icon_url,
        banner_image_url,
        mandatory
    FROM
        micro_app 
    WHERE
        active = 1
    AND 
        micro_app_id IN (`, sql:arrayFlattenQuery(appIds), `)
`);

# Query to get MicroApp versions by appId.
#
# + appId - MicroApp Id
# + return - Generated Query to get MicroApp versions
isolated function getAllMicroAppVersionsQuery(string appId) returns sql:ParameterizedQuery => `
    SELECT
        version,
        build,
        release_notes,
        icon_url,
        download_url
    FROM
        micro_app_version
    WHERE
        micro_app_id = ${appId}
    AND
        active = 1
    ORDER BY
        build DESC
`;

# Query to get MicroApp by appId.
#
# + appId - MicroApp Id
# + return - Generated Query to get MicroApp by appId
isolated function getMicroAppByAppIdQuery(string appId) returns sql:ParameterizedQuery => `
    SELECT
        name,
        description,
        promo_text,
        micro_app_id,
        icon_url,
        banner_image_url,
        mandatory
    FROM
        micro_app 
    WHERE
        micro_app_id = ${appId}
    AND
        active = 1
`;

# Query to get Super App versions by platform
#
# + platform - Platform (ios or android)
# + return - Generated Query to get Super App versions
isolated function getVersionsByPlatformQuery(string platform) returns sql:ParameterizedQuery => `
    SELECT
        version,
        build,
        platform,
        release_notes,
        download_url
    FROM
        superapp_version
    WHERE
        platform = ${platform}
    AND
        active = 1
    ORDER BY
        build DESC
`;

# Query to get user configurations by email
#
# + email - User email
# + return - Generated Query to get user configurations by email
isolated function getUserConfigsByEmailQuery(string email) returns sql:ParameterizedQuery => `
    SELECT
        email,
        config_key,
        config_value,
        active
    FROM
        user_config
    WHERE
        email = ${email}
    AND
        active = 1
`;

# Query update configurations by email
#
# + email - User email
# + configKey - Configuration key
# + configValue - Configuration value
# + isActive - status 1 or 0
# + return - Generated Query to insert/update configurations
isolated function updateUserConfigsByEmailQuery(string email, string configKey, string configValue, int isActive)
    returns sql:ParameterizedQuery => `
        INSERT INTO user_config (
            email,
            config_key,
            config_value,
            created_by,
            updated_by,
            active
        )
        VALUES (
            ${email},
            ${configKey},
            ${configValue},
            ${email},
            ${email},
            ${isActive}
        )
        ON DUPLICATE KEY UPDATE
            updated_by = ${email},
            config_value = ${configValue},
            active = ${isActive}
`;

# Query to get FCM tokens for a given email.
#
# + emails - Array of user emails to retrieve tokens for
# + startIndex - Start index for pagination
# + return - Generated query to get FCM tokens from the `device_token` table
public isolated function getFcmTokensQuery(string[] emails, int startIndex) returns sql:ParameterizedQuery =>
    sql:queryConcat(`
        SELECT 
            t.fcm_token
        FROM 
            device_token t
        INNER JOIN 
            user_config uc ON t.user_id = uc.id
        WHERE
            uc.email IN (`, sql:arrayFlattenQuery(emails), `) LIMIT ${'limit} OFFSET ${startIndex}
    `);

# Query to count FCM tokens for a given list of emails.
#
# + emails - Array of user emails to count tokens for
# + return - Generated query to count FCM tokens from the `device_token` table.
public isolated function countFcmTokensQuery(string[] emails) returns sql:ParameterizedQuery =>
    sql:queryConcat(`
        SELECT 
            COUNT(*) as count
        FROM 
            device_token t
        INNER JOIN 
            user_config uc ON t.user_id = uc.id
        WHERE
            uc.email IN (`, sql:arrayFlattenQuery(emails), `) 
    `);

# Query to insert or update an FCM token.
#
# + email - The user email used to fetch the corresponding `user_id` from `user_config`
# + fcmToken - The FCM token to be inserted or updated
# + return - Generated query to insert the FCM token into `device_token` table
public isolated function addFcmTokenQuery(string email, string fcmToken) returns sql:ParameterizedQuery => `
    INSERT INTO device_token (
        user_id, 
        fcm_token, 
        created_at
    )VALUES (
        (SELECT id FROM user_config WHERE email = ${email} AND config_key = ${DEFAULT_CONFIG_KEY}),
        ${fcmToken},
        CURRENT_TIMESTAMP
    )
    ON DUPLICATE KEY UPDATE 
        created_at = CURRENT_TIMESTAMP
`;

# Query to delete an FCM token.
#
# + fcmToken - The FCM token to be deleted
# + return - Generated query to remove the matching FCM token from the `device_token` table
public isolated function deleteFcmTokenQuery(string fcmToken) returns sql:ParameterizedQuery =>
    `DELETE FROM device_token WHERE fcm_token = ${fcmToken}`;

# Query to retrieve all application configurations.
#
# + return - A query that selects the `ConfigKey`, `Value`, and `Type` fields from the `app_configs` table
public isolated function getAppConfigsQuery() returns sql:ParameterizedQuery => `
    SELECT 
        config_key, 
        value, 
        type
    FROM 
        app_configs
`;

# Query to get the count of notifications filtered by user groups.
#
# + groups - Array of user groups to match against target_roles
# + return - Generated query to count filtered notifications
public isolated function getNotificationsCountQuery(string[] groups) returns sql:ParameterizedQuery {
    sql:ParameterizedQuery filterQuery = generateTargetRolesFilters(groups);
    return sql:queryConcat(`
        SELECT 
            COUNT(*) as count
        FROM 
            push_notification
        WHERE 
            (`, filterQuery, `)
    `);
}

# Query to get notifications filtered by user groups.
#
# + groups - Array of user groups to match against target_roles
# + startIndex - Start index for pagination
# + itemsPerPage - Items per page
# + return - Generated query to retrieve filtered notifications
public isolated function getNotificationsQuery(string[] groups, int startIndex, int itemsPerPage)
    returns sql:ParameterizedQuery {

    sql:ParameterizedQuery filterQuery = generateTargetRolesFilters(groups);
    return sql:queryConcat(`
        SELECT 
            id,
            title,
            message,
            target_roles,
            created_by,
            created_at
        FROM 
            push_notification
        WHERE 
            (`, filterQuery, `)
        ORDER BY
            created_at DESC
        LIMIT ${itemsPerPage} OFFSET ${startIndex}
    `);
}
