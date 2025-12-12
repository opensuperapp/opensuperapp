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
	"log/slog"
	"net/http"
	"strings"

	"github.com/opensuperapp/opensuperapp/backend-services/token-service/internal/models"
	"github.com/opensuperapp/opensuperapp/backend-services/token-service/internal/services"

	"gorm.io/gorm"
)

const (
	grantTypeClientCredentials = "client_credentials"
	grantTypeUserContext       = "user_context"
	tokenTypeBearer            = "Bearer"

	// OAuth2 error codes (RFC 6749)
	errInvalidRequest   = "invalid_request"
	errInvalidClient    = "invalid_client"
	errUnsupportedGrant = "unsupported_grant_type"
	errServerError      = "server_error"
)

type OAuthHandler struct {
	db           *gorm.DB
	tokenService *services.TokenService
}

func NewOAuthHandler(db *gorm.DB, tokenService *services.TokenService) *OAuthHandler {
	return &OAuthHandler{
		db:           db,
		tokenService: tokenService,
	}
}

type TokenRequest struct {
	GrantType    string `json:"grant_type"`
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
}

type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

type CreateClientRequest struct {
	ClientID string `json:"client_id"`
	Name     string `json:"name"`
	Scopes   string `json:"scopes"` // Comma-separated scopes
}

type CreateClientResponse struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"` // Plain text secret (only returned once)
	Name         string `json:"name"`
	Scopes       string `json:"scopes"`
	IsActive     bool   `json:"is_active"`
}

// Token handles the OAuth2 token endpoint
func (h *OAuthHandler) Token(w http.ResponseWriter, r *http.Request) {
	limitRequestBody(w, r, 0)

	// Parse request
	// Support both JSON body and Form data (standard OAuth2 uses form data, but JSON is common in APIs)
	var clientID, clientSecret, grantType string

	contentType := r.Header.Get("Content-Type")
	if strings.Contains(contentType, "application/json") {
		var req TokenRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, errInvalidRequest, "invalid request body")
			return
		}
		clientID = req.ClientID
		clientSecret = req.ClientSecret
		grantType = req.GrantType
	} else {
		// Fallback to Form/Basic Auth
		if err := r.ParseForm(); err != nil {
			writeError(w, http.StatusBadRequest, errInvalidRequest, "invalid form data")
			return
		}
		grantType = r.FormValue("grant_type")

		// Check Basic Auth first
		user, pass, ok := r.BasicAuth()
		if ok {
			clientID = user
			clientSecret = pass
		} else {
			clientID = r.FormValue("client_id")
			clientSecret = r.FormValue("client_secret")
		}
	}

	if grantType != grantTypeClientCredentials {
		writeError(w, http.StatusBadRequest, errUnsupportedGrant, "")
		return
	}

	if clientID == "" || clientSecret == "" {
		writeError(w, http.StatusBadRequest, errInvalidClient, "client_id and client_secret are required")
		return
	}

	// Validate Client
	var OAuth2client models.OAuth2Client
	if err := h.db.Where("client_id = ? AND is_active = ?", clientID, true).First(&OAuth2client).Error; err != nil {
		slog.Warn("Client not found or inactive", "client_id", clientID)
		writeError(w, http.StatusUnauthorized, errInvalidClient, "")
		return
	}

	// Verify Secret using bcrypt (provides constant-time comparison)
	if err := checkSecret(clientSecret, OAuth2client.ClientSecret); err != nil {
		slog.Warn("Invalid client secret", "client_id", clientID)
		writeError(w, http.StatusUnauthorized, errInvalidClient, "")
		return
	}

	// Issue Token
	token, err := h.tokenService.IssueToken(OAuth2client.ClientID, OAuth2client.Scopes)
	if err != nil {
		slog.Error("Failed to issue token", "error", err)
		writeError(w, http.StatusInternalServerError, errServerError, "")
		return
	}

	// Respond
	resp := TokenResponse{
		AccessToken: token,
		TokenType:   tokenTypeBearer,
		ExpiresIn:   h.tokenService.GetExpiry(),
	}
	writeJSON(w, http.StatusOK, resp)
}

// CreateClient handles the creation of new OAuth2 clients
func (h *OAuthHandler) CreateClient(w http.ResponseWriter, r *http.Request) {
	limitRequestBody(w, r, 0)

	var req CreateClientRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, errInvalidRequest, "invalid request body")
		return
	}

	// Validate required fields
	if req.ClientID == "" {
		writeError(w, http.StatusBadRequest, errInvalidRequest, "client_id is required")
		return
	}
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, errInvalidRequest, "name is required")
		return
	}

	// Check if client already exists
	var existingClient models.OAuth2Client
	if err := h.db.Where("client_id = ?", req.ClientID).First(&existingClient).Error; err == nil {
		writeError(w, http.StatusConflict, errInvalidRequest, "client_id already exists")
		return
	}

	// Generate a secure random client secret
	clientSecret, err := generateSecureSecret(32)
	if err != nil {
		slog.Error("Failed to generate client secret", "error", err)
		writeError(w, http.StatusInternalServerError, errServerError, "failed to generate client secret")
		return
	}

	// Hash the secret for storage using bcrypt
	hashedSecret, err := hashSecret(clientSecret)
	if err != nil {
		slog.Error("Failed to hash client secret", "error", err)
		writeError(w, http.StatusInternalServerError, errServerError, "failed to hash client secret")
		return
	}

	// Create the new client
	newClient := models.OAuth2Client{
		ClientID:     req.ClientID,
		ClientSecret: hashedSecret,
		Name:         req.Name,
		Scopes:       req.Scopes,
		IsActive:     true,
	}

	if err := h.db.Create(&newClient).Error; err != nil {
		slog.Error("Failed to create OAuth2 client", "error", err)
		writeError(w, http.StatusInternalServerError, errServerError, "failed to create client")
		return
	}

	slog.Info("OAuth2 client created successfully", "client_id", req.ClientID, "name", req.Name)

	// Return the response with the plain text secret (only time it's visible)
	resp := CreateClientResponse{
		ClientID:     newClient.ClientID,
		ClientSecret: clientSecret, // Return plain text secret
		Name:         newClient.Name,
		Scopes:       newClient.Scopes,
		IsActive:     newClient.IsActive,
	}

	writeJSON(w, http.StatusCreated, resp)
}
