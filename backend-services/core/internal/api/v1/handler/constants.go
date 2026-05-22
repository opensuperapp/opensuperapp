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
package handler

import "time"

const (
	// Request body size limits
	defaultMaxRequestBodySize = 1 << 20 // 1MB
	userRequestBodyLimit      = 1 << 20 // 1MB default limit
	IdPResponseBodyLimit      = 1 << 20 // 1MB

	// HTTP timeout
	defaultHTTPTimeout = 10 * time.Second

	// HTTP Headers and Content Types
	headerContentType      = "Content-Type"
	headerCacheControl     = "Cache-Control"
	contentTypeHeader      = "Content-Type"
	contentTypeJSON        = "application/json"
	contentTypeForm        = "application/x-www-form-urlencoded"
	contentDisposition     = "Content-Disposition"
	applicationOctetStream = "application/octet-stream"
	cacheControlPublic     = "public, max-age=3600"

	// URL and Query Parameters
	QueryParamFileName = "fileName"
	urlParamAppID      = "appID"

	// Token Types
	tokenTypeBearer = "Bearer"

	// OAuth Parameters
	grantTypeUserContext = "user_context"
	paramGrantType       = "grant_type"
	paramUserEmail       = "user_email"
	paramMicroappID      = "microapp_id"
	paramScope           = "scope"
	paramClientID        = "client_id"
	paramClientSecret    = "client_secret"

	// HTTP Methods
	httpMethodPost = "POST"

	// Notification Status
	statusSent           = "sent"
	statusPartialFailure = "partial_failure"

	// Data Keys
	dataKeyMicroappID = "microappId"

	// Common Error Messages
	errUserInfoNotFound      = "user info not found in context"
	errFailedToWriteResponse = "failed to write response"
	errInvalidRequestBody    = "invalid request body"

	// File Handler Error Messages
	errInvalidFileName   = "invalid fileName"
	errQueryParamMissing = "fileName query parameter is required"
	errReadingBody       = "error in reading file content from request body"
	errFileContentEmpty  = "file content is empty"
	errUploadingFile     = "error uploading file"
	errDownloadingFile   = "error downloading file"
	errDeletingFile      = "error deleting file"
	errDBfileService     = "This endpoint only works with DB file service"
	errFileNotFound      = "file not found"

	// MicroApp Version Handler Error Messages
	errMissingMicroAppID     = "missing micro_app_id"
	errMicroAppNotFound      = "micro app not found"
	errFailedToFetchMicroApp = "failed to fetch micro app"
	errFailedToUpsertVersion = "failed to upsert version"

	// MicroApp Handler Error Messages
	errFailedToFetchMicroApps       = "failed to fetch micro apps"
	errFailedToGetAuthorizedAppIDs  = "Failed to get authorized app IDs"
	errFailedToFetchMicroAppsFromDB = "Failed to fetch micro apps from database"
	errForbidden                    = "forbidden"
	errFailedToUpsertMicroApp       = "failed to upsert micro app"
	errFailedToReloadMicroApp       = "Failed to reload micro app with relations"
	errFailedToDeactivateMicroApp   = "failed to deactivate micro app"
	errFailedToMarshalConfigValue   = "Failed to marshal config value"
	errUserNotAuthorizedToAccessApp = "User not authorized to access micro app"
	errNoGroupsFoundForUser         = "No groups found for the user"
	errNoMicroAppsFoundForGroups    = "No micro apps found for the given groups"

	// Notification Handler Error Messages
	errEmailDoesNotMatchAuthUser       = "email does not match authenticated user"
	errFailedToRegisterDeviceToken     = "failed to register device token"
	errFailedToDeactivateDeviceToken   = "failed to deactivate device token"
	errDeviceTokenNotFound             = "device token not found"
	errNotificationServiceNotAvailable = "notification service not available"
	errFailedToFetchDeviceTokens       = "failed to fetch device tokens"
	errFailedToSendNotifications       = "failed to send notifications"

	// Token Handler Error Messages
	errMicroAppNotFoundOrInactive = "microapp not found or inactive"
	errFailedToValidateMicroApp   = "failed to validate microapp"
	errUnsupportedGrant           = "unsupported grant type"
	errServiceInfoNotFound        = "service info not found in context"
	errClientIDEmpty              = "client ID is empty"
	errClientIDInvalid            = "client ID is invalid"
	errServerError                = "internal server error"
	errInvalidRequest             = "invalid request"
	errInvalidFormData            = "invalid form data"
	errJWKSNotAvailable           = "JWKS not available"
	errFailedToCreateRequest      = "failed to create request"
	errFailedToCallIDP            = "failed to call IDP"
	errFailedToParseIDPResponse   = "failed to parse IDP response"
	errIDPReturnedError           = "IDP returned status %d: %s"

	// User Config Handler Error Messages
	errFailedToFetchUserConfigs = "failed to fetch user configurations"
	errFailedToUpsertUserConfig = "failed to upsert user configuration"

	// User Handler Error Messages
	errFailedToFetchUserInfo   = "failed to fetch user information"
	errUserNotFound            = "user not found"
	errFailedToFetchUsers      = "failed to fetch users"
	errRequestBodyTooLarge     = "request body too large"
	errEmptyRequestBody        = "empty request body"
	errFailedToUpsertBulkUsers = "failed to upsert bulk users"
	errFailedToUpsertUser      = "failed to upsert user"
	errMissingEmailParameter   = "missing email parameter"
	errFailedToDeleteUser      = "failed to delete user"

	// URL Parameters
	paramEmail = "email"

	// Success Messages
	msgSuccessFileUpload                = "File uploaded successfully."
	msgMicroAppDeactivatedSuccessfully  = "Micro app deactivated successfully"
	msgNoActiveDeviceTokensFound        = "No active device tokens found"
	msgNotificationsSentSuccessfully    = "Notifications sent successfully"
	msgConfigurationUpdatedSuccessfully = "Configuration updated successfully"
	msgUsersBulkSuccess                 = "Users created/updated successfully"
	msgUserUpsertSuccess                = "User created/updated successfully"
	msgUserDeleteSuccess                = "User deleted successfully"
)
