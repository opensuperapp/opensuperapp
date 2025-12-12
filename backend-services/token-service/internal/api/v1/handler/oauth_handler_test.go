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
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/opensuperapp/opensuperapp/backend-services/token-service/internal/models"
	"github.com/opensuperapp/opensuperapp/backend-services/token-service/internal/services"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDB creates an in-memory SQLite database for testing
func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}

	// Auto-migrate models
	err = db.AutoMigrate(&models.OAuth2Client{})
	if err != nil {
		t.Fatalf("Failed to migrate database: %v", err)
	}

	return db
}

// seedTestClient creates a test OAuth2 client
func seedTestClient(t *testing.T, db *gorm.DB) *models.OAuth2Client {
	// Hash the secret using bcrypt (same as in handler)
	secret := "test-secret"
	hash, err := bcrypt.GenerateFromPassword([]byte(secret), 12)
	if err != nil {
		t.Fatalf("Failed to hash secret: %v", err)
	}
	hashedSecret := string(hash)

	client := &models.OAuth2Client{
		ClientID:     "test-client",
		ClientSecret: hashedSecret,
		Name:         "Test Client",
		Scopes:       "read write",
		IsActive:     true,
	}

	result := db.Create(client)
	if result.Error != nil {
		t.Fatalf("Failed to seed test client: %v", result.Error)
	}

	return client
}

// setupTestTokenService creates a test token service
func setupTestTokenService(t *testing.T) *services.TokenService {
	ts, err := services.NewTokenServiceFromDirectory("../../../services/testdata", "test-key-1", 3600)
	if err != nil {
		t.Fatalf("Failed to create test token service: %v", err)
	}
	return ts
}

