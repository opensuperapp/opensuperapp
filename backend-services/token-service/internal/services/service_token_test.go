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
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

// TestIssueToken tests service token generation
func TestIssueToken(t *testing.T) {
	ts, err := NewTokenServiceFromDirectory(testDataDir, "test-key-1", 3600)
	if err != nil {
		t.Fatalf("Failed to create token service: %v", err)
	}

	clientID := "test-client"
	scopes := "read write"

	tokenString, err := ts.IssueToken(clientID, scopes)
	if err != nil {
		t.Fatalf("Failed to issue token: %v", err)
	}

	if tokenString == "" {
		t.Fatal("Token string is empty")
	}

	// Parse token to verify claims
	token, err := jwt.ParseWithClaims(tokenString, &ServiceClaims{}, func(token *jwt.Token) (interface{}, error) {
		kid, ok := token.Header["kid"].(string)
		if !ok {
			t.Fatal("kid not found in token header")
		}

		if kid != "test-key-1" {
			t.Errorf("Expected kid test-key-1, got %s", kid)
		}

		return ts.publicKeys[kid], nil
	})

	if err != nil {
		t.Fatalf("Failed to parse token: %v", err)
	}

	claims, ok := token.Claims.(*ServiceClaims)
	if !ok {
		t.Fatal("Failed to cast claims")
	}

	if claims.Subject != clientID {
		t.Errorf("Expected subject %s, got %s", clientID, claims.Subject)
	}

	if claims.Scopes != scopes {
		t.Errorf("Expected scopes %s, got %s", scopes, claims.Scopes)
	}

	if claims.Issuer != Issuer {
		t.Errorf("Expected issuer %s, got %s", Issuer, claims.Issuer)
	}
}

// TestServiceTokenExpiry tests service token expiration
func TestServiceTokenExpiry(t *testing.T) {
	expirySeconds := 1 // 1 second expiry
	ts, err := NewTokenServiceFromDirectory(testDataDir, "test-key-1", expirySeconds)
	if err != nil {
		t.Fatalf("Failed to create token service: %v", err)
	}

	tokenString, err := ts.IssueToken("test-client", "read")
	if err != nil {
		t.Fatalf("Failed to issue token: %v", err)
	}

	// Parse token
	token, err := jwt.ParseWithClaims(tokenString, &ServiceClaims{}, func(token *jwt.Token) (interface{}, error) {
		kid := token.Header["kid"].(string)
		return ts.publicKeys[kid], nil
	})

	if err != nil {
		t.Fatalf("Failed to parse token: %v", err)
	}

	claims := token.Claims.(*ServiceClaims)

	// Verify expiry is set correctly
	expectedExpiry := time.Now().Add(time.Duration(expirySeconds) * time.Second)
	actualExpiry := claims.ExpiresAt.Time

	// Allow 1 second tolerance
	if actualExpiry.Sub(expectedExpiry).Abs() > time.Second {
		t.Errorf("Token expiry mismatch. Expected ~%v, got %v", expectedExpiry, actualExpiry)
	}

	// Wait for token to expire
	time.Sleep(2 * time.Second)

	// Try to parse expired token
	_, err = jwt.ParseWithClaims(tokenString, &ServiceClaims{}, func(token *jwt.Token) (interface{}, error) {
		kid := token.Header["kid"].(string)
		return ts.publicKeys[kid], nil
	})

	if err == nil {
		t.Error("Expected error for expired token")
	}
}
