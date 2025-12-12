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
	"log/slog"
	"net/http"
)

// UserTokenRequest represents a request for a user-context token
type UserTokenRequest struct {
	GrantType  string `json:"grant_type"`
	UserEmail  string `json:"user_email"`
	MicroappID string `json:"microapp_id"`
	Scope      string `json:"scope,omitempty"`
}

// GenerateUserToken generates a microapp-scoped token with user context
// This is called by the core service when exchanging user tokens
func (h *OAuthHandler) GenerateUserToken(w http.ResponseWriter, r *http.Request) {
	limitRequestBody(w, r, 0)

	if err := r.ParseForm(); err != nil {
		writeError(w, http.StatusBadRequest, errInvalidRequest, "invalid form data")
		return
	}

	grantType := r.FormValue("grant_type")
	userEmail := r.FormValue("user_email")
	microappID := r.FormValue("microapp_id")
	scope := r.FormValue("scope")

	if grantType != grantTypeUserContext {
		writeError(w, http.StatusBadRequest, errUnsupportedGrant, "")
		return
	}

	if userEmail == "" || microappID == "" {
		writeError(w, http.StatusBadRequest, errInvalidRequest, "user_email and microapp_id are required")
		return
	}

	token, err := h.tokenService.GenerateUserToken(userEmail, microappID, scope)
	if err != nil {
		slog.Error("Failed to generate user token", "error", err, "microapp", microappID)
		writeError(w, http.StatusInternalServerError, errServerError, "")
		return
	}

	slog.Info("User token generated", "microapp", microappID)

	resp := TokenResponse{
		AccessToken: token,
		TokenType:   tokenTypeBearer,
		ExpiresIn:   h.tokenService.GetExpiry(),
	}
	writeJSON(w, http.StatusOK, resp)
}
