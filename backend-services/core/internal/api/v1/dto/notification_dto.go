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
package dto

// RegisterDeviceTokenRequest represents the request to register a device token
type RegisterDeviceTokenRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Token    string `json:"token" validate:"required"`
	Platform string `json:"platform" validate:"required,oneof=ios android"`
}

// SendNotificationRequest represents the request to send a notification to specific users
type SendNotificationRequest struct {
	UserEmails []string               `json:"userEmails" validate:"required,min=1,dive,email"`
	Title      string                 `json:"title" validate:"required"`
	Body       string                 `json:"body" validate:"required"`
	Data       map[string]interface{} `json:"data,omitempty"`
}

// SendToGroupsRequest represents the request to send a notification to user groups
type SendToGroupsRequest struct {
	Groups []string               `json:"groups" validate:"required,min=1"`
	Title  string                 `json:"title" validate:"required"`
	Body   string                 `json:"body" validate:"required"`
	Data   map[string]interface{} `json:"data,omitempty"`
}

// NotificationResponse represents the response after sending notifications
type NotificationResponse struct {
	Success int    `json:"success"`
	Failed  int    `json:"failed"`
	Message string `json:"message"`
}
