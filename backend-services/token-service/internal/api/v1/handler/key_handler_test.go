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
	"testing"
)

// TestKeyHandler_GetJWKS tests JWKS endpoint
func TestKeyHandler_GetJWKS(t *testing.T) {
	tokenService := setupTestTokenService(t)
	handler := NewKeyHandler(tokenService)

	req := httptest.NewRequest(http.MethodGet, "/.well-known/jwks.json", nil)
	w := httptest.NewRecorder()

	handler.GetJWKS(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	contentType := w.Header().Get("Content-Type")
	if contentType != "application/json" {
		t.Errorf("Expected Content-Type application/json, got %s", contentType)
	}

	// Parse JWKS
	var jwks map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &jwks)
	if err != nil {
		t.Fatalf("Failed to parse JWKS: %v", err)
	}

	keys, ok := jwks["keys"].([]interface{})
	if !ok {
		t.Fatal("JWKS keys is not an array")
	}

	// Should have 2 keys (test-key-1 and test-key-2)
	if len(keys) != 2 {
		t.Errorf("Expected 2 keys in JWKS, got %d", len(keys))
	}

	// Verify key structure
	for i, keyInterface := range keys {
		key, ok := keyInterface.(map[string]interface{})
		if !ok {
			t.Fatalf("Key %d is not a map", i)
		}

		requiredFields := []string{"kty", "use", "kid", "n", "e", "alg"}
		for _, field := range requiredFields {
			if _, ok := key[field]; !ok {
				t.Errorf("Key %d missing field %s", i, field)
			}
		}
	}
}
