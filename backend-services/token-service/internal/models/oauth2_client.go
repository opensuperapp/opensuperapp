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
package models

import (
	"time"

	"gorm.io/gorm"
)

// OAuth2Client represents an OAuth2 client (microapp backend)
// The ClientID serves as both the OAuth client identifier and the microapp identifier
type OAuth2Client struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	ClientID     string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"client_id"`
	ClientSecret string         `gorm:"type:text;not null" json:"-"` // Bcrypt hashed secret (~60 chars)
	Name         string         `gorm:"not null" json:"name"`
	Scopes       string         `json:"scopes"` // Comma-separated scopes
	IsActive     bool           `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
