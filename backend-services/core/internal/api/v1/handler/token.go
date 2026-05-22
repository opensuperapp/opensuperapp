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

	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/api/v1/dto"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/auth"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/config"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/models"
	"github.com/opensuperapp/opensuperapp/backend-services/core/internal/services"

	"gorm.io/gorm"
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

// ExchangeToken exchanges a user token (from External IdP) for a microapp-scoped token (from internal IDP)
// This allows microapp frontends to get tokens for calling microapp backends
func (h *TokenHandler) ExchangeToken(w http.ResponseWriter, r *http.Request) {
	if !validateContentType(w, r) {
		return
	}
	limitRequestBody(w, r, 0)
	userInfo, ok := auth.GetUserInfo(r.Context())
	if !ok {
		http.Error(w, errUserNotAuthorizedToAccessApp, http.StatusUnauthorized)
		return
	}
	var req dto.TokenExchangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, errInvalidRequestBody, http.StatusBadRequest)
		return
	}
	if req.MicroappID == "" {
		http.Error(w, errMissingMicroAppID, http.StatusBadRequest)
		return
	}
	// Validate that the microapp exists and is active
	var microapp models.MicroApp
	if err := h.db.WithContext(r.Context()).
		Where("micro_app_id = ? AND active = ?", req.MicroappID, models.StatusActive).
		First(&microapp).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			slog.Warn("Microapp not found or inactive", "microappID", req.MicroappID, "user", userInfo.Email)
			http.Error(w, errMicroAppNotFoundOrInactive, http.StatusNotFound)
		} else {
			slog.Error("Failed to validate microapp", "error", err, "microappID", req.MicroappID)
			http.Error(w, errFailedToValidateMicroApp, http.StatusInternalServerError)
		}
		return
	}
	// Call internal IDP to generate microapp-scoped token
	token, expiresIn, err := h.requestMicroappToken(r.Context(), userInfo.Email, req.MicroappID, req.Scope)
	if err != nil {
		slog.Error("Failed to exchange token", "error", err, "user", userInfo.Email, "microapp", req.MicroappID)
		http.Error(w, errServerError, http.StatusInternalServerError)
		return
	}
	// Return new token
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
			http.Error(w, errInvalidFormData, http.StatusBadRequest)
			return
		}
		grantType = r.FormValue(paramGrantType)
		// Forward all original params + inject credentials (preserve scope, refresh_token, audience, etc.)
		formData := r.Form
		formData.Set(paramGrantType, grantType)
		formData.Set(paramClientID, clientID)
		formData.Set(paramClientSecret, clientSecret)
		forwardBody = formData.Encode()

	} else if mediaType == contentTypeJSON {
		// JSON body - parse as map to preserve all fields
		var reqBody map[string]any
		if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
			http.Error(w, errInvalidRequestBody, http.StatusBadRequest)
			return
		}
		// Extract required fields
		if v, ok := reqBody[paramClientID].(string); ok {
			clientID = v
		}
		if v, ok := reqBody[paramClientSecret].(string); ok {
			clientSecret = v
		}
		if v, ok := reqBody[paramGrantType].(string); ok {
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
			http.Error(w, errInvalidFormData, http.StatusBadRequest)
			return
		}
		grantType = r.FormValue(paramGrantType)
		clientID = r.FormValue(paramClientID)
		clientSecret = r.FormValue(paramClientSecret)
		forwardBody = r.Form.Encode()
	}
	// Validate required fields
	if grantType == "" {
		http.Error(w, errUnsupportedGrant, http.StatusBadRequest)
		return
	}
	if clientID == "" || clientSecret == "" {
		http.Error(w, errInvalidRequest, http.StatusBadRequest)
		return
	}
	// Forward the request to internal IDP
	idpURL := fmt.Sprintf("%s/oauth/token", h.cfg.InternalIdPBaseURL)
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, idpURL, bytes.NewBufferString(forwardBody))
	if err != nil {
		slog.Error("Failed to create IDP request", "error", err)
		http.Error(w, errServerError, http.StatusInternalServerError)
		return
	}

	req.Header.Set(headerContentType, contentTypeForm)
	// Call internal IDP
	resp, err := h.httpClient.Do(req)
	if err != nil {
		slog.Error("Failed to call IDP", "error", err)
		http.Error(w, errServerError, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	// Read response
	limitedBody := io.LimitReader(resp.Body, IdPResponseBodyLimit)
	body, err := io.ReadAll(limitedBody)
	if err != nil {
		slog.Error("Failed to read IDP response", "error", err)
		http.Error(w, errServerError, http.StatusInternalServerError)
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
		http.Error(w, errJWKSNotAvailable, http.StatusServiceUnavailable)
		return
	}
	jwks, err := h.serviceTokenValidator.GetJWKS()
	if err != nil {
		slog.Error("Failed to get JWKS", "error", err)
		http.Error(w, errServerError, http.StatusInternalServerError)
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
	req, err := http.NewRequestWithContext(ctx, httpMethodPost, idpURL, bytes.NewBufferString(data.Encode()))
	if err != nil {
		return "", 0, fmt.Errorf("%s: %w", errFailedToCreateRequest, err)
	}
	req.Header.Set(headerContentType, contentTypeForm)

	// Call internal IDP
	resp, err := h.httpClient.Do(req)
	if err != nil {
		return "", 0, fmt.Errorf("%s: %w", errFailedToCallIDP, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		limitedBody := io.LimitReader(resp.Body, IdPResponseBodyLimit)
		body, _ := io.ReadAll(limitedBody)
		return "", 0, fmt.Errorf(errIDPReturnedError, resp.StatusCode, string(body))
	}

	// Parse response
	var tokenResp dto.TokenExchangeResponse

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", 0, fmt.Errorf("%s: %w", errFailedToParseIDPResponse, err)
	}
	return tokenResp.AccessToken, tokenResp.ExpiresIn, nil
}
