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
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"net/url"
	"time"

	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/api/v1/dto"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/auth"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/config"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/models"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/services"

	"gorm.io/gorm"
)

const (
	defaultHTTPTimeout   = 10 * time.Second
	IdPResponseBodyLimit = 1 << 20 // 1MB

	// HTTP Headers and Content Types
	headerContentType  = "Content-Type"
	headerCacheControl = "Cache-Control"
	contentTypeJSON    = "application/json"
	contentTypeForm    = "application/x-www-form-urlencoded"
	cacheControlPublic = "public, max-age=3600"

	// Token Types
	tokenTypeBearer = "Bearer"

	// OAuth Parameters
	grantTypeUserContext = "user_context"
	paramGrantType       = "grant_type"
	paramUserEmail       = "user_email"
	paramMicroappID      = "microapp_id"
	paramScope           = "scope"
)

type TokenHandler struct {
	db                    *gorm.DB
	cfg                   *config.Config
	httpClient            *http.Client
	serviceTokenValidator services.TokenValidator
}

func NewTokenHandler(db *gorm.DB, cfg *config.Config, serviceTokenValidator services.TokenValidator) *TokenHandler {
	return &TokenHandler{
		db:                    db,
		cfg:                   cfg,
		httpClient:            &http.Client{Timeout: defaultHTTPTimeout},
		serviceTokenValidator: serviceTokenValidator,
	}
}

// ExchangeToken exchanges a user token (from Asgardeo) for a microapp-scoped token (from internal IDP)
// This allows microapp frontends to get tokens for calling microapp backends
func (h *TokenHandler) ExchangeToken(w http.ResponseWriter, r *http.Request) {
	if !validateContentType(w, r) {
		return
	}
	limitRequestBody(w, r, 0)
	// 1. Get user info from context (already validated by AuthMiddleware against Asgardeo)
	userInfo, ok := auth.GetUserInfo(r.Context())
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// 2. Parse request
	var req dto.TokenExchangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validate request
	if req.MicroappID == "" {
		http.Error(w, "microapp_id is required", http.StatusBadRequest)
		return
	}

	// Validate that the microapp exists and is active
	var microapp models.MicroApp
	if err := h.db.WithContext(r.Context()).
		Where("micro_app_id = ? AND active = ?", req.MicroappID, models.StatusActive).
		First(&microapp).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			slog.Warn("Microapp not found or inactive", "microappID", req.MicroappID, "user", userInfo.Email)
			http.Error(w, "microapp not found or inactive", http.StatusNotFound)
		} else {
			slog.Error("Failed to validate microapp", "error", err, "microappID", req.MicroappID)
			http.Error(w, "failed to validate microapp", http.StatusInternalServerError)
		}
		return
	}

	// 3. Call internal IDP to generate microapp-scoped token
	token, expiresIn, err := h.requestMicroappToken(r.Context(), userInfo.Email, req.MicroappID, req.Scope)
	if err != nil {
		slog.Error("Failed to exchange token", "error", err, "user", userInfo.Email, "microapp", req.MicroappID)
		http.Error(w, "failed to exchange token", http.StatusInternalServerError)
		return
	}

	// 4. Return new token
	response := dto.TokenExchangeResponse{
		AccessToken: token,
		TokenType:   tokenTypeBearer,
		ExpiresIn:   expiresIn,
	}

	slog.Info("Token exchanged successfully", "user", userInfo.Email, "microapp", req.MicroappID)
	writeJSON(w, http.StatusOK, response)
}

