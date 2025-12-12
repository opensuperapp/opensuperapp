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

type MicroAppResponse struct {
	AppID       string                    `json:"appId"`
	Name        string                    `json:"name"`
	Description *string                   `json:"description,omitempty"`
	IconURL     *string                   `json:"iconUrl,omitempty"`
	Active      int                       `json:"active"`
	Mandatory   int                       `json:"mandatory"`
	Versions    []MicroAppVersionResponse `json:"versions,omitempty"`
	Roles       []MicroAppRoleResponse    `json:"roles,omitempty"`
	Configs     []MicroAppConfigResponse  `json:"configs,omitempty"`
}

type CreateMicroAppRequest struct {
	AppID       string                         `json:"appId" validate:"required"`
	Name        string                         `json:"name" validate:"required"`
	Description *string                        `json:"description,omitempty"`
	IconURL     *string                        `json:"iconUrl,omitempty"`
	Mandatory   int                            `json:"mandatory"`
	Versions    []CreateMicroAppVersionRequest `json:"versions,omitempty" validate:"omitempty,dive"`
	Roles       []CreateMicroAppRoleRequest    `json:"roles,omitempty" validate:"omitempty,dive"`
	Configs     []CreateMicroAppConfigRequest  `json:"configs,omitempty" validate:"omitempty,dive"`
}