// TestOAuthHandler_Token_JSON tests token endpoint with JSON body
func TestOAuthHandler_Token_JSON(t *testing.T) {
	db := setupTestDB(t)
	seedTestClient(t, db)
	tokenService := setupTestTokenService(t)

	handler := NewOAuthHandler(db, tokenService)

	reqBody := TokenRequest{
		GrantType:    "client_credentials",
		ClientID:     "test-client",
		ClientSecret: "test-secret",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/oauth/token", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	handler.Token(w, req)

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

	if resp.ExpiresIn != 3600 {
		t.Errorf("Expected expires_in 3600, got %d", resp.ExpiresIn)
	}
}

// TestOAuthHandler_Token_Form tests token endpoint with form data
func TestOAuthHandler_Token_Form(t *testing.T) {
	db := setupTestDB(t)
	seedTestClient(t, db)
	tokenService := setupTestTokenService(t)

	handler := NewOAuthHandler(db, tokenService)

	formData := url.Values{}
	formData.Set("grant_type", "client_credentials")
	formData.Set("client_id", "test-client")
	formData.Set("client_secret", "test-secret")

	req := httptest.NewRequest(http.MethodPost, "/oauth/token", strings.NewReader(formData.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	w := httptest.NewRecorder()
	handler.Token(w, req)

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
}

// TestOAuthHandler_Token_BasicAuth tests token endpoint with Basic Auth
func TestOAuthHandler_Token_BasicAuth(t *testing.T) {
	db := setupTestDB(t)
	seedTestClient(t, db)
	tokenService := setupTestTokenService(t)

	handler := NewOAuthHandler(db, tokenService)

	formData := url.Values{}
	formData.Set("grant_type", "client_credentials")

	req := httptest.NewRequest(http.MethodPost, "/oauth/token", strings.NewReader(formData.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth("test-client", "test-secret")

	w := httptest.NewRecorder()
	handler.Token(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d. Body: %s", w.Code, w.Body.String())
	}
}

// TestOAuthHandler_Token_InvalidGrant tests invalid grant type
func TestOAuthHandler_Token_InvalidGrant(t *testing.T) {
	db := setupTestDB(t)
	tokenService := setupTestTokenService(t)

	handler := NewOAuthHandler(db, tokenService)

	reqBody := TokenRequest{
		GrantType:    "password",
		ClientID:     "test-client",
		ClientSecret: "test-secret",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/oauth/token", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	handler.Token(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}

	var errResp map[string]string
	json.Unmarshal(w.Body.Bytes(), &errResp)

	if errResp["error"] != "unsupported_grant_type" {
		t.Errorf("Expected error unsupported_grant_type, got %s", errResp["error"])
	}
}

// TestOAuthHandler_Token_InvalidClient tests invalid client credentials
func TestOAuthHandler_Token_InvalidClient(t *testing.T) {
	db := setupTestDB(t)
	seedTestClient(t, db)
	tokenService := setupTestTokenService(t)

	handler := NewOAuthHandler(db, tokenService)

	reqBody := TokenRequest{
		GrantType:    "client_credentials",
		ClientID:     "test-client",
		ClientSecret: "wrong-secret",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/oauth/token", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	handler.Token(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401, got %d", w.Code)
	}

	var errResp map[string]string
	json.Unmarshal(w.Body.Bytes(), &errResp)

	if errResp["error"] != "invalid_client" {
		t.Errorf("Expected error invalid_client, got %s", errResp["error"])
	}
}

// TestOAuthHandler_Token_InactiveClient tests inactive client
func TestOAuthHandler_Token_InactiveClient(t *testing.T) {
	db := setupTestDB(t)
	client := seedTestClient(t, db)

	// Deactivate client
	client.IsActive = false
	db.Save(client)

	tokenService := setupTestTokenService(t)
	handler := NewOAuthHandler(db, tokenService)

	reqBody := TokenRequest{
		GrantType:    "client_credentials",
		ClientID:     "test-client",
		ClientSecret: "test-secret",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/oauth/token", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	handler.Token(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status 401, got %d", w.Code)
	}
}

// TestOAuthHandler_Token_MissingCredentials tests missing credentials
func TestOAuthHandler_Token_MissingCredentials(t *testing.T) {
	db := setupTestDB(t)
	tokenService := setupTestTokenService(t)

	handler := NewOAuthHandler(db, tokenService)

	reqBody := TokenRequest{
		GrantType: "client_credentials",
		// Missing ClientID and ClientSecret
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/oauth/token", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	handler.Token(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d", w.Code)
	}
}

// TestOAuthHandler_CreateClient_Success tests successful client creation
func TestOAuthHandler_CreateClient_Success(t *testing.T) {
	db := setupTestDB(t)
	tokenService := setupTestTokenService(t)

	handler := NewOAuthHandler(db, tokenService)

	reqBody := CreateClientRequest{
		ClientID: "new-client",
		Name:     "New Test Client",
		Scopes:   "read write admin",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/oauth/clients", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	handler.CreateClient(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status 201, got %d. Body: %s", w.Code, w.Body.String())
	}

	var resp CreateClientResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	if err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if resp.ClientID != "new-client" {
		t.Errorf("Expected client_id 'new-client', got %s", resp.ClientID)
	}

	if resp.Name != "New Test Client" {
		t.Errorf("Expected name 'New Test Client', got %s", resp.Name)
	}

	if resp.Scopes != "read write admin" {
		t.Errorf("Expected scopes 'read write admin', got %s", resp.Scopes)
	}

	if resp.ClientSecret == "" {
		t.Error("Client secret is empty")
	}

	if !resp.IsActive {
		t.Error("Expected client to be active")
	}

	// Verify the client was actually created in the database
	var dbClient models.OAuth2Client
	if err := db.Where("client_id = ?", "new-client").First(&dbClient).Error; err != nil {
		t.Errorf("Failed to find created client in database: %v", err)
	}

	// Verify the secret is hashed in the database
	if dbClient.ClientSecret == resp.ClientSecret {
		t.Error("Client secret should be hashed in database, but it's stored in plain text")
	}
}

// TestOAuthHandler_CreateClient_DuplicateClientID tests creating a client with duplicate client_id
func TestOAuthHandler_CreateClient_DuplicateClientID(t *testing.T) {
	db := setupTestDB(t)
	seedTestClient(t, db) // Creates "test-client"
	tokenService := setupTestTokenService(t)

	handler := NewOAuthHandler(db, tokenService)

	reqBody := CreateClientRequest{
		ClientID: "test-client", // Duplicate
		Name:     "Duplicate Client",
		Scopes:   "read",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/oauth/clients", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	handler.CreateClient(w, req)

	if w.Code != http.StatusConflict {
		t.Errorf("Expected status 409, got %d. Body: %s", w.Code, w.Body.String())
	}

	var errResp map[string]string
	json.Unmarshal(w.Body.Bytes(), &errResp)

	if errResp["error"] != "invalid_request" {
		t.Errorf("Expected error 'invalid_request', got %s", errResp["error"])
	}

	if !strings.Contains(errResp["error_description"], "already exists") {
		t.Errorf("Expected error description to mention 'already exists', got %s", errResp["error_description"])
	}
}

// TestOAuthHandler_CreateClient_MissingClientID tests creating a client without client_id
func TestOAuthHandler_CreateClient_MissingClientID(t *testing.T) {
	db := setupTestDB(t)
	tokenService := setupTestTokenService(t)

	handler := NewOAuthHandler(db, tokenService)

	reqBody := CreateClientRequest{
		Name:   "Test Client",
		Scopes: "read",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/oauth/clients", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	handler.CreateClient(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d. Body: %s", w.Code, w.Body.String())
	}

	var errResp map[string]string
	json.Unmarshal(w.Body.Bytes(), &errResp)

	if !strings.Contains(errResp["error_description"], "client_id is required") {
		t.Errorf("Expected error description to mention 'client_id is required', got %s", errResp["error_description"])
	}
}

// TestOAuthHandler_CreateClient_MissingName tests creating a client without name
func TestOAuthHandler_CreateClient_MissingName(t *testing.T) {
	db := setupTestDB(t)
	tokenService := setupTestTokenService(t)

	handler := NewOAuthHandler(db, tokenService)

	reqBody := CreateClientRequest{
		ClientID: "test-client-2",
		Scopes:   "read",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/oauth/clients", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	handler.CreateClient(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status 400, got %d. Body: %s", w.Code, w.Body.String())
	}

	var errResp map[string]string
	json.Unmarshal(w.Body.Bytes(), &errResp)

	if !strings.Contains(errResp["error_description"], "name is required") {
		t.Errorf("Expected error description to mention 'name is required', got %s", errResp["error_description"])
	}
}