// ProxyOAuthToken proxies OAuth token requests to the internal IDP
// This allows microapp backends to get service tokens without exposing the IDP
// Supports: Basic Auth header, form data with credentials, JSON body
func (h *TokenHandler) ProxyOAuthToken(w http.ResponseWriter, r *http.Request) {
	limitRequestBody(w, r, 0)

	var clientID, clientSecret, grantType string
	var forwardBody string

	contentType := r.Header.Get(headerContentType)
	mediaType, _, _ := mime.ParseMediaType(contentType)

	// Check for Basic Auth header first (recommended OAuth2 method)
	basicUser, basicPass, hasBasicAuth := r.BasicAuth()

	if hasBasicAuth {
		// Basic Auth provided - extract credentials from header
		clientID = basicUser
		clientSecret = basicPass

		// Parse form to get all parameters
		if err := r.ParseForm(); err != nil {
			http.Error(w, "invalid form data", http.StatusBadRequest)
			return
		}
		grantType = r.FormValue(paramGrantType)

		// Forward all original params + inject credentials (preserve scope, refresh_token, audience, etc.)
		formData := r.Form
		formData.Set(paramGrantType, grantType)
		formData.Set("client_id", clientID)
		formData.Set("client_secret", clientSecret)
		forwardBody = formData.Encode()

	} else if mediaType == contentTypeJSON {
		// JSON body - parse as map to preserve all fields
		var reqBody map[string]any
		if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}

		// Extract required fields
		if v, ok := reqBody["client_id"].(string); ok {
			clientID = v
		}
		if v, ok := reqBody["client_secret"].(string); ok {
			clientSecret = v
		}
		if v, ok := reqBody["grant_type"].(string); ok {
			grantType = v
		}

		// Build form body for forwarding (token service accepts form data)
		// Preserve all fields including scope, refresh_token, audience, etc.
		formData := url.Values{}
		for k, v := range reqBody {
			vs, ok := v.(string)
			if !ok || vs == "" {
				continue
			}
			formData.Set(k, vs)
		}
		forwardBody = formData.Encode()

	} else {
		// Form data with credentials in body
		if err := r.ParseForm(); err != nil {
			http.Error(w, "invalid form data", http.StatusBadRequest)
			return
		}
		grantType = r.FormValue(paramGrantType)
		clientID = r.FormValue("client_id")
		clientSecret = r.FormValue("client_secret")
		forwardBody = r.Form.Encode()
	}

	// Validate required fields
	if grantType == "" {
		http.Error(w, "grant_type is required", http.StatusBadRequest)
		return
	}
	if clientID == "" || clientSecret == "" {
		http.Error(w, "client_id and client_secret are required", http.StatusBadRequest)
		return
	}

	// Forward the request to internal IDP
	idpURL := fmt.Sprintf("%s/oauth/token", h.cfg.InternalIdPBaseURL)

	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, idpURL, bytes.NewBufferString(forwardBody))
	if err != nil {
		slog.Error("Failed to create IDP request", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	req.Header.Set(headerContentType, contentTypeForm)

	// Call internal IDP
	resp, err := h.httpClient.Do(req)
	if err != nil {
		slog.Error("Failed to call IDP", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Read response
	limitedBody := io.LimitReader(resp.Body, IdPResponseBodyLimit)
	body, err := io.ReadAll(limitedBody)
	if err != nil {
		slog.Error("Failed to read IDP response", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Forward the response
	w.Header().Set(headerContentType, contentTypeJSON)
	w.WriteHeader(resp.StatusCode)
	w.Write(body)

	if resp.StatusCode == http.StatusOK {
		slog.Info("OAuth token proxied successfully", "client_id", clientID)
	} else {
		slog.Warn("OAuth token request failed", "client_id", clientID, "status", resp.StatusCode)
	}
}

// GetJWKS returns the cached JWKS for microapp token validation
func (h *TokenHandler) GetJWKS(w http.ResponseWriter, r *http.Request) {
	if h.serviceTokenValidator == nil {
		http.Error(w, "JWKS not available", http.StatusServiceUnavailable)
		return
	}

	jwks, err := h.serviceTokenValidator.GetJWKS()
	if err != nil {
		slog.Error("Failed to get JWKS", "error", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set(headerContentType, contentTypeJSON)
	w.Header().Set(headerCacheControl, cacheControlPublic)
	w.Write(jwks)
}

// requestMicroappToken calls the internal IDP to generate a microapp-scoped token
func (h *TokenHandler) requestMicroappToken(ctx context.Context, userEmail, microappID, scope string) (string, int, error) {
	// Prepare request to internal IDP
	idpURL := fmt.Sprintf("%s/oauth/token/user", h.cfg.InternalIdPBaseURL)

	data := url.Values{}
	data.Set(paramGrantType, grantTypeUserContext)
	data.Set(paramUserEmail, userEmail)
	data.Set(paramMicroappID, microappID)
	if scope != "" {
		data.Set(paramScope, scope)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", idpURL, bytes.NewBufferString(data.Encode()))
	if err != nil {
		return "", 0, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set(headerContentType, contentTypeForm)

	// Call internal IDP
	resp, err := h.httpClient.Do(req)
	if err != nil {
		return "", 0, fmt.Errorf("failed to call IDP: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		limitedBody := io.LimitReader(resp.Body, IdPResponseBodyLimit)
		body, _ := io.ReadAll(limitedBody)
		return "", 0, fmt.Errorf("IDP returned status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var tokenResp struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		ExpiresIn   int    `json:"expires_in"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", 0, fmt.Errorf("failed to parse IDP response: %w", err)
	}

	return tokenResp.AccessToken, tokenResp.ExpiresIn, nil
}
