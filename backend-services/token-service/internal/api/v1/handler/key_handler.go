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
	"net/http"

	"github.com/opensuperapp/opensuperapp/backend-services/token-service/internal/services"
)

type KeyHandler struct {
	tokenService *services.TokenService
}

func NewKeyHandler(tokenService *services.TokenService) *KeyHandler {
	return &KeyHandler{
		tokenService: tokenService,
	}
}

// GetJWKS serves the public key in JWKS format
func (h *KeyHandler) GetJWKS(w http.ResponseWriter, r *http.Request) {
	jwksBytes, err := h.tokenService.GetJWKS()
	if err != nil {
		http.Error(w, "Public key not available", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(jwksBytes)
}

// ReloadKeys triggers a reload of the keys from the directory
func (h *KeyHandler) ReloadKeys(w http.ResponseWriter, r *http.Request) {
	if err := h.tokenService.ReloadKeys(); err != nil {
		http.Error(w, "Failed to reload keys: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Keys reloaded successfully"}`))
}

// SetActiveKey updates the active signing key
func (h *KeyHandler) SetActiveKey(w http.ResponseWriter, r *http.Request) {
	keyID := r.URL.Query().Get("key_id")
	if keyID == "" {
		http.Error(w, "key_id parameter is required", http.StatusBadRequest)
		return
	}

	if err := h.tokenService.SetActiveKey(keyID); err != nil {
		http.Error(w, "Failed to set active key: "+err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Active key updated successfully"}`))
}
