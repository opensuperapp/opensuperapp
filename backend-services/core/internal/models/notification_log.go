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
	"database/sql/driver"
	"encoding/json"
	"time"
)

// JSONMap is a custom type for storing JSON data
type JSONMap map[string]interface{}

// Scan implements the sql.Scanner interface
func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, j)
}

// Value implements the driver.Valuer interface
func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

type NotificationLog struct {
	ID         int64     `gorm:"column:id;primaryKey;autoIncrement"`
	UserEmail  string    `gorm:"column:user_email;type:varchar(255);not null;index:idx_user_email"`
	Title      *string   `gorm:"column:title;type:varchar(255)"`
	Body       *string   `gorm:"column:body;type:text"`
	Data       JSONMap   `gorm:"column:data;type:json"`
	SentAt     time.Time `gorm:"column:sent_at;not null;autoCreateTime;index:idx_sent_at"`
	Status     *string   `gorm:"column:status;type:varchar(50)"`
	MicroappID *string   `gorm:"column:microapp_id;type:varchar(100);index:idx_microapp_id"`
}

func (NotificationLog) TableName() string {
	return "notification_logs"
}
