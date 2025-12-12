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

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

// TestOAuthHandler_GenerateUserToken_Success tests successful user token generation
func TestOAuthHandler_GenerateUserToken_Success(t *testing.T) {
	db := setupTestDB(t)
	tokenService := setupTestTokenService(t)

	handler := NewOAuthHandler(db, tokenService)

	form := url.Values{}
	form.Set("grant_type", "user_context")
	form.Set("user_email", "test@example.com")
	form.Set("microapp_id", "test-microapp")
	form.Set("scope", "read write")

	req := httptest.NewRequest(http.MethodPost, "/oauth/token/user", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	w := httptest.NewRecorder()
	handler.GenerateUserToken(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}

	var resp TokenResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	if err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if resp.AccessToken == "" {
		t.Error("Access token is empty")
	}

	if resp.TokenType != "Bearer" {
		t.Errorf("Expected token type Bearer, got %s", resp.TokenType)
	}

	if resp.ExpiresIn <= 0 {
		t.Errorf("Expected positive expires_in, got %d", resp.ExpiresIn)
	}
}

// TestOAuthHandler_GenerateUserToken_InvalidGrant tests invalid grant type
func TestOAuthHandler_GenerateUserToken_InvalidGrant(t *testing.T) {
	db := setupTestDB(t)
	tokenService := setupTestTokenService(t)

	handler := NewOAuthHandler(db, tokenService)

	form := url.Values{}
	form.Set("grant_type", "password") // Invalid grant
	form.Set("user_email", "test@example.com")
	form.Set("microapp_id", "test-microapp")

	req := httptest.NewRequest(http.MethodPost, "/oauth/token/user", strings.NewReader(form.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	w := httptest.NewRecorder()
	handler.GenerateUserToken(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d. Body: %s", w.Code, w.Body.String())
	}

	var errResp map[string]string
	json.Unmarshal(w.Body.Bytes(), &errResp)

	if errResp["error"] != "unsupported_grant_type" {
		t.Errorf("Expected error 'unsupported_grant_type', got %s", errResp["error"])
	}
}

// TestOAuthHandler_GenerateUserToken_MissingFields tests missing required fields
func TestOAuthHandler_GenerateUserToken_MissingFields(t *testing.T) {
	db := setupTestDB(t)
	tokenService := setupTestTokenService(t)

	handler := NewOAuthHandler(db, tokenService)

	tests := []struct {
		name       string
		userEmail  string
		microappID string
	}{
		{"Missing UserEmail", "", "test-microapp"},
		{"Missing MicroappID", "test@example.com", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			form := url.Values{}
			form.Set("grant_type", "user_context")
			form.Set("user_email", tt.userEmail)
			form.Set("microapp_id", tt.microappID)

			req := httptest.NewRequest(http.MethodPost, "/oauth/token/user", strings.NewReader(form.Encode()))
			req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

			w := httptest.NewRecorder()
			handler.GenerateUserToken(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("Expected status 400, got %d. Body: %s", w.Code, w.Body.String())
			}

			var errResp map[string]string
			json.Unmarshal(w.Body.Bytes(), &errResp)

			if errResp["error"] != "invalid_request" {
				t.Errorf("Expected error 'invalid_request', got %s", errResp["error"])
			}
		})
	}
}
