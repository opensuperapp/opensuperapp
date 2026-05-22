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
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

// UserContextClaims represents claims for a user-context token
type UserContextClaims struct {
	jwt.RegisteredClaims
	MicroappID string `json:"microapp_id"`
	Scopes     string `json:"scope,omitempty"`
	Email      string `json:"email"`
}

// GenerateUserToken generates a token for a microapp frontend with user context
// This is used when a microapp frontend needs to call its own backend
func (s *TokenService) GenerateUserToken(userEmail, microappID, scopes string) (string, error) {
	now := time.Now()
	claims := UserContextClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    Issuer,
			Subject:   userEmail,                    // User email as subject (who the token represents)
			Audience:  jwt.ClaimStrings{microappID}, // Microapp ID as audience (intended recipient)
			ExpiresAt: jwt.NewNumericDate(now.Add(s.expiry)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
		MicroappID: microappID,
		Scopes:     scopes,
		Email:      userEmail,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)

	s.mu.RLock()
	activeKeyID := s.activeKeyID
	privateKey, ok := s.privateKeys[activeKeyID]
	s.mu.RUnlock()

	if !ok {
		return "", fmt.Errorf("active key %s not found", activeKeyID)
	}

	token.Header["kid"] = activeKeyID
	return token.SignedString(privateKey)
}
