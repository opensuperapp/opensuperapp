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
package services

import (
	"context"
	"encoding/json"
)

// TokenValidator defines the interface for token validation services
type TokenValidator interface {
	ValidateToken(tokenString string) (*TokenClaims, error)
	GetJWKS() (json.RawMessage, error)
}

// NotificationService defines the interface for sending notifications
type NotificationService interface {
	SendMulticastNotification(ctx context.Context, tokens []string, title string, body string, data map[string]string) (int, int, error)
}
