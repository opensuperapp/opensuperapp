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

import "time"

type DeviceToken struct {
	ID          int64     `gorm:"column:id;primaryKey;autoIncrement"`
	UserEmail   string    `gorm:"column:user_email;type:varchar(255);not null;index:idx_user_email"`
	DeviceToken string    `gorm:"column:device_token;type:text;not null"`
	Platform    string    `gorm:"column:platform;type:enum('ios','android');not null"`
	CreatedAt   time.Time `gorm:"column:created_at;not null;autoCreateTime"`
	UpdatedAt   time.Time `gorm:"column:updated_at;not null;autoUpdateTime"`
	IsActive    bool      `gorm:"column:is_active;type:tinyint(1);not null;default:1;index:idx_is_active"`
}

func (DeviceToken) TableName() string {
	return "device_tokens"
}
