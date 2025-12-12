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

// TestGenerateUserToken tests user token generation
func TestGenerateUserToken(t *testing.T) {
	ts, err := NewTokenServiceFromDirectory(testDataDir, "test-key-1", 3600)
	if err != nil {
		t.Fatalf("Failed to create token service: %v", err)
	}

	userEmail := "test@example.com"
	microappID := "test-microapp"
	scopes := "read write"

	tokenString, err := ts.GenerateUserToken(userEmail, microappID, scopes)
	if err != nil {
		t.Fatalf("Failed to generate user token: %v", err)
	}

	if tokenString == "" {
		t.Fatal("Token string is empty")
	}

	// Parse token to verify claims
	token, err := jwt.ParseWithClaims(tokenString, &UserContextClaims{}, func(token *jwt.Token) (interface{}, error) {
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

	claims, ok := token.Claims.(*UserContextClaims)
	if !ok {
		t.Fatal("Failed to cast claims")
	}

	// Subject should be the user email
	if claims.Subject != userEmail {
		t.Errorf("Expected subject %s, got %s", userEmail, claims.Subject)
	}

	// Audience should be the microapp ID
	if len(claims.Audience) == 0 || claims.Audience[0] != microappID {
		t.Errorf("Expected audience %s, got %v", microappID, claims.Audience)
	}

	// MicroappID claim should match
	if claims.MicroappID != microappID {
		t.Errorf("Expected microapp_id %s, got %s", microappID, claims.MicroappID)
	}

	if claims.Scopes != scopes {
		t.Errorf("Expected scopes %s, got %s", scopes, claims.Scopes)
	}

	if claims.Issuer != Issuer {
		t.Errorf("Expected issuer %s, got %s", Issuer, claims.Issuer)
	}
}

// TestGenerateUserTokenWithActiveKey tests user token with different active keys
func TestGenerateUserTokenWithActiveKey(t *testing.T) {
	ts, err := NewTokenServiceFromDirectory(testDataDir, "test-key-1", 3600)
	if err != nil {
		t.Fatalf("Failed to create token service: %v", err)
	}

	// Generate token with test-key-1
	token1, err := ts.GenerateUserToken("user1@example.com", "microapp1", "read")
	if err != nil {
		t.Fatalf("Failed to generate token with key-1: %v", err)
	}

	// Switch to test-key-2
	err = ts.SetActiveKey("test-key-2")
	if err != nil {
		t.Fatalf("Failed to set active key: %v", err)
	}

	// Generate token with test-key-2
	token2, err := ts.GenerateUserToken("user2@example.com", "microapp2", "write")
	if err != nil {
		t.Fatalf("Failed to generate token with key-2: %v", err)
	}

	// Verify both tokens have different kids
	parsedToken1, _ := jwt.Parse(token1, nil)
	parsedToken2, _ := jwt.Parse(token2, nil)

	kid1 := parsedToken1.Header["kid"].(string)
	kid2 := parsedToken2.Header["kid"].(string)

	if kid1 != "test-key-1" {
		t.Errorf("Expected kid1 test-key-1, got %s", kid1)
	}

	if kid2 != "test-key-2" {
		t.Errorf("Expected kid2 test-key-2, got %s", kid2)
	}

	// Both tokens should be valid with their respective keys
	_, err = jwt.ParseWithClaims(token1, &UserContextClaims{}, func(token *jwt.Token) (interface{}, error) {
		return ts.publicKeys["test-key-1"], nil
	})
	if err != nil {
		t.Errorf("Token1 validation failed: %v", err)
	}

	_, err = jwt.ParseWithClaims(token2, &UserContextClaims{}, func(token *jwt.Token) (interface{}, error) {
		return ts.publicKeys["test-key-2"], nil
	})
	if err != nil {
		t.Errorf("Token2 validation failed: %v", err)
	}
}

// TestUserTokenExpiry tests user token expiration
func TestUserTokenExpiry(t *testing.T) {
	expirySeconds := 1
	ts, err := NewTokenServiceFromDirectory(testDataDir, "test-key-1", expirySeconds)
	if err != nil {
		t.Fatalf("Failed to create token service: %v", err)
	}

	tokenString, err := ts.GenerateUserToken("test@example.com", "test-microapp", "read")
	if err != nil {
		t.Fatalf("Failed to generate user token: %v", err)
	}

	// Parse token
	token, err := jwt.ParseWithClaims(tokenString, &UserContextClaims{}, func(token *jwt.Token) (interface{}, error) {
		kid := token.Header["kid"].(string)
		return ts.publicKeys[kid], nil
	})

	if err != nil {
		t.Fatalf("Failed to parse token: %v", err)
	}

	claims := token.Claims.(*UserContextClaims)

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
	_, err = jwt.ParseWithClaims(tokenString, &UserContextClaims{}, func(token *jwt.Token) (interface{}, error) {
		kid := token.Header["kid"].(string)
		return ts.publicKeys[kid], nil
	})

	if err == nil {
		t.Error("Expected error for expired user token")
	}
}

// TestUserTokenClaims tests all user token claims
func TestUserTokenClaims(t *testing.T) {
	ts, err := NewTokenServiceFromDirectory(testDataDir, "test-key-1", 3600)
	if err != nil {
		t.Fatalf("Failed to create token service: %v", err)
	}

	userEmail := "admin@example.com"
	microappID := "banking-app"
	scopes := "admin:read admin:write"

	tokenString, err := ts.GenerateUserToken(userEmail, microappID, scopes)
	if err != nil {
		t.Fatalf("Failed to generate user token: %v", err)
	}

	token, err := jwt.ParseWithClaims(tokenString, &UserContextClaims{}, func(token *jwt.Token) (interface{}, error) {
		kid := token.Header["kid"].(string)
		return ts.publicKeys[kid], nil
	})

	if err != nil {
		t.Fatalf("Failed to parse token: %v", err)
	}

	claims := token.Claims.(*UserContextClaims)

	// Verify all claims
	tests := []struct {
		name     string
		expected interface{}
		actual   interface{}
	}{
		{"Subject (UserEmail)", userEmail, claims.Subject},
		{"MicroappID", microappID, claims.MicroappID},
		{"Audience", microappID, claims.Audience[0]},
		{"Scopes", scopes, claims.Scopes},
		{"Issuer", Issuer, claims.Issuer},
	}

	for _, tt := range tests {
		if tt.expected != tt.actual {
			t.Errorf("%s: expected %v, got %v", tt.name, tt.expected, tt.actual)
		}
	}

	// Verify time claims are set
	if claims.IssuedAt == nil {
		t.Error("IssuedAt is nil")
	}

	if claims.ExpiresAt == nil {
		t.Error("ExpiresAt is nil")
	}

	if claims.NotBefore == nil {
		t.Error("NotBefore is nil")
	}
}
